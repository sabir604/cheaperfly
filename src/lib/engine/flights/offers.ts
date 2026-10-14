/**
 * Mock flight inventory. Schedules, prices and fares are derived deterministically from seeded RNGs,
 * so a search for the same criteria (on the same "today") always returns identical offers.
 *
 * The order of RNG draws below is load-bearing: reordering any `rng.*` call changes every result.
 */
import { AIRLINES, CABIN_LABEL, CABIN_MULT, PREMIUM_CABIN_TEMPLATES, STYLE_TEMPLATES, UK_GATEWAYS } from "@/data/flights";
import { getAirport, resolveAirportCodes } from "@/lib/engine/airports";
import { addDaysISO, dayDiff, localToUtcMs, parseDate, todayISO, utcMsToLocal } from "@/lib/engine/dates";
import { createRng, hashString, type Rng } from "@/lib/engine/rng";
import type {
  Airline,
  Airport,
  Cabin,
  DatePrice,
  Fare,
  FlightCriteria,
  FlightLeg,
  FlightSearchResult,
  Layover,
  Offer,
  Segment,
} from "@/lib/types/flights";

interface LegOption {
  leg: FlightLeg;
  /** Base price for this leg before day-of-week, cabin and trip adjustments. */
  base: number;
  hour: number;
}

/** Great-circle distance in km. */
function distanceKm(a: Airport, b: Airport): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  return 12742 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2));
}

/** Block time in minutes, rounded to 5: flight time at cruise speed + 34 min taxi ± up to 8 min. */
function blockMinutes(from: Airport, to: Airport, speed: number, next: () => number): number {
  return 5 * Math.round(((distanceKm(from, to) / speed) * 60 + 34 + (next() - 0.5) * 16) / 5);
}

function terminalFor(airline: Airline, airport: Airport, pick: Rng["pick"]): string {
  return airline.terminalPref[airport.iata] ?? pick(airport.terminals);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function servesAirport(airline: Airline, airport: Airport): boolean {
  return airport.countryCode !== "GB" || (UK_GATEWAYS[airline.code] ?? []).includes(airport.iata);
}

/** Leg price before date and cabin factors. Red-eyes are cheaper, morning departures dearer. */
function legBasePrice(airline: Airline, km: number, _stops: number, hour: number, next: () => number): number {
  let price = (34 + 0.0356 * km) * airline.priceFactor * (0.94 + 0.12 * next());
  if (hour < 6 || hour >= 22) price *= 0.94;
  else if (hour >= 7 && hour <= 10) price *= 1.04;
  return price;
}

function makeSegment(
  airline: Airline,
  from: Airport,
  to: Airport,
  departLocal: string,
  durationMin: number,
  cabin: Cabin,
  rng: Rng,
  idSuffix: string,
  km: number,
): Segment {
  const arriveLocal = utcMsToLocal(localToUtcMs(departLocal, from.tz) + 6e4 * durationMin, to.tz);
  const aircraft = rng.pick(km > 3500 ? airline.aircraftLong : airline.aircraftShort);
  const number = rng.int(airline.flightNo[0], airline.flightNo[1]);
  return {
    id: `${airline.code}${number}-${departLocal.replace(/[-:T]/g, "")}-${idSuffix}`,
    flightNumber: `${airline.code} ${number}`,
    airlineCode: airline.code,
    airlineName: airline.name,
    aircraft,
    from: from.iata,
    to: to.iata,
    fromCity: from.city,
    toCity: to.city,
    fromName: from.name,
    toName: to.name,
    departLocal,
    arriveLocal,
    durationMin,
    terminalFrom: terminalFor(airline, from, rng.pick),
    terminalTo: terminalFor(airline, to, rng.pick),
    cabin,
  };
}

function makeLeg(segments: Segment[], layovers: Layover[]): FlightLeg {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const departUtc = localToUtcMs(first.departLocal, getAirport(first.from)!.tz);
  const arriveUtc = localToUtcMs(last.arriveLocal, getAirport(last.to)!.tz);
  return {
    id: `${first.id}>${last.id}`,
    from: first.from,
    to: last.to,
    fromCity: first.fromCity,
    toCity: last.toCity,
    departLocal: first.departLocal,
    arriveLocal: last.arriveLocal,
    durationMin: Math.round((arriveUtc - departUtc) / 6e4),
    stops: segments.length - 1,
    segments,
    layovers,
    arrivalDayOffset: dayDiff(first.departLocal, last.arriveLocal),
  };
}

/** Stable id for a search; also prefixes every offer id (e.g. `i4b5t.EK1`). */
export function searchIdFor(criteria: FlightCriteria): string {
  const key = `${criteria.trip}|${criteria.legs.map((l) => `${l.from}-${l.to}-${l.date}`).join(",")}|${criteria.cabin}`;
  return hashString(key).toString(36);
}

/** Departure time on `date` for a schedule slot, jittered by −20…+25 minutes in 5-minute steps. */
function slotDeparture(slot: string, date: string, rng: Rng): { local: string; minutes: number } {
  const [h, m] = slot.split(":").map(Number);
  const minutes = (((60 * h + m + 5 * rng.int(-4, 5)) % 1440) + 1440) % 1440;
  return { local: `${date}T${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`, minutes };
}

/** All options one airline offers between two airports on a date: direct if it has a hub at either end, else via its best hub. */
function legOptions(airline: Airline, from: Airport, to: Airport, date: string, cabin: Cabin): LegOption[] {
  if (from.iata === to.iata || !servesAirport(airline, from) || !servesAirport(airline, to)) return [];
  const rng = createRng(`sched-${airline.code}-${from.iata}-${to.iata}`);
  const hubAtEnd = airline.hubs.map((h) => getAirport(h)!).find((h) => h.city === from.city || h.city === to.city);
  const km = distanceKm(from, to);
  const out: LegOption[] = [];

  if (hubAtEnd) {
    if (km < 300) return [];
    const count = rng.chance(0.45) ? 3 : 2;
    // Slots are sorted as strings, matching the original.
    rng
      .shuffle(airline.slots)
      .slice(0, Math.min(count, airline.slots.length))
      .sort()
      .forEach((slot, i) => {
        const dep = slotDeparture(slot, date, rng);
        const duration = blockMinutes(from, to, airline.speed, rng.next);
        const leg = makeLeg([makeSegment(airline, from, to, dep.local, duration, cabin, rng, `${from.iata}${to.iata}${i}`, km)], []);
        const hour = Math.floor(dep.minutes / 60);
        out.push({ leg, base: legBasePrice(airline, km, 0, hour, rng.next), hour });
      });
    return out;
  }

  let best: { hub: Airport; detour: number } | null = null;
  for (const code of airline.hubs) {
    const hub = getAirport(code)!;
    if (hub.city === from.city || hub.city === to.city) continue;
    const detour = (distanceKm(from, hub) + distanceKm(hub, to)) / km;
    if (detour <= 1.85 && (!best || detour < best.detour)) best = { hub, detour };
  }
  if (!best) return [];
  const { hub, detour } = best;
  const count = rng.chance(0.5) ? 2 : 1;
  rng
    .shuffle(airline.slots)
    .slice(0, Math.min(count, airline.slots.length))
    .sort()
    .forEach((slot, i) => {
      const dep = slotDeparture(slot, date, rng);
      const firstDuration = blockMinutes(from, hub, airline.speed, rng.next);
      const secondDuration = blockMinutes(hub, to, airline.speed, rng.next);
      const longLayover = rng.chance(0.12);
      const layoverMin = longLayover ? rng.int(300, 540) : rng.int(60, 235);
      const first = makeSegment(airline, from, hub, dep.local, firstDuration, cabin, rng, `${from.iata}${hub.iata}${i}`, distanceKm(from, hub));
      const connectLocal = utcMsToLocal(localToUtcMs(first.arriveLocal, hub.tz) + 6e4 * layoverMin, hub.tz);
      const second = makeSegment(airline, hub, to, connectLocal, secondDuration, cabin, rng, `${hub.iata}${to.iata}${i}`, distanceKm(hub, to));
      const overnight = first.arriveLocal.slice(0, 10) !== second.departLocal.slice(0, 10);
      const leg = makeLeg([first, second], [{ airport: hub.iata, city: hub.city, durationMin: layoverMin, overnight }]);
      const hour = Math.floor(dep.minutes / 60);
      const connectionFactor = 0.8 + (longLayover ? -0.03 : 0.02) + (detour - 1) * 0.06;
      out.push({ leg, base: legBasePrice(airline, km, 1, hour, rng.next) * connectionFactor, hour });
    });
  return out;
}

/** Demand factor for a route on a date: weekends dearer, midweek cheaper, last-minute much dearer. */
function dateFactor(route: string, date: string): number {
  const rng = createRng(`day-${route}-${date}`);
  const weekday = parseDate(date)!.getDay();
  let f = 0.9 + 0.22 * rng.next();
  if (weekday === 5 || weekday === 0) f += 0.06;
  if (weekday === 2 || weekday === 3) f -= 0.04;
  const daysOut = dayDiff(todayISO(), date);
  if (daysOut < 4) f += 0.32;
  else if (daysOut < 8) f += 0.16;
  else if (daysOut < 15) f += 0.07;
  else if (daysOut > 120) f -= 0.05;
  return f;
}

/** Three fare families (Saver / Flex / Flex Plus) from a base price. Tax = £24 per leg + 11% of fare. */
function buildFares(airline: Airline, cabin: Cabin, base: number, legCount: number): Fare[] {
  const templates = cabin === "economy" ? STYLE_TEMPLATES[airline.style] : PREMIUM_CABIN_TEMPLATES[cabin];
  const names =
    cabin === "economy"
      ? airline.fareNames
      : [`${CABIN_LABEL[cabin]} Saver`, `${CABIN_LABEL[cabin]} Flex`, `${CABIN_LABEL[cabin]} Flex Plus`];
  return templates.map((t, i) => {
    const farePerAdult = Math.round(base * t.mult);
    return {
      id: `${airline.code}-${i + 1}`,
      name: names[i],
      tier: i + 1,
      farePerAdult,
      taxPerAdult: Math.round(24 * legCount + 0.11 * farePerAdult),
      cabinBag: t.cabinBag,
      checkedBag: t.checkedBag,
      seatSelection: t.seatSelection,
      changeFee: t.changeFee,
      refundFee: t.refundFee,
      meal: t.meal,
      perks: t.perks,
    };
  });
}

export function generateOffers(criteria: FlightCriteria): Offer[] {
  const { legs, cabin } = criteria;
  const tripFactor = criteria.trip === "return" ? 0.95 : 1;
  const searchId = searchIdFor(criteria);
  const offers: Offer[] = [];

  for (const airline of AIRLINES) {
    const optionsPerLeg = legs.map((searchLeg) => {
      const froms = resolveAirportCodes(searchLeg.from).map(getAirport).filter(Boolean) as Airport[];
      const tos = resolveAirportCodes(searchLeg.to).map(getAirport).filter(Boolean) as Airport[];
      const options: LegOption[] = [];
      for (const from of froms) for (const to of tos) options.push(...legOptions(airline, from, to, searchLeg.date, cabin));
      return options;
    });
    if (optionsPerLeg.some((o) => o.length === 0)) continue;

    const combos = Math.min(4, Math.max(2, Math.max(...optionsPerLeg.map((o) => o.length))));
    const seen = new Set<string>();
    for (let c = 0; c < combos; c++) {
      const chosen: LegOption[] = [];
      optionsPerLeg.forEach((options, legIndex) => {
        let pool = options;
        // A return flies back to the airport the outbound left from, when possible.
        if (criteria.trip === "return" && legIndex === 1) {
          const sameAirport = options.filter((o) => o.leg.to === chosen[0].leg.from);
          if (sameAirport.length) pool = sameAirport;
        }
        chosen.push(pool[(c + legIndex) % pool.length]);
      });
      const key = chosen.map((o) => o.leg.id).join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      let price = 0;
      chosen.forEach((o, i) => {
        price += o.base * dateFactor(`${legs[i].from}-${legs[i].to}`, legs[i].date);
      });
      price = price * tripFactor * CABIN_MULT[cabin];

      const fares = buildFares(airline, cabin, Math.round(price), legs.length);
      const meta = createRng(`meta-${airline.code}-${key}-${criteria.legs[0].date}`);
      const totalDurationMin = chosen.reduce((sum, o) => sum + o.leg.durationMin, 0);
      const totalKm = chosen.reduce((sum, o) => sum + distanceKm(getAirport(o.leg.from)!, getAirport(o.leg.to)!), 0);
      offers.push({
        id: `${searchId}.${airline.code}${offers.length + 1}`,
        airlineCode: airline.code,
        airlineName: airline.name,
        cabin,
        legs: chosen.map((o) => o.leg),
        fares,
        seatsLeft: meta.chance(0.28) ? meta.int(2, 7) : undefined,
        co2Kg: Math.round(0.092 * totalKm + meta.int(-20, 20)),
        refundable: fares.some((f) => f.refundFee !== null),
        checkedBagIncluded: fares[0].checkedBag.pieces > 0,
        totalDurationMin,
      });
    }
  }
  return offers;
}

/** Cheapest Saver total (fare + tax) for the ±3-day price strip. */
function cheapestSaver(offers: Offer[]): { total: number; fare: number; tax: number } | null {
  if (!offers.length) return null;
  const best = offers.reduce((a, b) =>
    a.fares[0].farePerAdult + a.fares[0].taxPerAdult <= b.fares[0].farePerAdult + b.fares[0].taxPerAdult ? a : b,
  ).fares[0];
  return { total: best.farePerAdult + best.taxPerAdult, fare: best.farePerAdult, tax: best.taxPerAdult };
}

/** Prices for the same trip shifted −3…+3 days (keeping trip length), skipping past dates. */
function datePriceStrip(criteria: FlightCriteria): DatePrice[] {
  if (criteria.trip === "multicity") return [];
  const out: DatePrice[] = [];
  const today = todayISO();
  const outbound = criteria.legs[0];
  const inbound = criteria.trip === "return" ? criteria.legs[1] : undefined;
  const stay = inbound ? dayDiff(outbound.date, inbound.date) : 0;
  for (let shift = -3; shift <= 3; shift++) {
    const date = addDaysISO(outbound.date, shift);
    if (date < today) continue;
    const legs = criteria.legs.map((l, i) => (i === 0 ? { ...l, date } : { ...l, date: addDaysISO(date, stay) }));
    const best = cheapestSaver(generateOffers({ ...criteria, legs }));
    out.push({
      date,
      returnDate: inbound ? addDaysISO(date, stay) : undefined,
      price: best?.total ?? null,
      fare: best?.fare,
      tax: best?.tax,
    });
  }
  return out;
}

export function generateSearch(criteria: FlightCriteria): FlightSearchResult {
  return {
    searchId: searchIdFor(criteria),
    criteria,
    offers: generateOffers(criteria),
    datePrices: datePriceStrip(criteria),
    generatedAt: new Date().toISOString(),
  };
}

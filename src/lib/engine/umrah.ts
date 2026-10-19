import {
  UMRAH_PACKAGE_DEFS,
  UMRAH_ROOM_DELTA,
  getUmrahExtra,
  getUmrahFlight,
  getUmrahHotel,
  getUmrahTransfer,
} from "@/data/umrah";
import { addDaysISO, parseDate, todayISO } from "@/lib/engine/dates";
import { umrahAdultPackagePrice } from "@/lib/engine/pricing";
import { createRng } from "@/lib/engine/rng";
import { apiRequest } from "@/lib/api/client";
import type { ServiceOptions } from "@/lib/engine/service";
import type { UmrahConfiguration,UmrahQuote,UmrahDocuments } from "@cheaperfly/api-contracts/umrah";
import type { CurrencyCode } from "@/lib/engine/currency";
import type {
  UmrahConfig,
  UmrahDeparture,
  UmrahExtra,
  UmrahItineraryDay,
  UmrahPackage,
  UmrahPackageDef,
  UmrahPricingInput,
  UmrahRoomType,
  UmrahSearchCriteria,
} from "@/lib/types/umrah";

/** Fixed Ramadan 2027 departures for the "last ten nights" package, from 3 days out. */
function ramadanDepartures(today: string): UmrahDeparture[] {
  return ["2027-02-26", "2027-02-27", "2027-03-01", "2027-03-02"]
    .filter((d) => d >= addDaysISO(today, 3))
    .map((date, i) => ({ date, seatsLeft: 6 + 3 * i, priceFactor: 1.28 + 0.05 * i, label: "Last 10 nights of Ramadan" }));
}

/**
 * Rolling departures: the first `startDays` from today, then every `gap` + 0–2 days.
 * School holidays (18 Dec – 4 Jan) and Ramadan 2027 raise the price factor.
 */
function rollingDepartures(slug: string, count: number, startDays: number, gap: number): UmrahDeparture[] {
  const rng = createRng(`dep-${slug}`);
  const out: UmrahDeparture[] = [];
  let date = addDaysISO(todayISO(), startDays);
  for (let i = 0; i < count; i++) {
    const d = parseDate(date)!;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    let factor = 0.96 + rng.between(0, 0.08);
    let label: string | undefined;
    if ((month === 12 && day >= 18) || (month === 1 && day <= 4)) {
      factor += 0.28;
      label = "School holidays";
    }
    if (date >= "2027-02-08" && date <= "2027-03-09") {
      factor += 0.32;
      label = "Ramadan";
    }
    if (date >= "2027-02-27" && date <= "2027-03-09") {
      factor += 0.22;
      label = "Last 10 nights of Ramadan";
    }
    out.push({ date, seatsLeft: rng.int(3, 28), priceFactor: Math.round(100 * factor) / 100, label });
    date = addDaysISO(date, gap + rng.int(0, 2));
  }
  return out;
}

/** Day-by-day plan: fly out, arrive + first city, days of worship, transfer, second city, fly home. */
function buildItinerary(makkahNights: number, madinahNights: number, makkahFirst = true): UmrahItineraryDay[] {
  const days: UmrahItineraryDay[] = [];
  let day = 1;
  days.push({
    day: day++,
    title: "Depart the UK for Saudi Arabia",
    location: "Departure",
    summary: "Check in for your flight and travel in ihram or change on board.",
    items: [
      "Airport check-in with our pre-departure checklist and WhatsApp support",
      "Make niyyah for Umrah before the Miqat as announced by the crew",
      "Overnight or daytime flight to Jeddah (King Abdulaziz International Airport)",
    ],
    meals: "In-flight meals",
  });
  const first = makkahFirst ? "Makkah" : "Madinah";
  const second = makkahFirst ? "Madinah" : "Makkah";
  const firstNights = makkahFirst ? makkahNights : madinahNights;
  const secondNights = makkahFirst ? madinahNights : makkahNights;
  days.push({
    day: day++,
    title: `Arrive in Jeddah and transfer to ${first}`,
    location: "Jeddah",
    summary: `Meet your representative at arrivals, clear Umrah visa checks and transfer to ${first}.`,
    items: [
      "Fast-track assistance at Jeddah arrivals",
      `Transfer to your ${first} hotel (about 90 minutes)`,
      first === "Makkah"
        ? "Check in and rest, then perform Umrah: Tawaf, two rak'ahs behind Maqam Ibrahim, Sa'i between Safa and Marwa, and Halq/Taqsir"
        : "Check in, rest and pray at Al-Masjid an-Nabawi",
    ],
    meals: "Dinner",
  });
  const worshipDays = (nights: number, city: string) => {
    for (let i = 0; i < nights - 1; i++)
      days.push({
        day: day++,
        title: `${city} — days of worship`,
        location: city,
        summary: i === 0 ? `A flexible day to pray in the ${city === "Makkah" ? "Haram" : "Prophet's Mosque"}.` : "A free day for prayer, reflection and optional visits.",
        items:
          city === "Makkah"
            ? [
                "Fajr and Jumu'ah prayers at Masjid al-Haram",
                "Optional ziyarat (Mina, Arafat, Jabal al-Noor) — bookable as an extra",
                "Repeat Tawaf and Umrah as you wish",
              ]
            : [
                "Visit Rawdah Sharif (permit via the Nusuk app, we assist with booking)",
                "Optional ziyarat (Quba, Qiblatain, Uhud) — bookable as an extra",
                "Visit Jannat al-Baqi' after Fajr",
              ],
        meals: "Breakfast",
      });
  };
  worshipDays(firstNights, first);
  days.push({
    day: day++,
    title: `Transfer from ${first} to ${second}`,
    location: second,
    summary: `Check out after breakfast and travel to ${second}.`,
    items: [
      `Farewell visit to ${first === "Makkah" ? "the Haram (Tawaf al-Wada)" : "the Prophet's Mosque"}`,
      `Coach or Haramain train to ${second}`,
      `Check in and visit ${second === "Madinah" ? "Al-Masjid an-Nabawi and offer salaam at the Rawdah" : "the Haram to perform Umrah"}`,
    ],
    meals: "Breakfast, Dinner",
  });
  worshipDays(secondNights, second);
  days.push({
    day: day++,
    title: "Return flight to the UK",
    location: "Return",
    summary: "Check out, farewell prayers and transfer to the airport.",
    items: [
      `Transfer from ${second} to Madinah airport (MED) or Jeddah (JED) per your flight`,
      "Assistance with check-in and baggage",
      "Return flight home",
    ],
    meals: "Breakfast",
  });
  return days;
}

function buildPackage(def: UmrahPackageDef, today: string): UmrahPackage {
  const departures = def.slug.startsWith("last-ten") ? ramadanDepartures(today) : rollingDepartures(def.slug, def.depCount, def.depStart, def.depGap);
  const makkah = getUmrahHotel(def.makkah)!;
  const madinah = getUmrahHotel(def.madinah)!;
  return {
    id: def.slug,
    slug: def.slug,
    name: def.name,
    tagline: def.tagline,
    category: def.category,
    nights: def.mk + def.md,
    makkahNights: def.mk,
    madinahNights: def.md,
    departureCities: ["London", "Manchester", "Birmingham", ...(def.category === "essential" || def.category === "comfort" ? ["Glasgow", "Edinburgh"] : [])],
    images: def.images,
    makkahHotelId: def.makkah,
    madinahHotelId: def.madinah,
    makkahHotelOptions: def.makkahOptions,
    madinahHotelOptions: def.madinahOptions,
    flightOptionIds: def.flights,
    transferOptionIds: def.transfers,
    defaultTransferId: def.defaultTransfer,
    meal: def.meal,
    mealLabel: def.mealLabel,
    basePerPerson: def.base,
    roomDelta: UMRAH_ROOM_DELTA[def.category],
    highlights: def.highlights,
    inclusions: [
      `Return flights from the UK (economy) with ${def.flights.length > 1 ? "a choice of airlines" : "your chosen airline"}`,
      `${def.mk} nights in ${makkah.name} (Makkah), ${makkah.distanceM} m from the Haram`,
      `${def.md} nights in ${madinah.name} (Madinah), ${madinah.distanceM} m from the Masjid`,
      `Meals: ${def.mealLabel}`,
      "Umrah visa processing and Saudi e-visa fee",
      "Meet & greet and all transfers between airports, hotels and the holy cities",
      "24/7 UK helpline and in-country pilgrim support (WhatsApp)",
      "Pre-departure briefing and printed Umrah guide",
    ],
    exclusions: [
      "Personal expenses, laundry and additional meals",
      "Optional ziyarat tours (available as extras)",
      "Travel insurance (recommended, available as an extra)",
      "Vaccination costs (see important information)",
      "Tips and gratuities",
    ],
    important: [
      "Passports must be valid for at least 6 months from the return date and have 2 blank pages.",
      "A valid ACWY meningitis vaccination certificate is required for Umrah visa applicants (check current Saudi Ministry of Health rules).",
      "Adult women may perform Umrah without a mahram under current Saudi regulations; children under 18 must travel with a parent or guardian.",
      "Visa processing takes 3–5 working days from receiving complete documents. We will contact you within 24 hours of booking.",
      "Rawdah (Madinah) visits require a booking through the Nusuk app; our team will assist but availability is set by the authorities.",
      "Hotel room allocation (Quad/Triple/Double) is guaranteed; specific views and floors are on request and not guaranteed.",
    ],
    itinerary: buildItinerary(def.mk, def.md, def.makkahFirst ?? true),
    departures,
    rating: def.rating,
    reviewCount: def.reviews,
    groupSize: def.group,
    guide: "English, Arabic & Urdu speaking guides",
  };
}

let cache: { key: string; list: UmrahPackage[] } | null = null;

/** All packages with departures relative to today (memoised per day). */
export function getUmrahPackages(): UmrahPackage[] {
  const today = todayISO();
  if (cache?.key === today) return cache.list;
  const list = UMRAH_PACKAGE_DEFS.map((def) => buildPackage(def, today));
  cache = { key: today, list };
  return list;
}

export function getUmrahPackage(slug: string): UmrahPackage | undefined {
  return getUmrahPackages().find((p) => p.slug === slug);
}

/** Starting configuration: cheapest departure, first departure city, quad room, package defaults, 2 adults. */
export function defaultUmrahConfig(pkg: UmrahPackage, overrides?: Partial<UmrahConfig>): UmrahConfig {
  const cheapest = pkg.departures.reduce((a, b) => (b.priceFactor < a.priceFactor ? b : a), pkg.departures[0]);
  if(!cheapest) throw new Error("This package has no available departures.");
  return {
    departureDate:
      overrides?.departureDate && pkg.departures.some((d) => d.date === overrides.departureDate) ? overrides.departureDate : cheapest.date,
    departureCity:
      overrides?.departureCity && pkg.departureCities.includes(overrides.departureCity) ? overrides.departureCity : pkg.departureCities[0],
    roomType: overrides?.roomType ?? "quad",
    makkahHotelId: overrides?.makkahHotelId ?? pkg.makkahHotelId,
    madinahHotelId: overrides?.madinahHotelId ?? pkg.madinahHotelId,
    flightId: overrides?.flightId ?? pkg.flightOptionIds[0],
    transferId: overrides?.transferId ?? pkg.defaultTransferId,
    extraIds: overrides?.extraIds ?? [],
    adults: overrides?.adults ?? 2,
    children: overrides?.children ?? 0,
    infants: overrides?.infants ?? 0,
  };
}

export function resolveUmrahPricingInput(pkg: UmrahPackage, config: UmrahConfig): UmrahPricingInput {
  return {
    pkg,
    config,
    makkahHotel: getUmrahHotel(config.makkahHotelId)!,
    madinahHotel: getUmrahHotel(config.madinahHotelId)!,
    defaultMakkah: getUmrahHotel(pkg.makkahHotelId)!,
    defaultMadinah: getUmrahHotel(pkg.madinahHotelId)!,
    flight: getUmrahFlight(config.flightId) ?? getUmrahFlight(pkg.flightOptionIds[0])!,
    transfer: getUmrahTransfer(config.transferId) ?? getUmrahTransfer(pkg.defaultTransferId)!,
    defaultTransfer: getUmrahTransfer(pkg.defaultTransferId)!,
    extras: config.extraIds.map(getUmrahExtra).filter(Boolean) as UmrahExtra[],
  };
}

/** "From" price per adult for listing cards: cheapest departure, 1 adult, given room type. */
export function packageFromPrice(pkg: UmrahPackage, currency: CurrencyCode, roomType: UmrahRoomType = "quad"): number {
  if(pkg.fromPrices)return pkg.fromPrices[currency][roomType];
  const config = defaultUmrahConfig(pkg, { roomType, adults: 1 });
  return umrahAdultPackagePrice(resolveUmrahPricingInput(pkg, config), currency);
}

async function post<T>(path:string,body:unknown):Promise<T>{return (await apiRequest<T>("public","umrah/"+path,{method:"POST",body:JSON.stringify(body)})).data;}
export const umrahService={
 search:(criteria:UmrahSearchCriteria={},opts?:ServiceOptions)=>post<UmrahPackage[]>("search",{...criteria,...(opts?.scenario&&opts.scenario!=="ok"?{scenario:opts.scenario}:{})}),
 getPackage:async(slug:string)=>(await apiRequest<UmrahPackage>("public","umrah/packages/"+slug)).data,
 configuration:(packageId:string,config:UmrahConfig,currency:CurrencyCode)=>post<UmrahConfiguration>("configurations",{packageId,config,currency}),
 quote:(packageId:string,config:UmrahConfig,currency:CurrencyCode)=>post<UmrahQuote>("quotes",{packageId,config,currency}),
 travellers:(quoteId:string,travellers:import("@/lib/types/booking").UmrahTraveller[],contact:import("@/lib/types/booking").Contact,notes:string)=>post<UmrahDocuments>("travellers",{quoteId,travellers,contact,notes}),
};
const quotes=new Map<string,Promise<UmrahQuote>>();
export const umrahQuoteKey=(packageId:string,config:UmrahConfig,currency:CurrencyCode,identity:string)=>JSON.stringify([packageId,config,currency,identity]);
export function loadUmrahQuote(packageId:string,config:UmrahConfig,currency:CurrencyCode,identity:string):Promise<UmrahQuote>{
 const key=umrahQuoteKey(packageId,config,currency,identity);const found=quotes.get(key);if(found)return found.then(q=>{if(Date.parse(q.expiresAt)<=Date.now()){quotes.delete(key);return loadUmrahQuote(packageId,config,currency,identity);}return q;});
 const pending=umrahService.quote(packageId,config,currency);quotes.set(key,pending);pending.catch(()=>quotes.delete(key));if(quotes.size>50)quotes.delete(quotes.keys().next().value!);return pending;
}

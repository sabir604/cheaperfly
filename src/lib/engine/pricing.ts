/**
 * Price breakdowns shown in every "Your booking" summary and charged at payment.
 * All amounts are whole units of the display currency; generation happens in GBP.
 */
import { baggageOptionById } from "@/data/extras";
import { toCurrency, type CurrencyCode } from "@/lib/engine/currency";
import type { Fare, Offer, Pax } from "@/lib/types/flights";
import type { UmrahPricingInput } from "@/lib/types/umrah";

export type PriceLineKind = "base" | "taxes" | "extras" | "fee" | "discount";

export interface PriceLine {
  id: string;
  label: string;
  detail?: string;
  amount: number;
  kind: PriceLineKind;
}

export interface PriceBreakdown {
  currency: CurrencyCode;
  lines: PriceLine[];
  base: number;
  taxes: number;
  extras: number;
  fees: number;
  /** Positive number; subtracted from the total. */
  discount: number;
  total: number;
}

/** Flight extras keyed by passenger id (e.g. `adult-1`) and leg or segment. */
/** Special-assistance request for one passenger; `type` is an ASSISTANCE_OPTIONS id. */
export interface AssistanceRequest {
  type: string;
  notes: string;
}

export interface FlightExtras {
  /** passengerId → legIndex → baggage option id */
  baggage: Record<string, Record<string, string>>;
  /** passengerId → legIndex → meal option id */
  meals: Record<string, Record<string, string>>;
  /** segmentId → passengerId → chosen seat */
  seats: Record<string, Record<string, { seat: string; price: number; kind: string }>>;
  /** passengerId → assistance request (option id + free-text notes) */
  assistance: Record<string, AssistanceRequest>;
  seatsSkipped: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summarise(currency: CurrencyCode, lines: PriceLine[]): PriceBreakdown {
  const sum = (kind: PriceLineKind) => lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amount, 0);
  const base = sum("base");
  const taxes = sum("taxes");
  const extras = sum("extras");
  const fees = sum("fee");
  const discount = Math.abs(sum("discount"));
  return { currency, lines, base, taxes, extras, fees, discount, total: base + taxes + extras + fees - discount };
}

/** Per-passenger-type prices: children pay 75% of the adult fare, lap infants 10% (and 40% of the tax). */
export function fareUnitPrices(fare: Pick<Fare, "farePerAdult" | "taxPerAdult">, currency: CurrencyCode) {
  const base = toCurrency(fare.farePerAdult, currency);
  const tax = toCurrency(fare.taxPerAdult, currency);
  return {
    adult: { base, tax },
    child: { base: Math.round(0.75 * base), tax },
    infant: { base: Math.round(0.1 * base), tax: Math.round(0.4 * tax) },
  };
}

export function fareAdultTotal(fare: Pick<Fare, "farePerAdult" | "taxPerAdult">, currency: CurrencyCode): number {
  const u = fareUnitPrices(fare, currency);
  return u.adult.base + u.adult.tax;
}

export function fareTripTotal(fare: Pick<Fare, "farePerAdult" | "taxPerAdult">, pax: Pax, currency: CurrencyCode): number {
  const u = fareUnitPrices(fare, currency);
  return pax.adults * (u.adult.base + u.adult.tax) + pax.children * (u.child.base + u.child.tax) + pax.infants * (u.infant.base + u.infant.tax);
}

export interface FlightPricingInput {
  offer: Offer;
  /** No fare chosen yet prices the first (cheapest) fare. */
  fareId: string | null;
  pax: Pax;
  extras: Pick<FlightExtras, "baggage" | "seats">;
}

/** Flight total: fares + taxes + extra bags + paid seats + £9 service fee per seated passenger − 3% member saving. */
export function calcFlightPricing(input: FlightPricingInput, currency: CurrencyCode, member: boolean): PriceBreakdown {
  const fare = input.offer.fares.find((f) => f.id === input.fareId) ?? input.offer.fares[0];
  const unit = fareUnitPrices(fare, currency);
  const { adults, children, infants } = input.pax;
  const lines: PriceLine[] = [];
  if (adults) lines.push({ id: "base-adult", label: `Adult × ${adults}`, detail: fare.name, amount: adults * unit.adult.base, kind: "base" });
  if (children) lines.push({ id: "base-child", label: `Child × ${children}`, detail: fare.name, amount: children * unit.child.base, kind: "base" });
  if (infants) lines.push({ id: "base-infant", label: `Infant × ${infants}`, detail: "Lap infant", amount: infants * unit.infant.base, kind: "base" });
  lines.push({
    id: "taxes",
    label: "Taxes, fees & carrier charges",
    amount: adults * unit.adult.tax + children * unit.child.tax + infants * unit.infant.tax,
    kind: "taxes",
  });

  let bagTotal = 0;
  let bagCount = 0;
  for (const perLeg of Object.values(input.extras.baggage))
    for (const optionId of Object.values(perLeg)) {
      const option = baggageOptionById(optionId);
      if (option) {
        bagTotal += toCurrency(option.price, currency);
        bagCount++;
      }
    }
  if (bagCount) lines.push({ id: "extra-bags", label: "Extra baggage", detail: plural(bagCount, "item", "items"), amount: bagTotal, kind: "extras" });

  let seatTotal = 0;
  let seatCount = 0;
  for (const perPax of Object.values(input.extras.seats))
    for (const seat of Object.values(perPax)) {
      seatTotal += toCurrency(seat.price, currency);
      seatCount++;
    }
  if (seatCount) lines.push({ id: "seats", label: "Seat selection", detail: plural(seatCount, "seat", "seats"), amount: seatTotal, kind: "extras" });

  const seated = adults + children;
  const fee = toCurrency(9, currency);
  lines.push({ id: "service-fee", label: "Cheaperfly service fee", detail: `${seated} × ${fee}`, amount: seated * fee, kind: "fee" });

  if (member) {
    const saving = Math.round(0.03 * lines.filter((l) => l.kind === "base").reduce((s, l) => s + l.amount, 0));
    if (saving > 0) lines.push({ id: "member", label: "Member saving (3% off fare)", amount: -saving, kind: "discount" });
  }
  return summarise(currency, lines);
}

export interface HotelPricingInput {
  perNight: number;
  nights: number;
  rooms: number;
  roomName: string;
  ratePlanName: string;
}

/** Hotel total: room nights + 12% taxes + £6 service fee − 3% member saving. */
export function calcHotelPricing(input: HotelPricingInput, currency: CurrencyCode, member: boolean): PriceBreakdown {
  const room = toCurrency(input.perNight, currency) * input.nights * input.rooms;
  const lines: PriceLine[] = [
    {
      id: "room",
      label: input.roomName,
      detail: `${plural(input.nights, "night", "nights")} × ${plural(input.rooms, "room", "rooms")} · ${input.ratePlanName}`,
      amount: room,
      kind: "base",
    },
    { id: "taxes", label: "Taxes & municipality fees (12%)", amount: Math.round(0.12 * room), kind: "taxes" },
    { id: "service-fee", label: "Cheaperfly service fee", amount: toCurrency(6, currency), kind: "fee" },
  ];
  if (member) {
    const saving = Math.round(0.03 * room);
    if (saving > 0) lines.push({ id: "member", label: "Member saving (3% off room)", amount: -saving, kind: "discount" });
  }
  return summarise(currency, lines);
}

/**
 * Adult package price: base × departure-date factor + room-type delta + hotel upgrades (per night),
 * converted separately from the flight and transfer deltas (the rounding order matters).
 */
export function umrahAdultPackagePrice(input: UmrahPricingInput, currency: CurrencyCode): number {
  const departure = input.pkg.departures.find((d) => d.date === input.config.departureDate);
  const dateFactor = departure?.priceFactor ?? 1;
  const roomDelta = input.pkg.roomDelta[input.config.roomType] ?? 0;
  const makkahUpgrade = (input.makkahHotel.perNightPerPerson - input.defaultMakkah.perNightPerPerson) * input.pkg.makkahNights;
  const madinahUpgrade = (input.madinahHotel.perNightPerPerson - input.defaultMadinah.perNightPerPerson) * input.pkg.madinahNights;
  return (
    toCurrency(Math.round(input.pkg.basePerPerson * dateFactor + roomDelta + makkahUpgrade + madinahUpgrade), currency) +
    toCurrency(input.flight.priceDelta, currency) +
    toCurrency(input.transfer.priceDelta - input.defaultTransfer.priceDelta, currency)
  );
}

/** Umrah total: package (children 75%, infants £180 flat) + extras + 5% taxes + £15 fee per traveller − 3% member saving. */
export function calcUmrahPricing(input: UmrahPricingInput, currency: CurrencyCode, member: boolean): PriceBreakdown {
  const { adults, children, infants } = input.config;
  const adult = umrahAdultPackagePrice(input, currency);
  const child = Math.round(0.75 * adult);
  const infant = toCurrency(180, currency);
  const room = input.config.roomType.charAt(0).toUpperCase() + input.config.roomType.slice(1);
  const lines: PriceLine[] = [];
  if (adults) lines.push({ id: "pkg-adult", label: `Adult × ${adults}`, detail: `${input.pkg.name} · ${room} room`, amount: adults * adult, kind: "base" });
  if (children) lines.push({ id: "pkg-child", label: `Child × ${children}`, detail: "75% of adult package", amount: children * child, kind: "base" });
  if (infants) lines.push({ id: "pkg-infant", label: `Infant × ${infants}`, detail: "Flight & transfers only", amount: infants * infant, kind: "base" });

  const travellers = adults + children + infants;
  const payingForExtras = adults + children;
  const packageTotal = adults * adult + children * child + infants * infant;
  for (const extra of input.extras) {
    const unit = toCurrency(extra.price, currency);
    const qty = extra.perGroup ? 1 : payingForExtras;
    lines.push({ id: `extra-${extra.id}`, label: extra.label, detail: extra.perGroup ? "Per booking" : `${qty} × ${unit}`, amount: unit * qty, kind: "extras" });
  }
  lines.push({ id: "taxes", label: "VAT & Saudi service taxes (5%)", amount: Math.round(0.05 * packageTotal), kind: "taxes" });
  const fee = toCurrency(15, currency);
  lines.push({ id: "service-fee", label: "Cheaperfly service fee", detail: `${travellers} × ${fee}`, amount: travellers * fee, kind: "fee" });
  if (member) {
    const saving = Math.round(0.03 * packageTotal);
    if (saving > 0) lines.push({ id: "member", label: "Member saving (3% off package)", amount: -saving, kind: "discount" });
  }
  return summarise(currency, lines);
}

import type { FlightSearchResult, Offer } from "./flight-types";
import type { Quote } from "./index";
export const GUEST_COOKIE = "cf_guest_session";
export const GUEST_SESSION_HEADER = "x-cheaperfly-guest-session";
export type SeatKind = "standard" | "premium" | "extra_legroom";
export interface Seat {
  id: string;
  row: number;
  letter: string;
  kind: SeatKind;
  price: number;
  occupied: boolean;
  window: boolean;
  aisle: boolean;
}
export interface SeatRow {
  row: number;
  seats: Seat[];
  exit: boolean;
  wing: boolean;
  label?: "Exit row" | "Bulkhead";
}
export interface SeatMap {
  segmentId: string;
  aircraft: string;
  cabin: import("./flight-types").Cabin;
  layout: string[];
  rows: SeatRow[];
}
export interface FlightExtras {
  baggage: Record<string, Record<string, string>>;
  meals: Record<string, Record<string, string>>;
  seats: Record<
    string,
    Record<string, { seat: string; price: number; kind: string }>
  >;
  assistance: Record<string, { type: string; notes: string }>;
  seatsSkipped: boolean;
}
export interface PriceLine {
  id: string;
  label: string;
  detail?: string;
  amount: number;
  kind: "base" | "taxes" | "extras" | "fee" | "discount";
}
export interface FlightPrice {
  currency: import("./index").Currency;
  lines: PriceLine[];
  base: number;
  taxes: number;
  extras: number;
  fees: number;
  discount: number;
  total: number;
}
export type FlightQuote = Quote & {
  product: "flight";
  breakdown: FlightPrice;
  offer: Offer;
  fareId: string;
  searchId: string;
  extras: FlightExtras;
};
export type RevalidateResult =
  | { status: "ok"; offer: Offer }
  | { status: "expired" }
  | {
      status: "price_changed";
      newFarePerAdult: number;
      newTaxPerAdult: number;
      offer: Offer;
    };
export type FlightSearch = FlightSearchResult & { expiresAt: string };
// Validate bounded provider data before returning it through the website adapter.
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => typeof v === "string" && v.length < 2000;
const num = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  Math.abs(v) <= Number.MAX_SAFE_INTEGER;
function safe(v: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (v === null || typeof v === "boolean" || str(v) || num(v)) return true;
  if (Array.isArray(v))
    return v.length <= 2000 && v.every((x) => safe(x, depth + 1));
  return (
    obj(v) &&
    Object.keys(v).length <= 100 &&
    Object.entries(v).every(
      ([k, x]) =>
        ![
          "token",
          "password",
          "guestToken",
          "customerId",
          "__proto__",
          "constructor",
        ].includes(k) && safe(x, depth + 1),
    )
  );
}
const fare = (v: unknown) =>
  obj(v) &&
  ["id", "name", "seatSelection"].every((k) => str(v[k])) &&
  ["farePerAdult", "taxPerAdult", "tier"].every((k) => num(v[k])) &&
  obj(v.checkedBag) &&
  Array.isArray(v.perks);
const offer = (v: unknown) =>
  obj(v) &&
  str(v.id) &&
  str(v.airlineCode) &&
  Array.isArray(v.fares) &&
  v.fares.length > 0 &&
  v.fares.every(fare) &&
  Array.isArray(v.legs) &&
  v.legs.length > 0 &&
  v.legs.every(
    (l) =>
      obj(l) &&
      Array.isArray(l.segments) &&
      l.segments.length > 0 &&
      l.segments.every(
        (s) =>
          obj(s) &&
          [
            "id",
            "aircraft",
            "cabin",
            "from",
            "to",
            "departLocal",
            "arriveLocal",
          ].every((k) => str(s[k])),
      ),
  );
export function validFlightData(path: string, v: unknown): boolean {
  if (!safe(v)) return false;
  if (path === "flights/airports")
    return (
      Array.isArray(v) &&
      v.length <= 8 &&
      v.every(
        (g) =>
          obj(g) &&
          str(g.city) &&
          str(g.country) &&
          Array.isArray(g.items) &&
          g.items.every(
            (i) =>
              obj(i) &&
              ["airport", "group"].includes(String(i.kind)) &&
              ["code", "city", "country", "name", "iata"].every((k) =>
                str(i[k]),
              ),
          ),
      )
    );
  if (path === "flights/previews") return Array.isArray(v) && v.every(offer);
  if (!obj(v)) return false;
  if (path === "flights/search")
    return (
      str(v.searchId) &&
      str(v.generatedAt) &&
      str(v.expiresAt) &&
      obj(v.criteria) &&
      Array.isArray(v.offers) &&
      v.offers.every(offer) &&
      Array.isArray(v.datePrices)
    );
  if (path === "flights/seat-maps")
    return (
      str(v.segmentId) &&
      str(v.aircraft) &&
      Array.isArray(v.layout) &&
      Array.isArray(v.rows) &&
      v.rows.every(
        (r) =>
          obj(r) &&
          num(r.row) &&
          Array.isArray(r.seats) &&
          r.seats.every(
            (s) =>
              obj(s) &&
              str(s.id) &&
              num(s.price) &&
              typeof s.occupied === "boolean",
          ),
      )
    );
  if (path === "flights/revalidate")
    return (
      v.status === "expired" ||
      (["ok", "price_changed"].includes(String(v.status)) &&
        offer(v.offer) &&
        (v.status === "ok" ||
          (num(v.newFarePerAdult) && num(v.newTaxPerAdult))))
    );
  return (
    path === "flights/quotes" &&
    v.product === "flight" &&
    str(v.id) &&
    str(v.expiresAt) &&
    Number.isSafeInteger(v.revision) &&
    obj(v.total) &&
    num(v.total.minorUnits) &&
    obj(v.accountingTotal) &&
    num(v.accountingTotal.minorUnits) &&
    obj(v.fx) &&
    str(v.fx.rate) &&
    obj(v.breakdown) &&
    num(v.breakdown.total) &&
    Array.isArray(v.breakdown.lines) &&
    offer(v.offer) &&
    str(v.searchId) &&
    str(v.fareId) &&
    obj(v.extras)
  );
}

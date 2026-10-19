import hotels from "./hotels-catalogue.json";
import destinations from "./hotel-destinations.json";
import type { Currency, Quote } from "./index";
import type { FlightPrice } from "./flights";
export type Hotel = (typeof hotels)[number];
export type HotelRoom = Hotel["rooms"][number];
export type RatePlan = Hotel["ratePlans"][number] & {
  freeCancelDaysBefore?: number;
};
export const HOTELS = hotels as Hotel[];
export const DESTINATIONS = destinations;
export const getDestination = (id: string) =>
  DESTINATIONS.find((d) => d.id === id);
export const getHotel = (id: string) => HOTELS.find((h) => h.id === id);
export type MealPlan = "room_only" | "breakfast" | "half_board" | "full_board";

export interface Occupancy {
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
}

export interface HotelCriteria {
  /** Destination id, e.g. "dubai". */
  destination: string;
  checkIn: string;
  checkOut: string;
  occupancy: Occupancy;
}

export interface RoomQuote {
  roomId: string;
  roomName: string;
  ratePlanId: string;
  ratePlanName: string;
  meal: MealPlan;
  refundable: boolean;
  freeCancelUntil?: string;
  payLater: boolean;
  /** Average nightly price per room, GBP. */
  perNight: number;
  nights: number;
  rooms: number;
  roomTotal: number;
}

export interface HotelSearchItem {
  hotel: Hotel;
  bestQuote: RoomQuote;
  rankScore: number;
}

export interface HotelSearchResult {
  searchId: string;
  criteria: HotelCriteria;
  items: HotelSearchItem[];
}

export type HotelSearch = Omit<HotelSearchResult, "items"> & {
  expiresAt: string;
  items: (HotelSearchItem & { quotes: RoomQuote[] })[];
};
export type HotelAvailability = {
  searchId: string;
  criteria: HotelCriteria;
  hotel: Hotel;
  quotes: RoomQuote[];
  expiresAt: string;
};
export type HotelQuote = Quote & {
  product: "hotel";
  searchId: string;
  hotel: Hotel;
  criteria: HotelCriteria;
  room: RoomQuote;
  breakdown: FlightPrice;
  payLater: boolean;
  dueNow: { currency: Currency; minorUnits: number };
};
export function isCalendarDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
/** Validate before any date arithmetic; counts mirror the existing controls. */
export function validHotelCriteria(
  v: unknown,
  today = new Date().toISOString().slice(0, 10),
): v is HotelCriteria {
  if (
    !obj(v) ||
    !getDestination(String(v.destination)) ||
    !isCalendarDate(v.checkIn) ||
    !isCalendarDate(v.checkOut) ||
    v.checkIn < today ||
    v.checkOut <= v.checkIn ||
    Date.parse(v.checkOut) - Date.parse(v.checkIn) > 30 * 864e5 ||
    Date.parse(v.checkIn) - Date.parse(today) > 365 * 864e5 ||
    !obj(v.occupancy)
  )
    return false;
  const o = v.occupancy;
  return (
    Number.isInteger(o.rooms) &&
    Number(o.rooms) >= 1 &&
    Number(o.rooms) <= 8 &&
    Number.isInteger(o.adults) &&
    Number(o.adults) >= Number(o.rooms) &&
    Number(o.adults) <= 16 &&
    Number.isInteger(o.children) &&
    Number(o.children) >= 0 &&
    Number(o.children) <= 8 &&
    Array.isArray(o.childAges) &&
    o.childAges.length === o.children &&
    o.childAges.every((n) => Number.isInteger(n) && n >= 0 && n <= 17)
  );
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  Math.abs(v) <= Number.MAX_SAFE_INTEGER;
const str = (v: unknown) => typeof v === "string" && v.length <= 5000;
function safe(v: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (v === null || typeof v === "boolean" || num(v) || str(v)) return true;
  if (Array.isArray(v))
    return v.length <= 2000 && v.every((x) => safe(x, depth + 1));
  return (
    obj(v) &&
    Object.keys(v).length <= 100 &&
    Object.entries(v).every(
      ([k, x]) =>
        ![
          "token",
          "guestToken",
          "password",
          "customerId",
          "__proto__",
          "constructor",
        ].includes(k) && safe(x, depth + 1),
    )
  );
}
const hotel = (v: unknown) =>
  obj(v) &&
  str(v.id) &&
  str(v.name) &&
  str(v.city) &&
  Array.isArray(v.rooms) &&
  Array.isArray(v.ratePlans) &&
  Array.isArray(v.images) &&
  Array.isArray(v.reviews) &&
  Array.isArray(v.policies);
const room = (v: unknown) =>
  obj(v) &&
  ["roomId", "roomName", "ratePlanId", "ratePlanName"].every((k) =>
    str(v[k]),
  ) &&
  ["perNight", "nights", "rooms", "roomTotal"].every((k) => num(v[k])) &&
  typeof v.refundable === "boolean" &&
  typeof v.payLater === "boolean" &&
  ["room_only", "breakfast", "half_board", "full_board"].includes(
    String(v.meal),
  );
export function validHotelData(path: string, v: unknown): boolean {
  if (!safe(v)) return false;
  if (path === "hotels/previews")
    return (
      Array.isArray(v) &&
      v.every(
        (i) => obj(i) && hotel(i.hotel) && obj(i.criteria) && room(i.quote),
      )
    );
  if (!obj(v)) return false;
  if (path === "hotels/search")
    return (
      str(v.searchId) &&
      str(v.expiresAt) &&
      obj(v.criteria) &&
      Array.isArray(v.items) &&
      v.items.every(
        (i) =>
          obj(i) &&
          hotel(i.hotel) &&
          room(i.bestQuote) &&
          num(i.rankScore) &&
          Array.isArray(i.quotes) &&
          i.quotes.every(room),
      )
    );
  if (path === "hotels/availability")
    return (
      str(v.searchId) &&
      str(v.expiresAt) &&
      obj(v.criteria) &&
      hotel(v.hotel) &&
      Array.isArray(v.quotes) &&
      v.quotes.every(room)
    );
  if (path === "hotels/quotes")
    return (
      v.product === "hotel" &&
      str(v.id) &&
      str(v.searchId) &&
      str(v.expiresAt) &&
      hotel(v.hotel) &&
      room(v.room) &&
      obj(v.criteria) &&
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
      typeof v.payLater === "boolean" &&
      obj(v.dueNow) &&
      num(v.dueNow.minorUnits) &&
      (v.payLater
        ? v.dueNow.minorUnits === 0
        : v.dueNow.minorUnits === v.total.minorUnits)
    );
  return /^hotels\/[A-Za-z0-9_-]+$/.test(path) && hotel(v);
}

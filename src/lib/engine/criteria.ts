import { isCalendarDate, validHotelCriteria } from "@cheaperfly/api-contracts/hotels";
/** Search defaults, URL (de)serialisation and flight-form validation. URLs match the original site. */
import { AIRPORT_GROUPS } from "@/data/flights";
import { getDestination } from "@/data/hotels";
import { UMRAH_DEPARTURE_CITIES } from "@/data/umrah";
import { getAirport } from "@/lib/engine/airports";
import { addDaysISO, todayISO } from "@/lib/engine/dates";
import type { HotelCriteria, Occupancy } from "@/lib/engine/hotels";
import type { Cabin, FlightCriteria, SearchLeg, TripType } from "@/lib/types/flights";

/** Search forms open 16 days out, for a 7-night trip. */
export function defaultFlightDates() {
  const dep = addDaysISO(todayISO(), 16);
  return { dep, ret: addDaysISO(dep, 7) };
}

export function defaultHotelDates() {
  const checkIn = addDaysISO(todayISO(), 16);
  return { checkIn, checkOut: addDaysISO(checkIn, 4) };
}

export function defaultOccupancy(): Occupancy {
  return { rooms: 1, adults: 2, children: 0, childAges: [] };
}

function hotelParams(c: HotelCriteria): string {
  const p = new URLSearchParams();
  p.set("dest", c.destination);
  p.set("in", c.checkIn);
  p.set("out", c.checkOut);
  p.set("rooms", String(c.occupancy.rooms));
  p.set("adt", String(c.occupancy.adults));
  p.set("chd", String(c.occupancy.children));
  if (c.occupancy.childAges.length) p.set("ages", c.occupancy.childAges.join(","));
  return p.toString();
}

/** `/flights/search?trip=return&from=LON&to=DXB&dep=…&ret=…&adt=1&chd=0&inf=0&cabin=economy`; multi-city uses `seg=LON~DXB~date,…`. */
export function flightSearchHref(c: FlightCriteria): string {
  const p = new URLSearchParams();
  p.set("trip", c.trip);
  if (c.trip === "multicity") p.set("seg", c.legs.map((l) => `${l.from}~${l.to}~${l.date}`).join(","));
  else {
    p.set("from", c.legs[0].from);
    p.set("to", c.legs[0].to);
    p.set("dep", c.legs[0].date);
    if (c.trip === "return" && c.legs[1]) p.set("ret", c.legs[1].date);
  }
  p.set("adt", String(c.pax.adults));
  p.set("chd", String(c.pax.children));
  p.set("inf", String(c.pax.infants));
  p.set("cabin", c.cabin);
  return `/flights/search?${p.toString()}`;
}

export const hotelSearchHref = (c: HotelCriteria) => `/hotels/search?${hotelParams(c)}`;
export const hotelDetailHref = (hotelId: string, c: HotelCriteria) => `/hotels/${hotelId}?${hotelParams(c)}`;

export function serializeUmrahCriteria(c: { departureCity?: string; month?: string; nights?: string; adults?: number; children?: number; infants?: number }): string {
  const p = new URLSearchParams();
  if (c.departureCity) p.set("from", c.departureCity);
  if (c.month) p.set("month", c.month);
  if (c.nights) p.set("nights", c.nights);
  p.set("adt", String(c.adults ?? 2));
  p.set("chd", String(c.children ?? 0));
  p.set("inf", String(c.infants ?? 0));
  return p.toString();
}

function isKnownCode(code: string | undefined): boolean {
  if (!code) return false;
  const c = code.replace("*", "").toUpperCase();
  return !!getAirport(c) || !!AIRPORT_GROUPS[c];
}

export interface FlightFormErrors {
  legs: { from?: string; to?: string; date?: string }[];
  ret?: string;
  pax?: string;
}

/**
 * Validates the search form. For return trips, `formLegs` lets the form pass its single-leg draft.
 * Returns null when valid.
 */
export function validateFlightCriteria(c: FlightCriteria, formLegs?: SearchLeg[]): FlightFormErrors | null {
  const errors: FlightFormErrors = { legs: [] };
  let invalid = false;
  const today = todayISO();
  const legs = c.trip === "return" ? (formLegs ?? c.legs) : c.legs;
  const count = c.trip === "return" ? 1 : c.legs.length;
  for (let i = 0; i < count; i++) {
    const leg = legs[i];
    const e: FlightFormErrors["legs"][number] = {};
    if (!leg?.from) e.from = "Choose where you're flying from";
    else if (!isKnownCode(leg.from)) e.from = "Choose an airport from the list";
    if (!leg?.to) e.to = "Choose where you're flying to";
    else if (!isKnownCode(leg.to)) e.to = "Choose an airport from the list";
    if (leg?.from && leg?.to && leg.from.replace("*", "") === leg.to.replace("*", "")) e.to = "Origin and destination can't be the same";
    if (!leg?.date) e.date = "Choose a departure date";
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(leg.date) || !Number.isFinite(Date.parse(leg.date)) || new Date(leg.date).toISOString().slice(0,10)!==leg.date) e.date = "Choose a valid calendar date";
    else if (leg.date < today) e.date = "Departure date is in the past";
    else if (i > 0 && legs[i - 1]?.date && leg.date < legs[i - 1].date) e.date = "Must be on or after the previous flight";
    if (Object.keys(e).length) invalid = true;
    errors.legs.push(e);
  }
  if (c.trip === "return") {
    const ret = c.legs[1]?.date;
    if (!ret) {
      errors.ret = "Choose a return date";
      invalid = true;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(ret) || !Number.isFinite(Date.parse(ret)) || new Date(ret).toISOString().slice(0,10)!==ret) {
      errors.ret = "Choose a valid calendar date"; invalid = true;
    } else if (ret < c.legs[0].date) {
      errors.ret = "Return can't be before departure";
      invalid = true;
    }
  }
  if (Object.values(c.pax).some(n=>!Number.isInteger(n)||n<0)||c.pax.adults<1) {errors.pax="Choose valid passenger counts";invalid=true;}
  if (c.pax.infants > c.pax.adults) {
    errors.pax = "Each infant must travel with an adult";
    invalid = true;
  }
  if (c.pax.adults + c.pax.children > 9) {
    errors.pax = "You can book up to 9 seated passengers at once";
    invalid = true;
  }
  return invalid ? errors : null;
}

const TRIPS: TripType[] = ["return", "oneway", "multicity"];
const CABINS: Cabin[] = ["economy", "premium_economy", "business", "first"];

type Params = Record<string, string | string[] | undefined>;

/**
 * Reads `/flights/search` query params back into criteria. Returns null for a link that is
 * malformed or fails form validation (unknown airport, past date…): the "isn't valid" state.
 */
export function parseFlightCriteria(params: Params): FlightCriteria | null {
  const get = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  };
  const trip = get("trip") as TripType;
  if (!TRIPS.includes(trip)) return null;
  const count = (k: string, fallback: number) => {
    const raw = get(k);
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 9 ? n : NaN;
  };
  const pax = { adults: count("adt", 1), children: count("chd", 0), infants: count("inf", 0) };
  if (Object.values(pax).some(Number.isNaN) || pax.adults < 1) return null;
  const cabin = (get("cabin") || "economy") as Cabin;
  if (!CABINS.includes(cabin)) return null;
  const isDate = isCalendarDate;

  let legs: SearchLeg[];
  if (trip === "multicity") {
    legs = get("seg")
      .split(",")
      .filter(Boolean)
      .map((s) => {
        const [from = "", to = "", date = ""] = s.split("~");
        return { from: from.toUpperCase(), to: to.toUpperCase(), date };
      });
    if (legs.length < 2 || legs.length > 5) return null;
  } else {
    const from = get("from").toUpperCase();
    const to = get("to").toUpperCase();
    legs = [{ from, to, date: get("dep") }];
    if (trip === "return") legs.push({ from: to, to: from, date: get("ret") });
  }
  if (legs.some((l) => !isDate(l.date))) return null;
  const criteria: FlightCriteria = { trip, legs, pax, cabin };
  return validateFlightCriteria(criteria, trip === "return" ? [legs[0]] : undefined) ? null : criteria;
}

const firstParam = (params: Params, k: string) => {
  const v = params[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
};

/**
 * Reads `?dest&in&out&rooms&adt&chd&ages` into hotel criteria. Missing values fall back to the
 * search-form defaults (`fallbackDestination` for `dest`); malformed or past dates return null.
 */
export function parseHotelCriteria(params: Params, fallbackDestination?: string): HotelCriteria | null {
  const get = (k: string) => firstParam(params, k);
  const destination = (get("dest") || fallbackDestination || "").toLowerCase();
  if (!getDestination(destination)) return null;
  const defaults = defaultHotelDates();
  const checkIn = get("in") || defaults.checkIn;
  if (!isCalendarDate(checkIn)) return null;
  const checkOut = get("out") || (get("in") ? addDaysISO(checkIn, 4) : defaults.checkOut);
  const isDate = isCalendarDate;
  if (!isDate(checkIn) || !isDate(checkOut) || checkIn < todayISO() || checkOut <= checkIn) return null;
  const count = (k: string, fallback: number, min: number, max: number) => {
    const raw = get(k);
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
  };
  const rooms = count("rooms", 1, 1, 8);
  const adults = count("adt", 2, 1, 16);
  const children = count("chd", 0, 0, 8);
  if ([rooms, adults, children].some(Number.isNaN) || adults < rooms) return null;
  const agesRaw = get("ages");
  const ages = agesRaw
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 17);
  if (agesRaw && (ages.length!==children || agesRaw.split(",").some(v=>v.trim()==="" || !Number.isInteger(Number(v)) || Number(v)<0 || Number(v)>17))) return null;
  const childAges = Array.from({ length: children }, (_, i) => ages[i] ?? 8);
  const criteria = { destination, checkIn, checkOut, occupancy: { rooms, adults, children, childAges } };
  return validHotelCriteria(criteria) ? criteria : null;
}

export interface UmrahUrlCriteria {
  departureCity: string;
  month: string;
  nights: string;
  adults: number;
  children: number;
  infants: number;
}

/** Reads `?from&month&nights&adt&chd&inf` (as written by the Umrah search form), with the form's defaults. */
export function parseUmrahCriteria(params: Params): UmrahUrlCriteria {
  const get = (k: string) => firstParam(params, k);
  const count = (k: string, fallback: number, min: number, max: number) => {
    const n = Number(get(k) || fallback);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  };
  const from = get("from");
  const month = get("month");
  const nights = get("nights");
  const adults = count("adt", 2, 1, 9);
  return {
    departureCity: UMRAH_DEPARTURE_CITIES.includes(from) ? from : "London",
    month: /^\d{4}-\d{2}$/.test(month) ? month : "any",
    nights: ["7", "10", "14"].includes(nights) ? nights : "any",
    adults,
    children: count("chd", 0, 0, 8),
    infants: Math.min(count("inf", 0, 0, 9), adults),
  };
}

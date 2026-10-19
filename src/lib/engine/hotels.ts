import { apiRequest } from "@/lib/api/client";
import type { HotelAvailability, HotelSearch, HotelQuote } from "@cheaperfly/api-contracts/hotels";
import type { Currency } from "@cheaperfly/api-contracts";
import { HOTELS, getDestination, type Hotel, type HotelRoom, type RatePlan } from "@/data/hotels";
import { addDaysISO, dayDiff, parseDate, todayISO } from "@/lib/engine/dates";
import { createRng } from "@/lib/engine/rng";
import { type ServiceOptions } from "@/lib/engine/service";

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

/** Does one room sleep an even split of the party across the requested rooms? */
export function roomFits(room: Pick<HotelRoom, "sleeps"> & {roomsLeft?:number}, occ: Pick<Occupancy, "rooms" | "adults" | "children">): boolean {
  const adults = Math.ceil(occ.adults / occ.rooms);
  const children = Math.ceil(occ.children / occ.rooms);
  return (room.roomsLeft === undefined || room.roomsLeft >= occ.rooms) && room.sleeps.adults >= adults && room.sleeps.adults + room.sleeps.children >= adults + children;
}

/** Seasonal multiplier for one night in a destination. Fridays and Saturdays add 8%. */
function seasonFactor(destinationId: string, date: string): number {
  const d = parseDate(date)!;
  const month = d.getMonth() + 1;
  const weekday = d.getDay();
  let f = 1;
  if (destinationId === "dubai") {
    if (month >= 6 && month <= 9) f = 0.72;
    else if (month === 12 || month === 1) f = 1.3;
    else if (month === 10 || month === 11 || month === 2 || month === 3) f = 1.1;
  } else if (destinationId === "london") {
    if (month >= 6 && month <= 8) f = 1.12;
    else if (month === 12) f = 1.15;
  } else if (destinationId === "istanbul") {
    if (month >= 5 && month <= 9) f = 1.12;
  } else if (destinationId === "makkah" || destinationId === "madinah") {
    if (date >= "2027-02-08" && date <= "2027-03-09") f = 1.7; // Ramadan
    if (date >= "2027-02-27" && date <= "2027-03-09") f = 2.1; // last ten nights
    if (month === 12 || month === 1) f = Math.max(f, 1.25);
  }
  if (weekday === 5 || weekday === 6) f *= 1.08;
  return f;
}

/** Prices one room + rate plan for the stay, night by night. Null when the rate plan doesn't exist. */
export function quoteRoom(
  hotel: Hotel,
  room: Pick<HotelRoom, "id" | "name" | "baseRate">,
  ratePlanId: string,
  criteria: Pick<HotelCriteria, "checkIn" | "checkOut" | "occupancy">,
): RoomQuote | null {
  const plan = hotel.ratePlans.find((p) => p.id === ratePlanId) as RatePlan | undefined;
  if (!plan) return null;
  const destinationId = getDestination(hotel.city.toLowerCase())?.id ?? hotel.city.toLowerCase();
  const nights = Math.max(1, dayDiff(criteria.checkIn, criteria.checkOut));
  let total = 0;
  for (let n = 0; n < nights; n++) total += room.baseRate * plan.priceFactor * seasonFactor(destinationId, addDaysISO(criteria.checkIn, n));
  const perNight = Math.round(total / nights);
  const cancelBy = plan.freeCancelDaysBefore != null ? addDaysISO(criteria.checkIn, -plan.freeCancelDaysBefore) : undefined;
  const refundable = plan.refundable && !!cancelBy && cancelBy >= todayISO();
  return {
    roomId: room.id,
    roomName: room.name,
    ratePlanId: plan.id,
    ratePlanName: plan.name,
    meal: plan.meal as MealPlan,
    refundable,
    freeCancelUntil: refundable ? cancelBy : undefined,
    payLater: plan.payLater,
    perNight,
    nights,
    rooms: criteria.occupancy.rooms,
    roomTotal: perNight * nights * criteria.occupancy.rooms,
  };
}

/** Cheapest room + rate plan that fits the party, optionally limited by meal plan or free cancellation. */
export function bestQuote(
  hotel: Hotel,
  criteria: Pick<HotelCriteria, "checkIn" | "checkOut" | "occupancy">,
  opts: { meals?: MealPlan[]; freeCancellation?: boolean } = {},
): RoomQuote | null {
  let best: RoomQuote | null = null;
  for (const room of hotel.rooms) {
    if (!roomFits(room, criteria.occupancy)) continue;
    for (const plan of hotel.ratePlans) {
      if (opts.meals?.length && !opts.meals.includes(plan.meal as MealPlan)) continue;
      const q = quoteRoom(hotel, room, plan.id, criteria);
      if (q && (!opts.freeCancellation || q.refundable) && (!best || q.perNight < best.perNight)) best = q;
    }
  }
  return best;
}

/** Hotels in the destination that can host the party, ranked by rating, popularity, price and distance. */
export function generateHotelSearch(criteria: HotelCriteria): HotelSearchResult {
  const dest = getDestination(criteria.destination);
  const items: HotelSearchItem[] = [];
  for (const hotel of HOTELS.filter((h) => h.city === dest?.city)) {
    const quote = bestQuote(hotel, criteria);
    if (!quote) continue;
    const rng = createRng(`rank-${hotel.id}`);
    const rankScore = 10 * hotel.rating + 4 * Math.log10(hotel.reviewCount) - 0.04 * quote.perNight - 0.35 * hotel.distanceKm + rng.between(0, 2);
    items.push({ hotel, bestQuote: quote, rankScore });
  }
  items.sort((a, b) => b.rankScore - a.rankScore);
  const o = criteria.occupancy;
  return {
    searchId: `${criteria.destination}-${criteria.checkIn}-${criteria.checkOut}-${o.rooms}-${o.adults}-${o.children}`,
    criteria,
    items,
  };
}

export interface HotelFilters {
  maxPrice: number | null;
  stars: number[];
  minRating: number;
  types: string[];
  amenities: string[];
  meals: MealPlan[];
  freeCancellation: boolean;
  maxDistanceKm: number | null;
}

export const EMPTY_HOTEL_FILTERS: HotelFilters = {
  maxPrice: null,
  stars: [],
  minRating: 0,
  types: [],
  amenities: [],
  meals: [],
  freeCancellation: false,
  maxDistanceKm: null,
};

export const MEAL_LABEL: Record<MealPlan, string> = {
  room_only: "Room only",
  breakfast: "Breakfast included",
  half_board: "Half board",
  full_board: "Full board",
};

export interface HotelRow {
  hotel: Hotel;
  quote: RoomQuote;
  rank: number;
}

export function applyHotelFilters(hotels: Hotel[], criteria: HotelCriteria, f: HotelFilters, availability?: Record<string, RoomQuote[]>): HotelRow[] {
  const rows: HotelRow[] = [];
  for (const h of hotels) {
    if (
      (f.stars.length && !f.stars.includes(h.stars)) ||
      (f.minRating && h.rating < f.minRating) ||
      (f.types.length && !f.types.includes(h.propertyType)) ||
      (f.amenities.length && !f.amenities.every((a) => h.amenities.includes(a))) ||
      (f.maxDistanceKm !== null && h.distanceKm > f.maxDistanceKm)
    )
      continue;
    const quote = availability
      ? (availability[h.id] ?? []).filter(q=>{const room=h.rooms.find(r=>r.id===q.roomId);return !!room&&roomFits(room,criteria.occupancy)&&(!f.meals.length||f.meals.includes(q.meal))&&(!f.freeCancellation||q.refundable);}).reduce<RoomQuote|null>((a,b)=>!a||b.perNight<a.perNight?b:a,null)
      : bestQuote(h, criteria, { meals: f.meals, freeCancellation: f.freeCancellation });
    if (quote && (f.maxPrice === null || quote.perNight <= f.maxPrice)) rows.push({ hotel: h, quote, rank: 0 });
  }
  return rows;
}

export function isHotelFiltered(f: HotelFilters): boolean {
  return (
    f.maxPrice !== null ||
    f.stars.length > 0 ||
    f.minRating > 0 ||
    f.types.length > 0 ||
    f.amenities.length > 0 ||
    f.meals.length > 0 ||
    f.freeCancellation ||
    f.maxDistanceKm !== null
  );
}

export type HotelSort = "recommended" | "price" | "rating" | "distance";

async function post<T>(path:string,body:unknown):Promise<T> {return (await apiRequest<T>("public","hotels/"+path,{method:"POST",body:JSON.stringify(body)})).data;}
export const hotelService = {
 search:(criteria:HotelCriteria,opts?:ServiceOptions)=>post<HotelSearch>("search",{criteria,...(opts?.scenario&&opts.scenario!=="ok"?{scenario:opts.scenario}:{})}),
 detail:async(id:string)=>(await apiRequest<Hotel>("public","hotels/"+id)).data,
 availability:(hotelId:string,criteria:HotelCriteria)=>post<HotelAvailability>("availability",{hotelId,criteria}),
 previews:(items:{hotelId:string;criteria:HotelCriteria}[])=>post<{hotel:Hotel;criteria:HotelCriteria;quote:RoomQuote}[]>("previews",{items}),
 quote:(searchId:string,hotelId:string,roomId:string,ratePlanId:string,currency:Currency)=>post<HotelQuote>("quotes",{searchId,hotelId,roomId,ratePlanId,currency}),
};
const quotes=new Map<string,Promise<HotelQuote>>();
export const hotelQuoteKey=(searchId:string,hotelId:string,roomId:string,ratePlanId:string,currency:Currency,identity:string)=>JSON.stringify([searchId,hotelId,roomId,ratePlanId,currency,identity]);
export function loadHotelQuote(searchId:string,hotelId:string,roomId:string,ratePlanId:string,currency:Currency,identity:string):Promise<HotelQuote> {
 const key=hotelQuoteKey(searchId,hotelId,roomId,ratePlanId,currency,identity);
 const found=quotes.get(key);if(found)return found.then(q=>{if(Date.parse(q.expiresAt)<=Date.now()){quotes.delete(key);return loadHotelQuote(searchId,hotelId,roomId,ratePlanId,currency,identity);}return q;});
 const pending=hotelService.quote(searchId,hotelId,roomId,ratePlanId,currency);quotes.set(key,pending);pending.catch(()=>quotes.delete(key));if(quotes.size>50)quotes.delete(quotes.keys().next().value!);return pending;
}

/** `rankedIds` is the recommended order from `generateHotelSearch`. */
export function sortHotelRows(rows: HotelRow[], sort: HotelSort, rankedIds: string[]): HotelRow[] {
  const out = [...rows];
  switch (sort) {
    case "price":
      return out.sort((a, b) => a.quote.perNight - b.quote.perNight);
    case "rating":
      return out.sort((a, b) => b.hotel.rating - a.hotel.rating || b.hotel.reviewCount - a.hotel.reviewCount);
    case "distance":
      return out.sort((a, b) => a.hotel.distanceKm - b.hotel.distanceKm);
    default:
      return out.sort((a, b) => rankedIds.indexOf(a.hotel.id) - rankedIds.indexOf(b.hotel.id));
  }
}

import packageDefs from "./json/UMRAH_PACKAGE_DEFS.json";
import flights from "./json/UMRAH_FLIGHTS.json";
import transfers from "./json/UMRAH_TRANSFERS.json";
import extras from "./json/UMRAH_EXTRAS.json";
import roomDelta from "./json/UMRAH_ROOM_DELTA.json";
import { HOTELS } from "./hotels";
import type {
  UmrahCategory,
  UmrahExtra,
  UmrahFlightOption,
  UmrahHotel,
  UmrahPackageDef,
  UmrahRoomType,
  UmrahTransferOption,
} from "@/lib/types/umrah";

export const UMRAH_PACKAGE_DEFS = packageDefs as unknown as UmrahPackageDef[];
export const UMRAH_FLIGHTS = flights as unknown as UmrahFlightOption[];
export const UMRAH_TRANSFERS = transfers as unknown as UmrahTransferOption[];
export const UMRAH_EXTRAS = extras as unknown as UmrahExtra[];
/** Per-person supplement for triple / double rooms, by package category. */
export const UMRAH_ROOM_DELTA = roomDelta as unknown as Record<UmrahCategory, Record<UmrahRoomType, number>>;

export const UMRAH_DEPARTURE_CITIES = ["London", "Manchester", "Birmingham", "Glasgow", "Edinburgh", "Dubai"];

/** Umrah hotel options derive from the main hotel records: price per person is 30% of the first room's base rate. */
function umrahHotel(id: string, city: UmrahHotel["city"]): UmrahHotel {
  const h = HOTELS.find((x) => x.id === id)!;
  return {
    id: h.id,
    name: h.name,
    city,
    stars: h.stars,
    distanceM: Math.round(1000 * h.distanceKm),
    image: h.images[0],
    amenities: h.keyAmenities,
    perNightPerPerson: Math.round(0.3 * h.rooms[0].baseRate),
    rating: h.rating,
  };
}

export const UMRAH_HOTELS: UmrahHotel[] = [
  umrahHotel("ajyad-royal-suites", "makkah"),
  umrahHotel("marwa-gate-hotel", "makkah"),
  umrahHotel("safa-heights", "makkah"),
  umrahHotel("ibrahim-khalil-grand", "makkah"),
  umrahHotel("aziziyah-comfort", "makkah"),
  umrahHotel("nabawi-gate-royal", "madinah"),
  umrahHotel("quba-grand", "madinah"),
  umrahHotel("al-salam-palace", "madinah"),
  umrahHotel("taibah-comfort-inn", "madinah"),
];

export const getUmrahHotel = (id: string) => UMRAH_HOTELS.find((h) => h.id === id);
export const getUmrahFlight = (id: string) => UMRAH_FLIGHTS.find((f) => f.id === id);
export const getUmrahTransfer = (id: string) => UMRAH_TRANSFERS.find((t) => t.id === id);
export const getUmrahExtra = (id: string) => UMRAH_EXTRAS.find((e) => e.id === id);

export const MEAL_SHORT: Record<string, string> = { room_only: "Room only", breakfast: "Breakfast", half_board: "Half board", full_board: "Full board" };

export const CATEGORY_LABEL: Record<UmrahCategory, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium", luxury: "Luxury" };
export const ROOM_LABEL: Record<UmrahRoomType, { label: string; sub: string }> = {
  quad: { label: "Quad room", sub: "Up to 4 sharing — best value" },
  triple: { label: "Triple room", sub: "3 sharing — more space" },
  double: { label: "Double room", sub: "2 sharing — most privacy" },
};

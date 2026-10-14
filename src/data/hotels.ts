import hotels from "./json/HOTELS.json";
import destinations from "./json/DESTINATIONS.json";
import img from "./json/IMG.json";
import amenityLabels from "./json/AMENITY_LABELS.json";

/** 28 hotels. Generated deterministically by the original site; the snapshot is exact (no date dependence). */
export type Hotel = (typeof hotels)[number];
export type HotelRoom = Hotel["rooms"][number];
export type RatePlan = Hotel["ratePlans"][number] & { freeCancelDaysBefore?: number };
export type Destination = (typeof destinations)[number];

export const HOTELS = hotels as Hotel[];
export const DESTINATIONS = destinations as Destination[];
/** Image registry: key → `/images/<file>.jpg`. */
export const IMG = img as Record<string, string>;
export const AMENITY_LABELS = amenityLabels as Record<string, string>;

export const getDestination = (id: string) => DESTINATIONS.find((d) => d.id === id);
export const getHotel = (id: string) => HOTELS.find((h) => h.id === id);

const CITY_IMAGE: Record<string, string> = {
  Dubai: IMG.dubaiSkyline,
  London: IMG.londonBigBen,
  Manchester: IMG.londonStreet,
  Istanbul: IMG.istanbulGalata,
  Jeddah: IMG.jeddahCorniche,
  Madinah: IMG.madinahNabawi,
  Makkah: IMG.makkahClock,
  "Abu Dhabi": IMG.abuDhabiMosque,
  Paris: IMG.londonThames,
  Doha: IMG.airSunset,
};

export function cityImage(city: string): string {
  return CITY_IMAGE[city] ?? IMG.airWing;
}

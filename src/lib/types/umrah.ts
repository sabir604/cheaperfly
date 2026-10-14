export type UmrahCategory = "essential" | "comfort" | "premium" | "luxury";
export type UmrahRoomType = "quad" | "triple" | "double";

export interface UmrahHotel {
  id: string;
  name: string;
  city: "makkah" | "madinah";
  stars: number;
  /** Walking distance to the Haram / Masjid an-Nabawi, metres. */
  distanceM: number;
  image: string;
  amenities: string[];
  perNightPerPerson: number;
  rating: number;
}

export interface UmrahFlightOption {
  id: string;
  label: string;
  airline: string;
  airlineCode: string;
  route: string;
  stops: number;
  baggage: string;
  priceDelta: number;
}

export interface UmrahTransferOption {
  id: string;
  label: string;
  description: string;
  vehicle: string;
  priceDelta: number;
  includes: string[];
}

export interface UmrahExtra {
  id: string;
  label: string;
  description: string;
  price: number;
  /** Charged once per booking instead of per traveller. */
  perGroup?: boolean | null;
}

export interface UmrahDeparture {
  date: string;
  seatsLeft: number;
  priceFactor: number;
  label?: string;
}

export interface UmrahItineraryDay {
  day: number;
  title: string;
  location: string;
  summary: string;
  items: string[];
  meals: string;
}

/** Raw package definition, as authored in the original source. */
export interface UmrahPackageDef {
  slug: string;
  name: string;
  tagline: string;
  category: UmrahCategory;
  /** Nights in Makkah / Madinah. */
  mk: number;
  md: number;
  makkah: string;
  madinah: string;
  makkahOptions: string[];
  madinahOptions: string[];
  base: number;
  meal: string;
  mealLabel: string;
  images: string[];
  rating: number;
  reviews: number;
  group: string;
  flights: string[];
  transfers: string[];
  defaultTransfer: string;
  highlights: string[];
  /** First departure is this many days from today; then every depGap (+0–2) days, depCount times. */
  depStart: number;
  depGap: number;
  depCount: number;
  makkahFirst?: boolean;
}

export interface UmrahPackage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: UmrahCategory;
  nights: number;
  makkahNights: number;
  madinahNights: number;
  departureCities: string[];
  images: string[];
  makkahHotelId: string;
  madinahHotelId: string;
  makkahHotelOptions: string[];
  madinahHotelOptions: string[];
  flightOptionIds: string[];
  transferOptionIds: string[];
  defaultTransferId: string;
  meal: string;
  mealLabel: string;
  basePerPerson: number;
  roomDelta: Record<UmrahRoomType, number>;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  important: string[];
  itinerary: UmrahItineraryDay[];
  departures: UmrahDeparture[];
  rating: number;
  reviewCount: number;
  groupSize: string;
  guide: string;
}

export interface UmrahConfig {
  departureDate: string;
  departureCity: string;
  roomType: UmrahRoomType;
  makkahHotelId: string;
  madinahHotelId: string;
  flightId: string;
  transferId: string;
  extraIds: string[];
  adults: number;
  children: number;
  infants: number;
}

export interface UmrahPricingInput {
  pkg: UmrahPackage;
  config: UmrahConfig;
  makkahHotel: UmrahHotel;
  madinahHotel: UmrahHotel;
  defaultMakkah: UmrahHotel;
  defaultMadinah: UmrahHotel;
  flight: UmrahFlightOption;
  transfer: UmrahTransferOption;
  defaultTransfer: UmrahTransferOption;
  extras: UmrahExtra[];
}

export interface UmrahSearchCriteria {
  departureCity?: string;
  /** Target length; packages within ±1 night match. "any" disables the filter. */
  nights?: string;
  /** "YYYY-MM" or "any". */
  month?: string;
}

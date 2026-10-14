export type Cabin = "economy" | "premium_economy" | "business" | "first";
export type TripType = "return" | "oneway" | "multicity";
export type FareStyle = "legacy" | "light" | "lowcost";
export type SeatSelection = "paid" | "standard_free" | "premium_free" | string;

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  tz: string;
  terminals: string[];
  popular: boolean;
}

export interface AirportGroup {
  code: string;
  city: string;
  country: string;
  airports: string[];
}

/** One row in the airport autocomplete: a single airport or an "All <city> airports" group. */
export interface AirportSuggestion {
  kind: "airport" | "group";
  code: string;
  city: string;
  country: string;
  name: string;
  iata: string;
}

export interface AirportSuggestionGroup {
  city: string;
  country: string;
  items: AirportSuggestion[];
}

export interface Airline {
  code: string;
  name: string;
  numeric: string;
  color: string;
  hubs: string[];
  priceFactor: number;
  /** Cruise speed in km/h, used to derive block times. */
  speed: number;
  style: FareStyle;
  fareNames: string[];
  aircraftLong: string[];
  aircraftShort: string[];
  terminalPref: Record<string, string>;
  /** Scheduled departure times ("HH:mm") the generator picks from. */
  slots: string[];
  flightNo: [number, number];
  weight: number;
}

export interface CheckedBag {
  pieces: number;
  kg: number;
}

export interface FareTemplate {
  mult: number;
  cabinBag: string;
  checkedBag: CheckedBag;
  seatSelection: SeatSelection;
  changeFee: number | null;
  refundFee: number | null;
  meal: boolean;
  perks: string[];
}

export interface SearchLeg {
  from: string;
  to: string;
  date: string;
}

export interface Pax {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightCriteria {
  trip: TripType;
  legs: SearchLeg[];
  pax: Pax;
  cabin: Cabin;
}

export interface Segment {
  id: string;
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  aircraft: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  fromName: string;
  toName: string;
  departLocal: string;
  arriveLocal: string;
  durationMin: number;
  terminalFrom: string;
  terminalTo: string;
  cabin: Cabin;
}

export interface Layover {
  airport: string;
  city: string;
  durationMin: number;
  overnight: boolean;
}

export interface FlightLeg {
  id: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  departLocal: string;
  arriveLocal: string;
  durationMin: number;
  stops: number;
  segments: Segment[];
  layovers: Layover[];
  arrivalDayOffset: number;
}

export interface Fare {
  id: string;
  name: string;
  tier: number;
  farePerAdult: number;
  taxPerAdult: number;
  cabinBag: string;
  checkedBag: CheckedBag;
  seatSelection: SeatSelection;
  changeFee: number | null;
  refundFee: number | null;
  meal: boolean;
  perks: string[];
}

export interface Offer {
  id: string;
  airlineCode: string;
  airlineName: string;
  cabin: Cabin;
  legs: FlightLeg[];
  fares: Fare[];
  seatsLeft?: number;
  co2Kg: number;
  refundable: boolean;
  checkedBagIncluded: boolean;
  totalDurationMin: number;
}

export interface DatePrice {
  date: string;
  returnDate?: string;
  price: number | null;
  fare?: number;
  tax?: number;
}

export interface FlightSearchResult {
  searchId: string;
  criteria: FlightCriteria;
  offers: Offer[];
  datePrices: DatePrice[];
  generatedAt: string;
}

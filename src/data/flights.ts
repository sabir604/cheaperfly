import airports from "./json/AIRPORTS.json";
import airportGroups from "./json/AIRPORT_GROUPS.json";
import airlines from "./json/AIRLINES.json";
import styleTemplates from "./json/STYLE_TEMPLATES.json";
import premiumCabinTemplates from "./json/PREMIUM_CABIN_TEMPLATES.json";
import cabinLabel from "./json/CABIN_LABEL.json";
import cabinMult from "./json/CABIN_MULT.json";
import type { Airline, Airport, AirportGroup, Cabin, FareStyle, FareTemplate } from "@/lib/types/flights";

/** 58 airports, in the original source order (search tie-breaks depend on it). */
export const AIRPORTS = airports as unknown as Airport[];
/** Multi-airport cities. `LON`, `PAR`, `NYC` are searchable codes; `IST*` / `DXB*` mean "any airport". */
export const AIRPORT_GROUPS = airportGroups as unknown as Record<string, AirportGroup>;
export const AIRLINES = airlines as unknown as Airline[];
export const AIRLINE_MAP: Record<string, Airline> = Object.fromEntries(AIRLINES.map((a) => [a.code, a]));
export const STYLE_TEMPLATES = styleTemplates as unknown as Record<FareStyle, FareTemplate[]>;
export const PREMIUM_CABIN_TEMPLATES = premiumCabinTemplates as unknown as Record<Exclude<Cabin, "economy">, FareTemplate[]>;
export const CABIN_LABEL = cabinLabel as unknown as Record<Cabin, string>;
export const CABIN_MULT = cabinMult as unknown as Record<Cabin, number>;

/** UK departure airports each airline actually serves; non-UK airports are unrestricted. */
export const UK_GATEWAYS: Record<string, string[]> = {
  EK: ["LHR", "LGW", "MAN", "BHX", "EDI", "GLA"],
  BA: ["LHR"],
  QR: ["LHR", "MAN", "BHX", "EDI"],
  EY: ["LHR", "MAN"],
  TK: ["LHR", "LGW", "STN", "MAN", "BHX", "EDI", "GLA"],
  SV: ["LHR", "MAN"],
  VS: ["LHR", "MAN"],
  FZ: ["LGW", "STN", "MAN", "BHX"],
  GF: ["LHR"],
  LH: ["LHR", "LGW", "MAN", "BHX", "EDI"],
  AF: ["LHR", "LCY", "MAN", "EDI", "BHX"],
  KL: ["LHR", "LCY", "MAN", "BHX", "EDI", "GLA"],
};

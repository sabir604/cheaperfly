import { AIRPORTS, AIRPORT_GROUPS } from "@/data/flights";
import type { Airport, AirportSuggestionGroup } from "@/lib/types/flights";

const byIata = new Map(AIRPORTS.map((a) => [a.iata, a]));

/** Codes that are searchable as a whole city without the `*` suffix. */
const METRO_CODES = new Set(["LON", "PAR", "NYC"]);

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

/** City name for an airport, metro code (`LON`) or any-airport code (`IST*`). */
export function airportCityOf(code: string): string {
  if (code.endsWith("*")) return AIRPORT_GROUPS[code.slice(0, -1)]?.city ?? code;
  if (METRO_CODES.has(code)) return AIRPORT_GROUPS[code].city;
  return getAirport(code)?.city ?? code;
}

/** Expands a search code into concrete airport codes: `LON` → LHR, LGW…; `IST*` → IST, SAW. */
export function resolveAirportCodes(code: string): string[] {
  const group = AIRPORT_GROUPS[code.toUpperCase()];
  if (code.endsWith("*")) {
    const g = AIRPORT_GROUPS[code.slice(0, -1).toUpperCase()];
    return g ? g.airports : [code.slice(0, -1)];
  }
  return group && METRO_CODES.has(code) ? group.airports : [code.toUpperCase()];
}

function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Autocomplete: matches IATA code, city, airport name or country, ranks exact code first,
 * groups by city, and prepends an "All <city> airports" row for multi-airport cities.
 * With an empty query it returns popular airports.
 */
export function searchAirports(query: string, limit = 8): AirportSuggestionGroup[] {
  const q = fold(query.trim());
  const matches = AIRPORTS.filter((a) =>
    q
      ? a.iata.toLowerCase() === q ||
        a.iata.toLowerCase().startsWith(q) ||
        fold(a.city).includes(q) ||
        fold(a.name).includes(q) ||
        fold(a.country).includes(q)
      : !!a.popular,
  );
  const rank = (a: Airport) =>
    a.iata.toLowerCase() === q
      ? 0
      : fold(a.city).startsWith(q)
        ? 1
        : a.iata.toLowerCase().startsWith(q)
          ? 2
          : fold(a.name).startsWith(q)
            ? 3
            : 4 + Number(!a.popular);
  const ranked = [...matches].sort((a, b) => rank(a) - rank(b) || a.city.localeCompare(b.city)).slice(0, 2 * limit);

  const groups = new Map<string, AirportSuggestionGroup>();
  for (const a of ranked) {
    if (!groups.has(a.city)) groups.set(a.city, { city: a.city, country: a.country, items: [] });
    groups.get(a.city)!.items.push({ kind: "airport", code: a.iata, city: a.city, country: a.country, name: a.name, iata: a.iata });
  }
  for (const g of groups.values()) {
    const metro = Object.values(AIRPORT_GROUPS).find((m) => m.city === g.city);
    const airportsInCity = AIRPORTS.filter((a) => a.city === g.city).length;
    if (metro && airportsInCity > 1 && g.items.length > 0) {
      const code = METRO_CODES.has(metro.code) ? metro.code : `${metro.code}*`;
      g.items.unshift({ kind: "group", code, city: g.city, country: g.country, name: `All ${g.city} airports`, iata: metro.code });
    }
  }
  return Array.from(groups.values()).slice(0, limit);
}

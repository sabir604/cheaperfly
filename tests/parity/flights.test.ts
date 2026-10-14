import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { generateOffers, generateSearch } from "@/lib/engine/flights/offers";
import { searchAirports, resolveAirportCodes, airportCityOf } from "@/lib/engine/airports";
import { createRng, hashString } from "@/lib/engine/rng";
import type { Cabin, FlightCriteria, TripType } from "@/lib/types/flights";
import { archiveAvailable, freezeClock, original, plain } from "./original";

const d = describe.skipIf(!archiveAvailable);

function crit(trip: TripType, legs: [string, string, string][], cabin: Cabin = "economy", adults = 1): FlightCriteria {
  return { trip, legs: legs.map(([from, to, date]) => ({ from, to, date })), pax: { adults, children: 0, infants: 0 }, cabin };
}

const CASES: FlightCriteria[] = [
  crit("return", [["LON", "DXB", "2026-10-16"], ["DXB", "LON", "2026-10-23"]]),
  crit("oneway", [["MAN", "JED", "2026-11-05"]]),
  crit("return", [["LON", "IST*", "2026-10-16"], ["IST*", "LON", "2026-10-23"]], "business"),
  crit("return", [["BHX", "JED", "2026-10-16"], ["JED", "BHX", "2026-10-23"]]),
  crit("return", [["LON", "BKK", "2026-10-16"], ["BKK", "LON", "2026-10-23"]], "premium_economy"),
  crit("oneway", [["EDI", "DOH", "2026-09-27"]], "first"),
  crit("return", [["GLA", "CAI", "2027-03-01"], ["CAI", "GLA", "2027-03-15"]]),
  crit("multicity", [["LON", "DXB", "2026-10-16"], ["DXB", "IST*", "2026-10-20"], ["IST*", "LON", "2026-10-25"]], "premium_economy"),
  crit("oneway", [["LHR", "MED", "2026-12-20"]]),
  crit("return", [["LON", "PAR", "2026-11-01"], ["PAR", "LON", "2026-11-03"]]),
];

d("flight engine parity with the original", () => {
  beforeAll(() => freezeClock());
  afterAll(() => vi.useRealTimers());

  it("rng matches", () => {
    const ours = createRng("sched-EK-LHR-DXB");
    const theirs = original("createRng")("sched-EK-LHR-DXB");
    for (let i = 0; i < 50; i++) expect(ours.next()).toBe(theirs.next());
    expect(hashString("i am a seed")).toBe(original("hashString")("i am a seed"));
  });

  it("airport search, codes and cities match", () => {
    for (const q of ["", "l", "lon", "dub", "jed", "ist", "par", "new", "ka", "Türk", "zz", "heath"]) {
      expect(plain(searchAirports(q))).toEqual(plain(original("searchAirports")(q)));
    }
    for (const c of ["LON", "IST*", "DXB*", "LHR", "PAR", "NYC", "JED"]) {
      expect(resolveAirportCodes(c)).toEqual(original("resolveAirportCodes")(c));
      expect(airportCityOf(c)).toBe(original("airportCityOf")(c));
    }
  });

  it.each(CASES.map((c) => [`${c.trip} ${c.legs.map((l) => `${l.from}-${l.to}`).join(" ")} ${c.cabin}`, c]))(
    "offers match: %s",
    (_, c) => {
      expect(plain(generateOffers(c))).toEqual(plain(original("generateOffers")(c)));
    },
  );

  it("search result (with ±3 day price strip) matches", () => {
    const c = CASES[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { generatedAt: _a, ...ours } = generateSearch(c);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { generatedAt: _b, ...theirs } = original("generateSearch")(c);
    expect(plain(ours)).toEqual(plain(theirs));
    expect(ours.offers).toHaveLength(33);
    expect(ours.offers[0].id).toBe("i4b5t.EK1");
    expect(ours.offers[0].fares.map((f) => f.farePerAdult + f.taxPerAdult)).toEqual([556, 678, 852]);
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { HOTELS, DESTINATIONS } from "@/data/hotels";
import { UMRAH_HOTELS } from "@/data/umrah";
import { generateHotelSearch, bestQuote, quoteRoom, applyHotelFilters, sortHotelRows, EMPTY_HOTEL_FILTERS } from "@/lib/engine/hotels";
import { getUmrahPackages, defaultUmrahConfig, resolveUmrahPricingInput, packageFromPrice } from "@/lib/engine/umrah";
import { calcFlightPricing, calcHotelPricing, calcUmrahPricing, fareTripTotal } from "@/lib/engine/pricing";
import { generateOffers } from "@/lib/engine/flights/offers";
import { buildSeatMap } from "@/lib/engine/flights/seatmap";
import { formatCurrency, toCurrency, CURRENCIES } from "@/lib/engine/currency";
import type { CurrencyCode } from "@/lib/engine/currency";
import type { FlightCriteria } from "@/lib/types/flights";
import { archiveAvailable, freezeClock, original, plain, CAPTURE_NOW } from "./original";

const d = describe.skipIf(!archiveAvailable);
const currencies = CURRENCIES.map((c) => c.code) as CurrencyCode[];

d("hotel engine parity", () => {
  beforeAll(() => freezeClock());
  afterAll(() => vi.useRealTimers());

  it("hotel records equal the original", () => {
    expect(plain(HOTELS)).toEqual(plain(original("HOTELS")));
    expect(plain(DESTINATIONS)).toEqual(plain(original("DESTINATIONS")));
  });

  const stays = [
    ["2026-10-11", "2026-10-15", 1, 2, 0],
    ["2026-12-20", "2027-01-03", 2, 4, 2],
    ["2027-02-25", "2027-03-05", 1, 3, 1],
    ["2026-07-01", "2026-07-02", 1, 1, 0],
    ["2026-09-26", "2026-09-30", 3, 6, 0],
  ] as const;

  it.each(DESTINATIONS.flatMap((dest) => stays.map((s) => [dest.id, ...s] as const)))(
    "search matches: %s %s→%s rooms=%d adults=%d children=%d",
    (destination, checkIn, checkOut, rooms, adults, children) => {
      const c = { destination, checkIn, checkOut, occupancy: { rooms, adults, children, childAges: [] } };
      expect(plain(generateHotelSearch(c))).toEqual(plain(original("generateHotelSearch")(c)));
    },
  );

  it("every room and rate plan quote matches", () => {
    const c = { checkIn: "2027-02-20", checkOut: "2027-03-02", occupancy: { rooms: 1, adults: 2, children: 0, childAges: [] } };
    for (const h of HOTELS)
      for (const r of h.rooms)
        for (const p of h.ratePlans) expect(plain(quoteRoom(h, r, p.id, c))).toEqual(plain(original("quoteRoom")(h, r, p.id, c)));
  });

  it("filters and sorting match", () => {
    const c = { destination: "dubai", checkIn: "2026-11-10", checkOut: "2026-11-14", occupancy: { rooms: 1, adults: 2, children: 0, childAges: [] } };
    const f = { ...EMPTY_HOTEL_FILTERS, stars: [4, 5], meals: ["breakfast" as const], freeCancellation: true, maxPrice: 400 };
    const ours = applyHotelFilters(HOTELS, c, f);
    expect(plain(ours)).toEqual(plain(original("applyHotelFilters")(HOTELS, c, f)));
    for (const sort of ["recommended", "price", "rating", "distance"] as const) {
      const ids = HOTELS.map((h) => h.id).reverse();
      expect(plain(sortHotelRows(ours, sort, ids))).toEqual(plain(original("sortHotelRows")(ours, sort, ids)));
    }
    expect(plain(bestQuote(HOTELS[0], c, { meals: ["room_only"] }))).toEqual(plain(original("bestQuote")(HOTELS[0], c, { meals: ["room_only"] })));
  });
});

d("umrah engine parity", () => {
  beforeAll(() => freezeClock());
  afterAll(() => vi.useRealTimers());

  it("umrah hotels and packages equal the original", () => {
    expect(plain(UMRAH_HOTELS)).toEqual(plain(original("UMRAH_HOTELS")));
    expect(plain(getUmrahPackages())).toEqual(plain(original("getUmrahPackages")()));
  });

  it("packages match on other days too", () => {
    for (const day of ["2026-12-01T09:00:00", "2027-02-20T09:00:00", "2027-06-01T09:00:00"]) {
      vi.setSystemTime(new Date(day));
      expect(plain(getUmrahPackages())).toEqual(plain(original("getUmrahPackages")()));
    }
    vi.setSystemTime(CAPTURE_NOW);
  });

  it("pricing for every package, room, hotel, flight, transfer and currency matches", () => {
    const theirsPkgs = original("getUmrahPackages")();
    getUmrahPackages().forEach((pkg, i) => {
      const theirsPkg = theirsPkgs[i];
      for (const roomType of ["quad", "triple", "double"] as const)
        for (const makkahHotelId of pkg.makkahHotelOptions)
          for (const flightId of pkg.flightOptionIds)
            for (const transferId of pkg.transferOptionIds) {
              const overrides = { roomType, makkahHotelId, flightId, transferId, adults: 2, children: 1, infants: 1, extraIds: ["ziyarat-makkah", "scholar"] };
              const cfg = defaultUmrahConfig(pkg, overrides);
              expect(cfg).toEqual(original("defaultUmrahConfig")(theirsPkg, overrides));
              for (const cur of currencies)
                for (const member of [false, true])
                  expect(plain(calcUmrahPricing(resolveUmrahPricingInput(pkg, cfg), cur, member))).toEqual(
                    plain(original("calcUmrahPricing")(original("resolveUmrahPricingInput")(theirsPkg, cfg), cur, member)),
                  );
            }
      for (const cur of currencies) expect(packageFromPrice(pkg, cur)).toBe(original("packageFromPrice")(theirsPkg, cur));
    });
  });
});

d("pricing, currency and seat map parity", () => {
  beforeAll(() => freezeClock());
  afterAll(() => vi.useRealTimers());

  const criteria: FlightCriteria = {
    trip: "return",
    legs: [
      { from: "LON", to: "DXB", date: "2026-10-16" },
      { from: "DXB", to: "LON", date: "2026-10-23" },
    ],
    pax: { adults: 2, children: 1, infants: 1 },
    cabin: "economy",
  };

  it("currency conversion and formatting match", () => {
    for (const cur of currencies)
      for (const amount of [0, 9, 556, 1302.4, 98765]) {
        expect(toCurrency(amount, cur)).toBe(original("toCurrency")(amount, cur));
        expect(formatCurrency(amount, cur)).toBe(original("formatCurrency")(amount, cur));
        expect(formatCurrency(amount, cur, { decimals: 2 })).toBe(original("formatCurrency")(amount, cur, { decimals: 2 }));
      }
  });

  it("flight pricing matches for every offer, fare, currency and member flag", () => {
    const extras = {
      baggage: { "adult-1": { "0": "bag10", "1": "bag20" }, "child-1": { "0": "bag5" } },
      seats: { segA: { "adult-1": { seat: "35A", price: 24, kind: "standard" } }, segB: { "adult-2": { seat: "40G", price: 58, kind: "extra_legroom" } } },
    };
    for (const offer of generateOffers(criteria))
      for (const fare of offer.fares)
        for (const cur of currencies)
          for (const member of [false, true]) {
            const input = { offer, fareId: fare.id, pax: criteria.pax, extras };
            expect(plain(calcFlightPricing(input, cur, member))).toEqual(plain(original("calcFlightPricing")(input, cur, member)));
            expect(fareTripTotal(fare, criteria.pax, cur)).toBe(original("fareTripTotal")(fare, criteria.pax, cur));
          }
  });

  it("the recorded flight booking totals £721", () => {
    const offer = generateOffers({ ...criteria, pax: { adults: 1, children: 0, infants: 0 } })[0];
    const extras = { baggage: { "adult-1": { "0": "bag10" } }, seats: {} };
    const p = calcFlightPricing({ offer, fareId: "EK-2", pax: { adults: 1, children: 0, infants: 0 }, extras }, "GBP", false);
    expect(p.total).toBe(721);
  });

  it("hotel pricing matches", () => {
    for (const cur of currencies)
      for (const member of [false, true]) {
        const input = { perNight: 219, nights: 4, rooms: 2, roomName: "Deluxe King Room", ratePlanName: "Breakfast included" };
        expect(plain(calcHotelPricing(input, cur, member))).toEqual(plain(original("calcHotelPricing")(input, cur, member)));
      }
  });

  it("seat maps match for every segment and seat rule", () => {
    const offers = [
      ...generateOffers(criteria),
      ...generateOffers({ ...criteria, cabin: "business" }),
      ...generateOffers({ ...criteria, cabin: "premium_economy" }),
      ...generateOffers({ ...criteria, legs: [{ from: "LON", to: "PAR", date: "2026-11-01" }], trip: "oneway" }),
    ];
    const buildOriginal = original("flightService").getSeatMap as (s: unknown, f: unknown) => Promise<unknown>;
    return (async () => {
      vi.useRealTimers(); // the original sleeps 350ms per call
      for (const offer of offers.slice(0, 12))
        for (const seg of offer.legs.flatMap((l) => l.segments))
          for (const fare of offer.fares) {
            const theirs = await buildOriginal(seg, fare);
            expect(plain(buildSeatMap(seg, fare))).toEqual(plain(theirs));
          }
      freezeClock();
    })();
  }, 600_000);
});

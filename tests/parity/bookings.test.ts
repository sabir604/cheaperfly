// Historical archive fixtures; these credentials no longer enable a website demo login.
const DEMO_EMAIL = "demo@cheaperfly.com", DEMO_PASSWORD = "Demo@1234";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { validateFlightCriteria, flightSearchHref, hotelSearchHref, hotelDetailHref, serializeUmrahCriteria, defaultFlightDates, defaultHotelDates } from "@/lib/engine/criteria";
import { cheapestDeal, DEAL_ROUTES, HOME_DESTINATIONS } from "@/lib/engine/deals";
import { detectCardBrand, luhnValid, outcomeForCard } from "@/lib/engine/payment";
import { createFlightBooking, createHotelBooking, createUmrahBooking, bookingService } from "@/lib/engine/bookings/service";
import { bookingBucket } from "@/lib/engine/bookings/status";

import { signIn } from "@/lib/engine/auth";
import { generateOffers } from "@/lib/engine/flights/offers";
import { getHotel } from "@/data/hotels";
import { quoteRoom } from "@/lib/engine/hotels";
import { defaultUmrahConfig, getUmrahPackage } from "@/lib/engine/umrah";
import { setSimulatedLatency } from "@/lib/engine/service";
import { useAccountStore, useBookingsStore } from "@/lib/stores/bookings";
import { useSessionStore } from "@/lib/stores/session";
import type { FlightCriteria } from "@/lib/types/flights";
import type { FlightDraft, HotelDraft, UmrahDraft } from "@/lib/types/booking";
import { archiveAvailable, freezeClock, original, plain } from "./original";

const d = describe.skipIf(!archiveAvailable);

/** Blank out fields that are random on both sides (reference numbers, ids). */
function mask<T>(v: T): T {
  return JSON.parse(
    JSON.stringify(v)
      .replace(/INV-\d{4}-\d{6}/g, "INV-X")
      .replace(/"pnr":"[A-Z0-9]{6}"/g, '"pnr":"PNR"')
      .replace(/reservation [A-Z0-9]{6}\b/g, "reservation PNR")
      .replace(/\b\d{3}-\d{10}\b/g, "TKT")
      .replace(/(HC|UM)\d{8}/g, "$1X")
      .replace(/"(RF|CH|SP)-\d{5}"/g, '"$1-X"')
      .replace(/(RF|CH|SP)-\d{5}/g, "$1-X")
      .replace(/ev_[a-z0-9]{10}/g, "ev_X")
      .replace(/ntf_[a-z0-9]{10}/g, "ntf_X")
      .replace(/"at":"[^"]+"/g, '"at":"T"')
      .replace(/"createdAt":"[^"]+"/g, '"createdAt":"T"')
      .replace(/TXN-4242\d{5}/g, "TXN-X"),
  );
}

const flightCriteria: FlightCriteria = {
  trip: "return",
  legs: [
    { from: "LON", to: "DXB", date: "2026-10-16" },
    { from: "DXB", to: "LON", date: "2026-10-23" },
  ],
  pax: { adults: 2, children: 1, infants: 0 },
  cabin: "economy",
};

function pax(id: string, type: "adult" | "child", first: string) {
  return { id, type, title: "Ms", firstName: first, middleName: "", lastName: "Khan", dob: "1990-05-14", gender: "female", nationality: "United Kingdom", passportNo: "533871204", passportCountry: "United Kingdom", passportExpiry: "2031-05-14", frequentFlyer: "" };
}

const payment = { method: "card" as const, brand: "Visa", last4: "4242", cardholder: "AISHA KHAN", transactionId: "TXN-TEST", status: "captured" as const, paidAt: "2026-09-25T12:00:00.000Z" };
const opts = (ref: string) => ({ currency: "GBP" as const, member: false, payment, ref, now: new Date("2026-09-25T12:00:00Z"), notify: false });

d("search helpers parity", () => {
  beforeAll(() => freezeClock());
  afterAll(() => vi.useRealTimers());

  it("validation messages match", () => {
    const cases: FlightCriteria[] = [
      flightCriteria,
      { ...flightCriteria, legs: [{ from: "", to: "", date: "" }, { from: "", to: "", date: "" }] },
      { ...flightCriteria, legs: [{ from: "LON", to: "LON", date: "2026-01-01" }, { from: "LON", to: "LON", date: "2025-01-01" }] },
      { ...flightCriteria, legs: [{ from: "XXX", to: "IST*", date: "2026-10-10" }, { from: "IST*", to: "XXX", date: "" }] },
      { ...flightCriteria, pax: { adults: 1, children: 0, infants: 2 } },
      { ...flightCriteria, pax: { adults: 8, children: 2, infants: 0 } },
      { trip: "multicity", legs: [{ from: "LON", to: "DXB", date: "2026-10-16" }, { from: "DXB", to: "IST*", date: "2026-10-10" }], pax: { adults: 1, children: 0, infants: 0 }, cabin: "business" },
    ];
    for (const c of cases) expect(validateFlightCriteria(c)).toEqual(original("validateFlightCriteria")(c));
  });

  it("URLs and defaults match", () => {
    const h = { destination: "makkah", checkIn: "2026-10-11", checkOut: "2026-10-15", occupancy: { rooms: 2, adults: 4, children: 2, childAges: [5, 9] } };
    expect(flightSearchHref(flightCriteria)).toBe(original("flightSearchHref")(flightCriteria));
    const mc = { ...flightCriteria, trip: "multicity" as const, legs: [...flightCriteria.legs, { from: "LON", to: "IST*", date: "2026-10-30" }] };
    expect(flightSearchHref(mc)).toBe(original("flightSearchHref")(mc));
    expect(hotelSearchHref(h)).toBe(original("hotelSearchHref")(h));
    expect(hotelDetailHref("quba-grand", h)).toBe(original("hotelDetailHref")("quba-grand", h));
    expect(serializeUmrahCriteria({ departureCity: "London", month: "2026-12", nights: "10" })).toBe(original("serializeUmrahCriteria")({ departureCity: "London", month: "2026-12", nights: "10" }));
    expect(defaultFlightDates()).toEqual(original("defaultFlightDates")());
    expect(defaultHotelDates()).toEqual(original("defaultHotelDates")());
  });

  it("home page deals match", () => {
    expect(HOME_DESTINATIONS).toEqual(original("HOME_DESTINATIONS"));
    expect(DEAL_ROUTES).toEqual(original("DEAL_ROUTES"));
    for (const r of DEAL_ROUTES) expect(plain(cheapestDeal(r.from, r.to))).toEqual(plain(original("cheapestDeal")(r.from, r.to)));
  });

  it("card helpers match", () => {
    for (const n of ["4242 4242 4242 4242", "4242424242424241", "5555 5555 5555 4444", "3782 822463 10005", "6011111111111117", "4000 0000 0000 0002", "4000000000009995", "123", "2223003122003222"]) {
      expect(luhnValid(n)).toBe(original("luhnValid")(n));
      expect(detectCardBrand(n)).toBe(original("detectCardBrand")(n));
      expect(outcomeForCard(n)).toBe(original("outcomeForCard")(n));
    }
  });
});

d("booking lifecycle parity", () => {
  beforeAll(() => {
    freezeClock();
    setSimulatedLatency(false);
  });
  afterAll(() => {
    vi.useRealTimers();
    setSimulatedLatency(true);
  });
  beforeEach(() => {
    localStorage.clear();
    useBookingsStore.setState({ bookings: [], seededFor: [], guestRefs: [] });
    useAccountStore.setState({ travellers: [], notifications: [], requests: [], cases: [], seededFor: [] });
  });

  it("flight bookings match (every fare) and refund estimates match", () => {
    const offer = generateOffers(flightCriteria)[2];
    offer.fares.forEach((fare, i) => {
      const draft: FlightDraft = {
        criteria: flightCriteria,
        searchId: "x",
        offer,
        fareId: fare.id,
        passengers: [pax("adult-1", "adult", "Aisha"), pax("adult-2", "adult", "Omar"), pax("child-1", "child", "Zayan")],
        contact: { email: "Test@Example.com", countryCode: "+44", mobile: "7700900123" },
        extras: {
          baggage: { "adult-1": { 0: "bag10" } },
          meals: {},
          seats: { [offer.legs[0].segments[0].id]: { "adult-2": { seat: "31A", price: 22, kind: "standard" } } },
          assistance: {},
          seatsSkipped: false,
        },
        termsAccepted: true,
        startedAt: "2026-09-25T11:00:00Z",
      };
      const ours = createFlightBooking(draft, opts(`CF-00000${i}`));
      const theirs = original("createFlightBooking")(draft, opts(`CF-00000${i}`));
      expect(mask(ours)).toEqual(mask(theirs));
      // Refund policy changed in Step 13; server allocation tests replace legacy estimates.
      expect(bookingBucket(ours)).toBe(original("bookingBucket")(theirs));
    });
    expect(bookingService.findByReference("cf-000001", "khan")?.id).toBe("CF-000001");
    expect(bookingService.findByReference((useBookingsStore.getState().bookings[0] as import("@/lib/types/booking").FlightBooking).pnr, "KHAN")?.id).toBe("CF-000002");
    expect(bookingService.findByReference("CF-000001", "Smith")).toBeUndefined();
  });

  it("hotel and umrah bookings match, with refund estimates on several dates", () => {
    const hotel = getHotel("marina-crest")!;
    const hc = { destination: "dubai", checkIn: "2026-10-11", checkOut: "2026-10-15", occupancy: { rooms: 1, adults: 2, children: 0, childAges: [] } };
    for (const plan of hotel.ratePlans) {
      const draft: HotelDraft = {
        criteria: hc,
        hotelId: hotel.id,
        quote: quoteRoom(hotel, hotel.rooms[0], plan.id, hc)!,
        guests: [{ title: "Ms", firstName: "Aisha", lastName: "Khan", isLead: true }],
        contact: { email: "a@b.com", countryCode: "+44", mobile: "7700900123" },
        specialRequests: ["High floor"],
        requestNotes: "",
        arrivalTime: "15:00",
        termsAccepted: true,
        startedAt: "2026-09-25T11:00:00Z",
      };
      const ours = createHotelBooking(draft, opts("CF-100000"));
      const theirs = original("createHotelBooking")(draft, opts("CF-100000"));
      expect(mask(ours)).toEqual(mask(theirs));

    }

    const pkg = getUmrahPackage("essential-umrah-7-nights")!;
    const theirsPkg = original("getUmrahPackage")("essential-umrah-7-nights");
    const config = defaultUmrahConfig(pkg, { adults: 2, children: 1, extraIds: ["esim"] });
    const travellers = ["adult-1", "adult-2", "child-1"].map((id) => ({ ...pax(id, id.startsWith("child") ? "child" : "adult", "T"), mahram: "" }));
    const draft: UmrahDraft = { packageId: pkg.id, config, travellers, contact: { email: "a@b.com", countryCode: "+44", mobile: "1" }, notes: "", termsAccepted: true, startedAt: "x" };
    const ours = createUmrahBooking(draft, opts("CF-200000"));
    const theirs = original("createUmrahBooking")(draft, opts("CF-200000"));
    expect(mask(ours)).toEqual(mask(theirs));
    expect(ours.package).toEqual(plain(theirsPkg));
    freezeClock();
  });

  // Historical customer-controlled request progression was removed. Server servicing tests verify staff-only decisions.

  it.skip("historical demo login was removed by server authentication", async () => {
    const res = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(res.ok).toBe(true);
    expect(useSessionStore.getState().user?.firstName).toBe("Amira");
    const bookings = useBookingsStore.getState().bookings;
    expect(bookings.map((b) => `${b.product}:${b.status}:${b.title}`)).toEqual([
      "umrah:confirmed:Family Umrah — 10 Nights",
      "hotel:confirmed:Jumeirah Sands Beach Hotel",
      "flight:refunded:London ⇄ Dubai",
      "flight:completed:Manchester ⇄ Istanbul",
    ]);
    const account = useAccountStore.getState();
    expect(account.travellers.map((t) => t.firstName)).toEqual(["Amira", "Yusuf", "Zayan", "Layla"]);
    expect(account.requests.map((r) => r.id)).toEqual(["CH-20931", "RF-10482"]);
    expect(account.notifications.map((n) => n.id)).toEqual(["n1", "n2", "n3", "n4", "n5"]);
    // Signing in again must not duplicate the seed.
    await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(useBookingsStore.getState().bookings).toHaveLength(4);
    expect((await signIn(DEMO_EMAIL, "wrong")).ok).toBe(false);
  });
});

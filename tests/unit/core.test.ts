import { getUmrahPackages, defaultUmrahConfig, packageFromPrice } from "@/lib/engine/umrah";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BAGGAGE_OPTIONS } from "@/data/extras";
import { HOTELS } from "@/data/hotels";
import { flightSearchHref, parseFlightCriteria, parseHotelCriteria } from "@/lib/engine/criteria";
import { addDaysISO, localToUtcMs, todayISO } from "@/lib/engine/dates";
import { getAirport } from "@/lib/engine/airports";
import { generateOffers } from "@/lib/engine/flights/offers";
import { flightService } from "@/lib/engine/flights/service";
import { bestQuote, generateHotelSearch, applyHotelFilters, EMPTY_HOTEL_FILTERS } from "@/lib/engine/hotels";
import {
  luhnValid,
  outcomeForCard,
  paymentService,
} from "@/lib/engine/payment";
import { calcFlightPricing, calcHotelPricing } from "@/lib/engine/pricing";
import { setSimulatedLatency } from "@/lib/engine/service";
import type { FlightCriteria } from "@/lib/types/flights";

// Independent regression coverage; no production archive or external service required.
const departure = addDaysISO(todayISO(), 30);
const criteria: FlightCriteria = {
  trip: "return",
  legs: [
    { from: "LHR", to: "DXB", date: departure },
    { from: "DXB", to: "LHR", date: addDaysISO(departure, 7) },
  ],
  pax: { adults: 2, children: 1, infants: 1 },
  cabin: "economy",
};

beforeAll(() => setSimulatedLatency(false));
afterAll(() => setSimulatedLatency(true));

describe("independent website integration baseline", () => {
  it("rejects impossible flight calendar dates and invalid passenger counts from URLs", () => {
    for(const changed of [
      {...criteria, legs:[{...criteria.legs[0],date:"2027-02-30"},criteria.legs[1]]},
      {...criteria, legs:[criteria.legs[0],{...criteria.legs[1],date:"2027-02-30"}]},
      {...criteria,pax:{adults:0,children:1,infants:0}},
    ]) {
      const params=Object.fromEntries(new URL(flightSearchHref(changed),"https://website.test").searchParams);
      expect(parseFlightCriteria(params)).toBeNull();
    }
  });
  it("preserves search criteria through return and multi-city URLs", () => {
    for (const input of [
      criteria,
      { ...criteria, trip: "multicity" as const },
    ]) {
      const params = Object.fromEntries(
        new URL(flightSearchHref(input), "https://example.test").searchParams,
      );
      expect(parseFlightCriteria(params)).toEqual(input);
    }
  });

  it("generates repeatable offers with consistent segment times across time zones", () => {
    const offers = generateOffers(criteria);
    expect(offers.length).toBeGreaterThan(0);
    expect(generateOffers(criteria)).toEqual(offers);
    for (const offer of offers) {
      expect(offer.legs).toHaveLength(2);
      for (const leg of offer.legs) {
        for (const segment of leg.segments) {
          const departureTime = localToUtcMs(
            segment.departLocal,
            getAirport(segment.from)!.tz,
          );
          const arrivalTime = localToUtcMs(
            segment.arriveLocal,
            getAirport(segment.to)!.tz,
          );
          expect(arrivalTime - departureTime).toBe(
            segment.durationMin * 60_000,
          );
        }
      }
    }
  });

  it("reconciles flight price lines and member discounts without discounting paid extras", () => {
    const offer = generateOffers(criteria)[0];
    const bag = BAGGAGE_OPTIONS[0];
    const input = {
      offer,
      fareId: offer.fares[0].id,
      pax: criteria.pax,
      extras: {
        baggage: { "adult-1": { "0": bag.id } },
        seats: {
          segment: { "adult-1": { seat: "10A", price: 30, kind: "standard" } },
        },
      },
    };
    const guest = calcFlightPricing(input, "GBP", false);
    const member = calcFlightPricing(input, "GBP", true);
    expect(guest.extras).toBe(bag.price + 30);
    expect(member.extras).toBe(guest.extras);
    expect(guest.total - member.total).toBe(Math.round(guest.base * 0.03));
    for (const result of [guest, member]) {
      expect(result.total).toBe(
        result.lines.reduce((sum, line) => sum + line.amount, 0),
      );
    }
  });

  it("rejects impossible hotel dates before deriving a missing check-out or parsing age values", () => {
    for(const params of [
      {dest:"dubai",in:"not-a-date"},
      {dest:"dubai",in:"2027-02-30"},
      {dest:"dubai",in:departure,out:"2027-02-30"},
      {dest:"dubai",chd:"1",ages:"18"},
      {dest:"dubai",chd:"2",ages:"4,invalid"},
      {dest:"dubai",rooms:"3",adt:"2"},
    ]) expect(parseHotelCriteria(params)).toBeNull();
  });

  it("filters and sorts hotel rates using returned server availability prices", () => {
    const criteria={destination:"dubai",checkIn:departure,checkOut:addDaysISO(departure,4),occupancy:{rooms:1,adults:2,children:0,childAges:[]}};
    const item=generateHotelSearch(criteria).items[0];
    const wireQuote={...item.bestQuote,perNight:1,roomTotal:4};
    const rows=applyHotelFilters([item.hotel],criteria,{...EMPTY_HOTEL_FILTERS,maxPrice:2},{[item.hotel.id]:[wireQuote]});
    expect(rows).toHaveLength(1);
    expect(rows[0].quote).toEqual(wireQuote);
    expect(applyHotelFilters([item.hotel],criteria,EMPTY_HOTEL_FILTERS,{[item.hotel.id]:[]})).toHaveLength(0);
  });

  it("uses API starting prices and fails clearly for an expired Umrah package", () => {
    const pkg=getUmrahPackages().find(p=>p.departures.length)!;
    expect(()=>defaultUmrahConfig({...pkg,departures:[]})).toThrow("no available departures");
    const fromPrices=Object.fromEntries(["GBP","USD","EUR","AED","SAR"].map(c=>[c,{quad:111,triple:222,double:333}])) as NonNullable<typeof pkg.fromPrices>;
    expect(packageFromPrice({...pkg,fromPrices},"USD","triple")).toBe(222);
  });

  it("prices hotel room nights consistently with occupancy and the checkout summary", () => {
    const input = {
      destination: "dubai",
      checkIn: departure,
      checkOut: addDaysISO(departure, 4),
      occupancy: { rooms: 2, adults: 4, children: 0, childAges: [] },
    };
    const results = generateHotelSearch(input);
    expect(results.items.length).toBeGreaterThan(0);
    for (const item of results.items) {
      expect(item.bestQuote.roomTotal).toBe(item.bestQuote.perNight * 4 * 2);
      const pricing = calcHotelPricing(item.bestQuote, "GBP", false);
      expect(pricing.base).toBe(item.bestQuote.roomTotal);
      expect(pricing.total).toBe(
        pricing.lines.reduce((sum, line) => sum + line.amount, 0),
      );
    }
    expect(bestQuote(HOTELS[0], input)).not.toBeNull();
  });

  it("reports expired and changed fares without mutating the selected offer", async () => {
    const offer = generateOffers(criteria)[0];
    const snapshot = JSON.stringify(offer);
    const fetcher=vi.spyOn(globalThis,"fetch").mockImplementation(async (_url,init)=>{
      const body=JSON.parse(String(init?.body));
      expect(body.searchId).toBe("server-search");
      expect(body.offer).toBeUndefined();
      expect(body.expectedFare).toBe(offer.fares[0].farePerAdult);
      return Response.json({data:body.scenario==="expired"?{status:"expired"}:{status:"price_changed",newFarePerAdult:offer.fares[0].farePerAdult+20,newTaxPerAdult:offer.fares[0].taxPerAdult+2,offer},meta:{apiVersion:"2026-10-16.v1",providerMode:"simulated",requestId:"test"}});
    });
    expect(await flightService.revalidate(offer,offer.fares[0].id,"server-search",{scenario:"expired"})).toEqual({status:"expired"});
    const changed=await flightService.revalidate(offer,offer.fares[0].id,"server-search",{scenario:"price-changed"});
    fetcher.mockRestore();
    expect(changed.status).toBe("price_changed");
    if (changed.status === "price_changed")
      expect(changed.newFarePerAdult).toBeGreaterThan(
        offer.fares[0].farePerAdult,
      );
    expect(JSON.stringify(offer)).toBe(snapshot);
  });

  it("keeps simulated declines separate from successful captured payments", async () => {
    expect(luhnValid("4242 4242 4242 4242")).toBe(true);
    expect(luhnValid("4242 4242 4242 4243")).toBe(false);
    expect(outcomeForCard("4000 0000 0000 0002")).toBe("declined");
    const request = {
      method: "card" as const,
      amount: 100,
      currency: "GBP" as const,
      last4: "4242",
    };
    await expect(
      paymentService.charge({ ...request, outcome: "declined" }),
    ).rejects.toMatchObject({ code: "card_declined" });
    await expect(
      paymentService.charge({ ...request, outcome: "insufficient" }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });
    await expect(paymentService.charge(request)).resolves.toMatchObject({
      status: "captured",
      amount: 100,
      currency: "GBP",
      last4: "4242",
    });
  });
});

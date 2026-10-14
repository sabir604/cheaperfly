import { searchAirports } from "@/lib/engine/airports";
import { hashString, createRng } from "@/lib/engine/rng";
import { ServiceError, sleep, type ServiceOptions } from "@/lib/engine/service";
import { generateSearch } from "./offers";
import { buildSeatMap, type SeatMap } from "./seatmap";
import type { Fare, FlightCriteria, FlightSearchResult, Offer, Segment } from "@/lib/types/flights";

export type RevalidateResult =
  | { status: "ok" }
  | { status: "expired" }
  | { status: "price_changed"; newFarePerAdult: number; newTaxPerAdult: number };

/**
 * Flight supplier facade. Today it wraps the mock generators; a real integration (Duffel, Amadeus…)
 * should implement the same four methods.
 */
export const flightService = {
  suggestAirports: (query: string) => searchAirports(query),

  async search(criteria: FlightCriteria, opts?: ServiceOptions): Promise<FlightSearchResult> {
    const rng = createRng(`latency-${Date.now()}`);
    await sleep(1900 + rng.int(0, 900));
    if (opts?.scenario === "error") throw new ServiceError("supplier_timeout", "One of our fare suppliers took too long to respond.");
    const result = generateSearch(criteria);
    return opts?.scenario === "empty" ? { ...result, offers: [] } : result;
  },

  async getSeatMap(segment: Segment, fare: Fare): Promise<SeatMap> {
    await sleep(350);
    return buildSeatMap(segment, fare);
  },

  /** Re-checks a fare before checkout; QA scenarios can force "expired" or a small price rise. */
  async revalidate(offer: Offer, fareId: string, opts?: ServiceOptions): Promise<RevalidateResult> {
    await sleep(900);
    if (opts?.scenario === "expired") return { status: "expired" };
    const fare = offer.fares.find((f) => f.id === fareId) ?? offer.fares[0];
    if (opts?.scenario === "price-changed") {
      const rise = 12 + (hashString(offer.id) % 20);
      return { status: "price_changed", newFarePerAdult: fare.farePerAdult + rise, newTaxPerAdult: fare.taxPerAdult + Math.round(0.11 * rise) };
    }
    return { status: "ok" };
  },
};

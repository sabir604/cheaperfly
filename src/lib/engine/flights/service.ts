import { apiRequest } from "@/lib/api/client";
import type { ServiceOptions } from "@/lib/engine/service";
import type {
  AirportSuggestionGroup,
  Fare,
  FlightCriteria,
  Offer,
  Segment,
} from "@/lib/types/flights";
import type { FlightDraft } from "@/lib/types/booking";
import type { Currency } from "@cheaperfly/api-contracts";
import type {
  FlightQuote,
  FlightSearch,
  RevalidateResult,
  SeatMap,
} from "@cheaperfly/api-contracts/flights";
export type { RevalidateResult } from "@cheaperfly/api-contracts/flights";
async function post<T>(path: string, body: unknown): Promise<T> {
  return (
    await apiRequest<T>("public", "flights/" + path, {
      method: "POST",
      body: JSON.stringify(body),
    })
  ).data;
}
export const flightService = {
  suggestAirports: (query: string, limit = 7) =>
    post<AirportSuggestionGroup[]>("airports", { query, limit }),
  search: (criteria: FlightCriteria, opts?: ServiceOptions) =>
    post<FlightSearch>("search", {
      criteria,
      ...(opts?.scenario && opts.scenario !== "ok"
        ? { scenario: opts.scenario }
        : {}),
    }),
  getSeatMap: (
    segment: Segment,
    fare: Fare,
    searchId: string,
    offerId: string,
  ) =>
    post<SeatMap>("seat-maps", {
      searchId,
      offerId,
      fareId: fare.id,
      segmentId: segment.id,
    }),
  revalidate: (
    offer: Offer,
    fareId: string,
    searchId: string,
    opts?: ServiceOptions,
  ) => {
    const fare = offer.fares.find((f) => f.id === fareId)!;
    return post<RevalidateResult>("revalidate", {
      searchId,
      offerId: offer.id,
      fareId,
      expectedFare: fare.farePerAdult,
      expectedTax: fare.taxPerAdult,
      ...(opts?.scenario && opts.scenario !== "ok"
        ? { scenario: opts.scenario }
        : {}),
    });
  },
  quote: (draft: FlightDraft, currency: Currency) =>
    post<FlightQuote>("quotes", {
      searchId: draft.searchId,
      offerId: draft.offer.id,
      fareId: draft.fareId ?? draft.offer.fares[0].id,
      currency,
      extras: draft.extras,
    }),
};
// Deduplicate mounted summary/guard consumers; no credentials or passenger documents enter keys.
const quotes = new Map<string, Promise<FlightQuote>>();
export const flightQuoteKey = (
  draft: FlightDraft,
  currency: Currency,
  identity: string,
) =>
  JSON.stringify([
    identity,
    draft.searchId,
    draft.offer.id,
    draft.fareId,
    draft.offer.fares,
    currency,
    draft.extras,
  ]);
export function loadFlightQuote(
  key: string,
  draft: FlightDraft,
  currency: Currency,
): Promise<FlightQuote> {
  const existing = quotes.get(key);
  if (existing)
    return existing.then((q) => {
      if (Date.parse(q.expiresAt) <= Date.now()) {
        quotes.delete(key);
        return loadFlightQuote(key, draft, currency);
      }
      return q;
    });
  const pending = flightService.quote(draft, currency);
  quotes.set(key, pending);
  pending.catch(() => quotes.delete(key));
  if (quotes.size > 50) quotes.delete(quotes.keys().next().value!);
  return pending;
}

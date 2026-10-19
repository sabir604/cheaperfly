"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useCurrency } from "@/components/money";
import { ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/primitives";
import { type PriceBreakdown } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import { flightQuoteKey, loadFlightQuote } from "@/lib/engine/flights/service";
import type { FlightQuote } from "@cheaperfly/api-contracts/flights";
import type { FlightDraft } from "@/lib/types/booking";

/** The flight checkout draft with its live price (3% member saving when signed in). */
export function useFlightDraft() {
  const hydrated = useHydrated();
  const draft = useDraftsStore((s) => s.flight);
  const user = useSessionStore((s) => s.user);
  const { currency } = useCurrency();
  const identity = user?.id ?? "guest";
  const key = draft ? flightQuoteKey(draft, currency, identity) : "";
  const [result, setResult] = useState<{
    key: string;
    identity: string;
    quote?: FlightQuote;
    error?: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [expired, setExpired] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated || !draft) return;
    let cancelled = false;
    loadFlightQuote(key, draft, currency)
      .then((quote) => {
        if (!cancelled) {
          setResult({ key, identity, quote });
          useDraftsStore.getState().patchFlight({ quote });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setResult({ key, identity, error: error.message });
      });
    return () => {
      cancelled = true;
    };
    // The key includes every selection, price, currency and identity used by the quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key, attempt]);
  useEffect(() => {
    if (!result?.quote) return;
    const timer = setTimeout(
      () => setExpired(result.quote!.id),
      Math.max(0, Date.parse(result.quote.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [result]);
  const current = result?.key === key ? result : null;
  // Keep the mounted form and its server-priced summary during a selection refresh.
  // Review awaits the quote for its exact current selection before navigating.
  const displayQuote =
    current?.quote ??
    (result?.identity === identity && result.quote?.searchId === draft?.searchId
      ? result.quote
      : undefined);
  const breakdown =
    displayQuote && expired !== displayQuote.id ? displayQuote.breakdown : null;
  const quoteError =
    current?.error ??
    (current?.quote && expired === current.quote.id
      ? "This fare has expired. Please search again."
      : null);
  const fare = draft
    ? (draft.offer.fares.find((f) => f.id === draft.fareId) ?? null)
    : null;
  return {
    hydrated,
    draft,
    breakdown,
    currency,
    member: !!user,
    fare,
    quoteError,
    retry: () => setAttempt((a) => a + 1),
  };
}

export function PageSkeleton() {
  return (
    <div className="container-page py-10" aria-busy>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Renders a booking step only when there is a flight draft (and, by default, a chosen fare). */
export function FlightGuard({
  requireFare = true,
  children,
}: {
  requireFare?: boolean;
  children: (ctx: {
    draft: FlightDraft;
    breakdown: PriceBreakdown;
  }) => ReactNode;
}) {
  const { hydrated, draft, breakdown, quoteError, retry } = useFlightDraft();
  if (!hydrated) return <PageSkeleton />;
  if (draft && quoteError)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="We couldn’t refresh your fare"
          description={quoteError}
          actions={
            <>
              <button onClick={retry}>Try again</button>
              <ButtonLink href="/flights">Search flights</ButtonLink>
            </>
          }
        />
      </div>
    );
  if (draft && !breakdown) return <PageSkeleton />;
  if (!draft || !breakdown)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="Your booking session has expired"
          description="We couldn't find the flight you were booking. Fares are only held for a short time, so please search again."
          actions={<ButtonLink href="/flights">Search flights</ButtonLink>}
        />
      </div>
    );
  if (requireFare && !draft.fareId)
    return (
      <div className="container-page py-16">
        <StateView
          title="Choose a fare to continue"
          description="Pick the fare that suits you best before entering passenger details."
          actions={
            <ButtonLink href={`/flights/fare/${draft.offer.id}`}>
              Compare fares
            </ButtonLink>
          }
        />
      </div>
    );
  return <>{children({ draft, breakdown })}</>;
}

"use client";

import { useMemo, type ReactNode } from "react";
import { useCurrency } from "@/components/money";
import { ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/primitives";
import { calcFlightPricing, type PriceBreakdown } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import type { FlightDraft } from "@/lib/types/booking";

/** The flight checkout draft with its live price (3% member saving when signed in). */
export function useFlightDraft() {
  const hydrated = useHydrated();
  const draft = useDraftsStore((s) => s.flight);
  const user = useSessionStore((s) => s.user);
  const { currency } = useCurrency();
  const breakdown = useMemo(
    () => (draft ? calcFlightPricing({ offer: draft.offer, fareId: draft.fareId, extras: draft.extras, pax: draft.criteria.pax }, currency, !!user) : null),
    [draft, currency, user],
  );
  const fare = draft ? (draft.offer.fares.find((f) => f.id === draft.fareId) ?? null) : null;
  return { hydrated, draft, breakdown, currency, member: !!user, fare };
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
  children: (ctx: { draft: FlightDraft; breakdown: PriceBreakdown }) => ReactNode;
}) {
  const { hydrated, draft, breakdown } = useFlightDraft();
  if (!hydrated) return <PageSkeleton />;
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
          actions={<ButtonLink href={`/flights/fare/${draft.offer.id}`}>Compare fares</ButtonLink>}
        />
      </div>
    );
  return <>{children({ draft, breakdown })}</>;
}

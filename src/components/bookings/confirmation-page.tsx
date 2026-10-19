"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/lib/stores/session";
import { serverBookings } from "@/lib/engine/server-bookings";
import { useHydrated } from "@/lib/stores/hydration";
import type { Booking } from "@/lib/types/booking";
import { StateView } from "@/components/ui/feedback";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { ConfirmationView } from "./confirmation-view";

export function ConfirmationPage({ reference }: { reference: string }) {
  const user = useSessionStore((s) => s.user);
  const hydrated = useHydrated();
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([reference, user?.id]);
  const [result, setResult] = useState<{
    key: string;
    booking?: Booking;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    serverBookings
      .read(reference)
      .then((booking) => {
        if (!cancelled) setResult({ key, booking });
      })
      .catch((error: Error) => {
        if (!cancelled) setResult({ key, error: error.message });
      });
    return () => {
      cancelled = true;
    };
    // The key includes reference and identity so private results disappear when accounts change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key, attempt]);
  const current = result?.key === key ? result : null;
  return (
    <div className="container-page py-8 sm:py-10">
      {!current ? (
        <Skeleton className="h-96 w-full" />
      ) : current.booking ? (
        <ConfirmationView booking={current.booking} signedIn={!!user} />
      ) : (
        <StateView
          tone="warning"
          title="We couldn’t load this confirmation"
          description={current.error}
          actions={
            <>
              <Button onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
              <ButtonLink href="/">Return home</ButtonLink>
            </>
          }
        />
      )}
    </div>
  );
}

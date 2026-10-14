"use client";

import { useMemo, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/primitives";
import { userOwnsBooking } from "@/lib/engine/bookings/status";
import { useBookingsStore } from "@/lib/stores/bookings";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import type { Booking } from "@/lib/types/booking";

type Access = "loading" | "ok" | "signin" | "forbidden" | "notfound";

function GateSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

function Denied({ access, mode }: { access: Exclude<Access, "loading" | "ok">; mode: "guest" | "account" | "document" }) {
  if (access === "signin")
    return (
      <StateView
        title="Sign in to view this booking"
        description="Bookings are private to your account. Sign in with the email you booked with."
        actions={
          <>
            <ButtonLink href="/sign-in">Sign in</ButtonLink>
            <ButtonLink href="/manage-booking" variant="outline">
              Find with reference
            </ButtonLink>
          </>
        }
      />
    );
  if (access === "forbidden")
    return (
      <StateView
        tone="warning"
        title="We couldn't open this booking"
        description={
          mode === "account"
            ? "This booking isn't linked to your account. If you booked as a guest, use Manage Booking with your reference and last name."
            : "For your security, please confirm your booking reference and last name first."
        }
        actions={
          <>
            <ButtonLink href="/manage-booking">Manage booking</ButtonLink>
            <ButtonLink href="/help/contact" variant="outline">
              Contact support
            </ButtonLink>
          </>
        }
      />
    );
  return (
    <StateView
      tone="warning"
      title="Booking not found"
      description="We couldn't find a booking with that reference on this device. Check the reference or look it up with your last name."
      actions={
        <>
          <ButtonLink href="/manage-booking">Manage booking</ButtonLink>
          <ButtonLink href="/account/bookings" variant="outline">
            My bookings
          </ButtonLink>
        </>
      }
    />
  );
}

/**
 * Renders a booking only for someone allowed to see it: the account that owns it, or (in guest
 * or document mode) a browser that made it or unlocked it via Manage Booking lookup.
 */
export function BookingGate({ reference, mode, children }: { reference: string; mode: "guest" | "account" | "document"; children: (b: Booking) => ReactNode }) {
  const hydrated = useHydrated();
  const bookings = useBookingsStore((s) => s.bookings);
  const guestRefs = useBookingsStore((s) => s.guestRefs);
  const user = useSessionStore((s) => s.user);
  const { booking, access } = useMemo((): { booking: Booking | null; access: Access } => {
    if (!hydrated) return { booking: null, access: "loading" };
    const b = bookings.find((x) => x.id.toLowerCase() === reference.toLowerCase()) ?? null;
    if (!b) return { booking: null, access: mode !== "account" || user ? "notfound" : "signin" };
    if (mode === "account") {
      if (!user) return { booking: null, access: "signin" };
      return userOwnsBooking(b, user) ? { booking: b, access: "ok" } : { booking: null, access: "forbidden" };
    }
    return guestRefs.includes(b.id) || userOwnsBooking(b, user) ? { booking: b, access: "ok" } : { booking: null, access: "forbidden" };
  }, [hydrated, bookings, guestRefs, user, reference, mode]);
  if (access === "loading") return <GateSkeleton />;
  if (access === "ok" && booking) return <>{children(booking)}</>;
  return <Denied access={access === "ok" ? "notfound" : access} mode={mode} />;
}

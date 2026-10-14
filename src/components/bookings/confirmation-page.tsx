"use client";

import { useSessionStore } from "@/lib/stores/session";
import { BookingGate } from "./booking-gate";
import { ConfirmationView } from "./confirmation-view";

export function ConfirmationPage({ reference }: { reference: string }) {
  const user = useSessionStore((s) => s.user);
  return (
    <div className="container-page py-8 sm:py-10">
      <BookingGate reference={reference} mode="guest">
        {(booking) => <ConfirmationView booking={booking} signedIn={!!user} />}
      </BookingGate>
    </div>
  );
}

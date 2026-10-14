"use client";

import { BookingDetailView, bookingPaths, type BookingMode } from "@/components/bookings/booking-detail-view";
import { BookingGate } from "@/components/bookings/booking-gate";
import { ManageBookingTabs } from "./manage-tabs";
import { RequestWizard } from "./request-wizard";

/** Shared by `/manage-booking/[ref]…` (guest) and `/account/bookings/[ref]…` (account). */
export function BookingDetailPage({ reference, mode }: { reference: string; mode: BookingMode }) {
  return <BookingGate reference={reference} mode={mode}>{(b) => <BookingDetailView booking={b} mode={mode} {...bookingPaths(mode, b.id)} />}</BookingGate>;
}

export function ManagePage({ reference, mode, tab }: { reference: string; mode: BookingMode; tab?: string }) {
  return <BookingGate reference={reference} mode={mode}>{(b) => <ManageBookingTabs booking={b} basePath={bookingPaths(mode, b.id).basePath} initialTab={tab} />}</BookingGate>;
}

export function CancelPage({ reference, mode, type }: { reference: string; mode: BookingMode; type?: string }) {
  return (
    <BookingGate reference={reference} mode={mode}>
      {(b) => <RequestWizard booking={b} kind={type === "refund" ? "refund" : "cancellation"} basePath={bookingPaths(mode, b.id).basePath} />}
    </BookingGate>
  );
}

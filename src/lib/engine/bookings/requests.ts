/** Server-owned post-booking requests. Customers can submit and read; staff decide. */
import { serviceMutation, loadServicingData } from "@/lib/engine/servicing";
import {
  serverBookings,
  loadServerBookings,
} from "@/lib/engine/server-bookings";
import { useSessionStore } from "@/lib/stores/session";
import { useAccountStore } from "@/lib/stores/bookings";
import type { FlightExtras } from "@/lib/engine/pricing";
import type {
  Booking,
  Contact,
  HotelBooking,
  RequestKind,
  ServiceRequest,
  SupportCase,
} from "@/lib/types/booking";
async function refresh() {
  const owner = useSessionStore.getState().user?.id;
  if (owner) await loadServerBookings(owner);
  window.dispatchEvent(new Event("booking-updated"));
}
export async function createSupportCase(input: {
  bookingRef?: string;
  topic: string;
  subject: string;
  message: string;
  channel?: string;
}): Promise<SupportCase> {
  const result = await serviceMutation<SupportCase>("support", input);
  const owner = useSessionStore.getState().user?.id;
  if (owner) await loadServicingData(owner);
  return result;
}
export async function replySupportCase(id: string, message: string) {
  const result = await serviceMutation<SupportCase>(`support/${id}/messages`, {
    message,
  });
  useAccountStore.getState().updateCase(id, () => result);
  return result;
}
export async function submitChangeRequest(
  b: Booking,
  input: {
    reason: string;
    notes: string;
    preferredDate?: string;
    extras?: FlightExtras;
  },
): Promise<ServiceRequest> {
  const result = await serviceMutation<ServiceRequest>("requests", {
    bookingId: b.id,
    kind: "change",
    ...input,
  });
  await refresh();
  return result;
}
export async function submitRefundRequest(
  b: Booking,
  input: {
    kind: Extract<RequestKind, "refund" | "cancellation">;
    passengerIds: string[];
    reason: string;
    explanation?: string;
  },
): Promise<ServiceRequest> {
  const result = await serviceMutation<ServiceRequest>("requests", {
    bookingId: b.id,
    ...input,
  });
  await refresh();
  return result;
}
export async function updateBookingContact(
  bookingId: string,
  contact: Contact,
) {
  const result = await serviceMutation<Booking>(
    `bookings/${bookingId}/contact`,
    { ...contact },
    "PATCH",
  );
  await refresh();
  return result;
}
export async function updateFlightExtras(
  bookingId: string,
  extras: FlightExtras,
  label: string,
) {
  const b = await serverBookings.read(bookingId);
  return submitChangeRequest(b, {
    reason: label,
    notes:
      "Please review these flight extras. Simulated provider; no real charge.",
    extras,
  });
}
export async function updateHotelPreferences(
  bookingId: string,
  patch: Partial<
    Pick<HotelBooking, "specialRequests" | "requestNotes" | "arrivalTime">
  >,
) {
  const result = await serviceMutation<Booking>(
    `bookings/${bookingId}/stay`,
    patch,
    "PATCH",
  );
  await refresh();
  return result;
}
export async function updateUmrahNotes(
  bookingId: string,
  notes: string,
  documentsSubmitted: boolean,
) {
  const result = await serviceMutation<Booking>(
    `bookings/${bookingId}/stay`,
    { notes, documentsSubmitted },
    "PATCH",
  );
  await refresh();
  return result;
}

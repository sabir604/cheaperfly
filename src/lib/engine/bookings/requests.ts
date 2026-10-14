/** Post-booking requests (refund, cancellation, change), support cases and booking updates. */
import { calcFlightPricing, type FlightExtras } from "@/lib/engine/pricing";
import { newCaseRef, newId } from "@/lib/engine/refs";
import { useAccountStore, useBookingsStore } from "@/lib/stores/bookings";
import { estimateRefund } from "./status";
import type {
  Booking,
  Contact,
  HotelBooking,
  NotificationKind,
  RequestKind,
  RequestStatus,
  ServiceRequest,
  SupportCase,
  TimelineEvent,
} from "@/lib/types/booking";

const nowIso = () => new Date().toISOString();
const event = (label: string, detail?: string, done = true): TimelineEvent => ({ id: newId("ev"), label, detail, at: nowIso(), done });

function notify(b: Booking, title: string, body: string, kind: NotificationKind = "support") {
  if (!b.userId) return;
  useAccountStore.getState().addNotification({ kind, title, body, href: kind === "refund" ? "/account/refunds" : `/account/bookings/${b.id}` });
}

const FLOW: RequestStatus[] = ["submitted", "under_review", "approved", "processed"];

/**
 * "Simulate the back office" on the Refund Requests page: moves a request one step along
 * submitted → under review → approved → processed, or declines it. Approving cancels the booking,
 * processing marks it refunded, declining restores it.
 */
export function advanceRequest(requestId: string, action: "next" | "reject" = "next") {
  const account = useAccountStore.getState();
  const req = account.requests.find((r) => r.id === requestId);
  if (!req) return;
  const index = FLOW.indexOf(req.status);
  let status = req.status;
  if (action === "reject") status = "rejected";
  else if (index >= 0 && index < FLOW.length - 1) status = FLOW[index + 1];
  if (status === req.status) return;

  const steps = req.timeline.map((e) => ({ ...e }));
  const complete = (label: string, detail?: string) => {
    const step = steps.find((e) => e.label === label);
    if (step) {
      step.done = true;
      step.at = nowIso();
      if (detail) step.detail = detail;
    }
  };
  if (status === "under_review") complete("Under review");
  if (status === "approved") {
    complete("Under review");
    complete("Decision", "Approved by the supplier");
  }
  if (status === "processed") {
    complete("Under review");
    complete("Decision", "Approved by the supplier");
    complete("Processed");
  }
  if (status === "rejected") {
    complete("Under review");
    const decision = steps.find((e) => e.label === "Decision");
    if (decision) {
      decision.done = true;
      decision.at = nowIso();
      decision.label = "Declined";
      decision.detail = "The supplier could not approve this request under the fare conditions";
    }
  }
  account.updateRequest(requestId, { status, timeline: action === "reject" ? steps.filter((e) => e.label !== "Processed") : steps });

  const bookings = useBookingsStore.getState();
  const booking = bookings.bookings.find((b) => b.id === req.bookingId);
  if (booking && (req.kind === "refund" || req.kind === "cancellation")) {
    if (status === "processed")
      bookings.updateBooking(booking.id, (b) => ({
        ...b,
        status: "refunded",
        payment: { ...b.payment, status: "refunded" },
        timeline: [...b.timeline, event("Refund processed", `${req.id} · ${req.refundEstimate?.net ?? 0} ${b.currency}`)],
      }));
    else if (status === "approved")
      bookings.updateBooking(booking.id, (b) => ({ ...b, status: "cancelled", timeline: [...b.timeline, event("Cancellation approved", req.id)] }));
    else if (status === "rejected")
      bookings.updateBooking(booking.id, (b) => ({
        ...b,
        status: b.status === "cancellation_requested" ? "confirmed" : b.status,
        timeline: [...b.timeline, event("Request declined", req.id)],
      }));
  }
  if (booking) {
    const label = status.replace("_", " ");
    notify(booking, `${req.id} ${label}`, `Your ${req.kind} request for ${req.bookingTitle} is now ${label}.`, "refund");
  }
}

export function createSupportCase(input: { bookingRef?: string; topic: string; subject: string; message: string; channel?: string }): SupportCase {
  const c: SupportCase = {
    id: newCaseRef("SP"),
    bookingRef: input.bookingRef,
    topic: input.topic,
    subject: input.subject,
    status: "open",
    createdAt: nowIso(),
    channel: input.channel ?? "message",
    messages: [{ from: "customer", text: input.message, at: nowIso() }],
  };
  useAccountStore.getState().addCase(c);
  return c;
}

export function submitChangeRequest(b: Booking, input: { reason: string; notes: string; preferredDate?: string }): ServiceRequest {
  const id = newCaseRef("CH");
  const req: ServiceRequest = {
    id,
    kind: "change",
    bookingId: b.id,
    product: b.product,
    bookingTitle: b.title,
    passengers: [],
    reason: input.reason,
    explanation: input.notes,
    status: "submitted",
    createdAt: nowIso(),
    currency: b.currency,
    changeDetails: { preferredDate: input.preferredDate, notes: input.notes },
    timeline: [
      { id: "1", label: "Submitted", detail: "We've received your change request", at: nowIso(), done: true },
      { id: "2", label: "Under review", detail: "Checking availability with the supplier", at: nowIso(), done: false },
      { id: "3", label: "Decision", detail: "You'll get a quote for any fare difference", at: nowIso(), done: false },
    ],
  };
  useAccountStore.getState().addRequest(req);
  useBookingsStore.getState().updateBooking(b.id, (x) => ({ ...x, timeline: [...x.timeline, event("Change requested", `${id} · ${input.reason}`)] }));
  notify(b, "Change request received", `${id}: we'll come back to you within 24 hours with options.`, "support");
  return req;
}

export function submitRefundRequest(
  b: Booking,
  input: { kind: Extract<RequestKind, "refund" | "cancellation">; passengerIds: string[]; reason: string; explanation?: string },
): ServiceRequest {
  const estimate = estimateRefund(b, input.passengerIds);
  const id = newCaseRef("RF");
  const wholeBooking =
    b.product === "flight"
      ? input.passengerIds.length === b.passengers.length
      : b.product !== "umrah" || input.passengerIds.length === b.travellers.length;
  const names =
    b.product === "flight"
      ? b.passengers.filter((p) => input.passengerIds.includes(p.id)).map((p) => `${p.firstName} ${p.lastName}`)
      : b.product === "umrah"
        ? b.travellers.filter((t) => input.passengerIds.includes(t.id)).map((t) => `${t.firstName} ${t.lastName}`)
        : b.guests.map((g) => `${g.firstName} ${g.lastName}`);
  const req: ServiceRequest = {
    id,
    kind: input.kind,
    bookingId: b.id,
    product: b.product,
    bookingTitle: b.title,
    passengers: names,
    reason: input.reason,
    explanation: input.explanation,
    status: "submitted",
    createdAt: nowIso(),
    currency: b.currency,
    refundEstimate: { gross: estimate.paid, fee: estimate.fee, net: estimate.net },
    timeline: [
      { id: "1", label: "Submitted", detail: "We've received your request", at: nowIso(), done: true },
      { id: "2", label: "Under review", detail: "Checking fare rules and supplier conditions", at: nowIso(), done: false },
      { id: "3", label: "Decision", detail: "Approved or declined by the supplier", at: nowIso(), done: false },
      { id: "4", label: "Processed", detail: "Refund issued to your original payment method", at: nowIso(), done: false },
    ],
  };
  useAccountStore.getState().addRequest(req);
  useBookingsStore.getState().updateBooking(b.id, (x) => ({
    ...x,
    status: wholeBooking && x.status !== "cancelled" && x.status !== "refunded" ? "cancellation_requested" : x.status,
    timeline: [...x.timeline, event(input.kind === "refund" ? "Refund requested" : "Cancellation requested", `${id} · ${input.reason}`)],
  }));
  notify(b, "Request received", `${id}: we're reviewing your ${input.kind} request for ${b.title}.`, "refund");
  return req;
}

export function updateBookingContact(bookingId: string, contact: Contact) {
  useBookingsStore
    .getState()
    .updateBooking(bookingId, (b) => ({ ...b, contact, customerEmail: contact.email.toLowerCase(), timeline: [...b.timeline, event("Contact details updated", contact.email)] }));
}

/** Adds bags or seats after booking; charges (or refunds) the difference to the card on file. */
export function updateFlightExtras(bookingId: string, extras: FlightExtras, label: string) {
  const store = useBookingsStore.getState();
  const b = store.bookings.find((x) => x.id === bookingId);
  if (!b || b.product !== "flight") return null;
  const before = b.pricing.total;
  const pricing = calcFlightPricing({ offer: b.offer, fareId: b.fare.id, extras, pax: b.criteria.pax }, b.currency, !!b.userId);
  const delta = pricing.total - before;
  store.updateBooking(bookingId, (x) => ({
    ...x,
    extras,
    pricing,
    payment: { ...x.payment, amount: pricing.total },
    timeline: [
      ...x.timeline,
      event(label, delta > 0 ? `Charged ${delta} ${x.currency} to the card on file` : delta < 0 ? `Refunded ${Math.abs(delta)} ${x.currency}` : "No charge"),
    ],
  }) as Booking);
  notify(b, label, delta > 0 ? `An additional ${delta} ${b.currency} was charged to your card.` : "Your booking has been updated.", "booking");
  return { delta, pricing };
}

export function updateHotelPreferences(bookingId: string, patch: Partial<Pick<HotelBooking, "specialRequests" | "requestNotes" | "arrivalTime">>) {
  useBookingsStore
    .getState()
    .updateBooking(bookingId, (b) => (b.product === "hotel" ? { ...b, ...patch, timeline: [...b.timeline, event("Stay preferences updated", "Passed to the hotel")] } : b));
}

export function updateUmrahNotes(bookingId: string, notes: string, documentsSubmitted: boolean) {
  useBookingsStore.getState().updateBooking(bookingId, (b) =>
    b.product === "umrah"
      ? {
          ...b,
          notes,
          visaStatus: documentsSubmitted && b.visaStatus === "documents_requested" ? "in_progress" : b.visaStatus,
          timeline: [
            ...b.timeline,
            event(documentsSubmitted ? "Visa documents received" : "Notes updated", documentsSubmitted ? "Applications submitted to the authorities" : undefined),
          ],
        }
      : b,
  );
}

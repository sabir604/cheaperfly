/**
 * Turns a completed checkout draft + payment into a stored booking, with its timeline,
 * confirmation email record and (for signed-in customers) account notifications.
 */
import { AIRLINE_MAP } from "@/data/flights";
import { getHotel } from "@/data/hotels";
import { airportCityOf } from "@/lib/engine/airports";
import { formatCurrency, type CurrencyCode } from "@/lib/engine/currency";
import { addDaysISO, formatDateMed } from "@/lib/engine/dates";
import { calcFlightPricing, calcHotelPricing, calcUmrahPricing } from "@/lib/engine/pricing";
import { newBookingRef, newHotelConfirmation, newInvoiceNo, newPnr, newTicketNumber } from "@/lib/engine/refs";
import { getUmrahPackage, resolveUmrahPricingInput } from "@/lib/engine/umrah";
import { useAccountStore, useBookingsStore } from "@/lib/stores/bookings";
import type {
  AccountNotification,
  Booking,
  BookingStatus,
  FlightBooking,
  FlightDraft,
  HotelBooking,
  HotelDraft,
  PaymentRecord,
  TimelineEvent,
  UmrahBooking,
  UmrahDraft,
} from "@/lib/types/booking";

export interface CreateBookingOptions {
  currency: CurrencyCode;
  /** Signed-in customers get the 3% member saving. */
  member: boolean;
  userId?: string;
  payment: Omit<PaymentRecord, "amount" | "currency">;
  /** Override the clock (demo seeding creates bookings in the past). */
  now?: Date;
  ref?: string;
  status?: BookingStatus;
  demoSeed?: boolean;
  /** Set false to skip account notifications. */
  notify?: boolean;
}

function timeline(start: Date, steps: { label: string; detail?: string; offsetSec: number }[]): TimelineEvent[] {
  return steps.map((s, i) => ({ id: `t${i}`, label: s.label, detail: s.detail, at: new Date(start.getTime() + 1000 * s.offsetSec).toISOString(), done: true }));
}

function notify(userId: string | undefined, enabled: boolean | undefined, items: Omit<AccountNotification, "id" | "read">[]) {
  if (!userId || enabled === false) return;
  const add = useAccountStore.getState().addNotification;
  for (const n of items) add({ ...n });
}

function save<T extends Booking>(b: T): T {
  useBookingsStore.getState().addBooking(b);
  return b;
}

const cardLine = (p: CreateBookingOptions["payment"]) => `${p.brand ?? "Card"} ending ${p.last4 ?? "****"}`;

export const bookingService = {
  list: () => useBookingsStore.getState().bookings,
  get: (ref: string) => useBookingsStore.getState().bookings.find((b) => b.id.toLowerCase() === ref.toLowerCase()),
  /** Manage Booking lookup: booking reference (or flight PNR) plus any traveller's last name. */
  findByReference: (reference: string, lastName: string) => {
    const ref = reference.trim().toLowerCase();
    const last = lastName.trim().toLowerCase();
    return useBookingsStore.getState().bookings.find((b) => {
      const refMatches = b.id.toLowerCase() === ref || (b.product === "flight" && b.pnr.toLowerCase() === ref);
      if (!refMatches) return false;
      if (b.leadLastName.trim().toLowerCase() === last) return true;
      if (b.product === "flight") return b.passengers.some((p) => p.lastName.trim().toLowerCase() === last);
      if (b.product === "umrah") return b.travellers.some((t) => t.lastName.trim().toLowerCase() === last);
      return b.guests.some((g) => g.lastName.trim().toLowerCase() === last);
    });
  },
};

export function createFlightBooking(draft: FlightDraft, opts: CreateBookingOptions): FlightBooking {
  const now = opts.now ?? new Date();
  const fare = draft.offer.fares.find((f) => f.id === draft.fareId) ?? draft.offer.fares[0];
  const pricing = calcFlightPricing({ offer: draft.offer, fareId: fare.id, extras: draft.extras, pax: draft.criteria.pax }, opts.currency, opts.member);
  const ref = opts.ref ?? newBookingRef();
  const airline = AIRLINE_MAP[draft.offer.airlineCode];
  const legs = draft.offer.legs;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const trip = draft.criteria.trip;
  const title =
    trip === "multicity"
      ? [...legs.map((l) => airportCityOf(l.from)), airportCityOf(last.to)].join(" → ")
      : `${first.fromCity} ${trip === "return" ? "⇄" : "→"} ${first.toCity}`;
  const tripLabel = trip === "return" ? "Return" : trip === "oneway" ? "One way" : "Multi-city";
  const dates = trip === "return" ? `${formatDateMed(first.departLocal)} – ${formatDateMed(legs[1].departLocal)}` : formatDateMed(first.departLocal);
  const pnr = newPnr();
  const booking: FlightBooking = {
    id: ref,
    product: "flight",
    status: opts.status ?? "ticketed",
    createdAt: now.toISOString(),
    currency: opts.currency,
    pricing,
    contact: draft.contact,
    customerEmail: draft.contact.email.toLowerCase(),
    leadLastName: draft.passengers[0].lastName,
    userId: opts.userId,
    payment: { ...opts.payment, amount: pricing.total, currency: opts.currency },
    invoiceNo: newInvoiceNo(),
    timeline: timeline(now, [
      { label: "Booking created", detail: `Reference ${ref}`, offsetSec: 0 },
      { label: "Payment captured", detail: cardLine(opts.payment), offsetSec: 14 },
      { label: "PNR confirmed", detail: `${airline?.name ?? "Airline"} confirmed reservation ${pnr}`, offsetSec: 31 },
      { label: "E-tickets issued", detail: `${draft.passengers.length} ticket${draft.passengers.length > 1 ? "s" : ""} issued`, offsetSec: 58 },
    ]),
    emails: [{ at: new Date(now.getTime() + 60_000).toISOString(), type: "Booking confirmation & e-ticket", to: draft.contact.email }],
    title,
    subtitle: `${tripLabel} · ${dates} · ${draft.offer.airlineName}`,
    startDate: first.departLocal.slice(0, 10),
    endDate: last.arriveLocal.slice(0, 10),
    travellerCount: draft.passengers.length,
    demoSeed: opts.demoSeed,
    pnr,
    criteria: draft.criteria,
    offer: draft.offer,
    fare,
    passengers: draft.passengers.map((p) => ({ ...p, ticketNumber: newTicketNumber(airline?.numeric ?? "176") })),
    extras: draft.extras,
  };
  save(booking);
  const href = `/account/bookings/${ref}`;
  notify(opts.userId, opts.notify, [
    { kind: "booking", title: "Booking confirmed", body: `${title} · reference ${ref}`, href, at: now.toISOString() },
    {
      kind: "payment",
      title: "Payment received",
      body: `${formatCurrency(pricing.total, opts.currency, { decimals: 2 })} captured for ${ref}`,
      href,
      at: new Date(now.getTime() + 14_000).toISOString(),
    },
    { kind: "ticket", title: "E-tickets issued", body: `Your e-tickets for ${title} are ready to download`, href: "/account/documents", at: new Date(now.getTime() + 58_000).toISOString() },
  ]);
  return booking;
}

export function createHotelBooking(draft: HotelDraft, opts: CreateBookingOptions): HotelBooking {
  const now = opts.now ?? new Date();
  const hotel = getHotel(draft.hotelId)!;
  const pricing = calcHotelPricing(draft.quote, opts.currency, opts.member);
  const ref = opts.ref ?? newBookingRef();
  const confirmation = newHotelConfirmation();
  const payLater = draft.quote.payLater;
  const subtitle = `${draft.quote.nights} night${draft.quote.nights > 1 ? "s" : ""} · ${hotel.city} · ${formatDateMed(draft.criteria.checkIn)} – ${formatDateMed(draft.criteria.checkOut)}`;
  const booking: HotelBooking = {
    id: ref,
    product: "hotel",
    status: opts.status ?? "confirmed",
    createdAt: now.toISOString(),
    currency: opts.currency,
    pricing,
    contact: draft.contact,
    customerEmail: draft.contact.email.toLowerCase(),
    leadLastName: draft.guests[0].lastName,
    userId: opts.userId,
    payment: { ...opts.payment, amount: pricing.total, currency: opts.currency, status: payLater ? "pending" : opts.payment.status },
    invoiceNo: newInvoiceNo(),
    timeline: timeline(now, [
      { label: "Booking created", detail: `Reference ${ref}`, offsetSec: 0 },
      { label: payLater ? "Card guaranteed" : "Payment captured", detail: cardLine(opts.payment), offsetSec: 12 },
      { label: "Hotel confirmed", detail: `${hotel.name} confirmed reservation ${confirmation}`, offsetSec: 27 },
      { label: "Voucher issued", detail: "Show your voucher at check-in", offsetSec: 41 },
    ]),
    emails: [{ at: new Date(now.getTime() + 45_000).toISOString(), type: "Booking confirmation & voucher", to: draft.contact.email }],
    title: hotel.name,
    subtitle,
    startDate: draft.criteria.checkIn,
    endDate: draft.criteria.checkOut,
    travellerCount: draft.criteria.occupancy.adults + draft.criteria.occupancy.children,
    demoSeed: opts.demoSeed,
    confirmationNumber: confirmation,
    hotel: {
      id: hotel.id,
      name: hotel.name,
      stars: hotel.stars,
      address: hotel.address,
      city: hotel.city,
      country: hotel.country,
      image: hotel.images[0],
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      policies: hotel.policies,
      distanceLabel: hotel.distanceLabel,
      phone: "+971 4 555 0118",
    },
    criteria: draft.criteria,
    quote: draft.quote,
    meal: draft.quote.meal,
    guests: draft.guests,
    specialRequests: draft.specialRequests,
    requestNotes: draft.requestNotes,
    arrivalTime: draft.arrivalTime,
  };
  save(booking);
  const href = `/account/bookings/${ref}`;
  notify(opts.userId, opts.notify, [
    { kind: "booking", title: "Hotel booking confirmed", body: `${hotel.name} · ${subtitle}`, href, at: now.toISOString() },
    {
      kind: "payment",
      title: payLater ? "Card guaranteed" : "Payment received",
      body: `${formatCurrency(pricing.total, opts.currency, { decimals: 2 })} for ${ref}`,
      href,
      at: new Date(now.getTime() + 12_000).toISOString(),
    },
  ]);
  return booking;
}

export function createUmrahBooking(draft: UmrahDraft, opts: CreateBookingOptions): UmrahBooking {
  const now = opts.now ?? new Date();
  const pkg = getUmrahPackage(draft.packageId)!;
  const input = resolveUmrahPricingInput(pkg, draft.config);
  const pricing = calcUmrahPricing(input, opts.currency, opts.member);
  const ref = opts.ref ?? newBookingRef();
  const confirmation = `UM${newHotelConfirmation().slice(2)}`;
  const booking: UmrahBooking = {
    id: ref,
    product: "umrah",
    status: opts.status ?? "confirmed",
    createdAt: now.toISOString(),
    currency: opts.currency,
    pricing,
    contact: draft.contact,
    customerEmail: draft.contact.email.toLowerCase(),
    leadLastName: draft.travellers[0].lastName,
    userId: opts.userId,
    payment: { ...opts.payment, amount: pricing.total, currency: opts.currency },
    invoiceNo: newInvoiceNo(),
    timeline: timeline(now, [
      { label: "Booking created", detail: `Reference ${ref}`, offsetSec: 0 },
      { label: "Payment captured", detail: cardLine(opts.payment), offsetSec: 15 },
      { label: "Hotels confirmed", detail: `${input.makkahHotel.name} & ${input.madinahHotel.name}`, offsetSec: 33 },
      { label: "Visa documents requested", detail: "We've emailed the passport checklist", offsetSec: 52 },
    ]),
    emails: [{ at: new Date(now.getTime() + 60_000).toISOString(), type: "Umrah booking confirmation & checklist", to: draft.contact.email }],
    title: pkg.name,
    subtitle: `${pkg.nights} nights · ${draft.config.departureCity} · departs ${formatDateMed(draft.config.departureDate)}`,
    startDate: draft.config.departureDate,
    endDate: addDaysISO(draft.config.departureDate, pkg.nights),
    travellerCount: draft.travellers.length,
    demoSeed: opts.demoSeed,
    confirmationNumber: confirmation,
    package: pkg,
    config: draft.config,
    makkahHotel: input.makkahHotel,
    madinahHotel: input.madinahHotel,
    flight: input.flight,
    transfer: input.transfer,
    extras: input.extras,
    travellers: draft.travellers,
    visaStatus: "documents_requested",
    notes: draft.notes,
  };
  save(booking);
  const href = `/account/bookings/${ref}`;
  notify(opts.userId, opts.notify, [
    { kind: "booking", title: "Umrah booking confirmed", body: `${pkg.name} · reference ${ref}`, href, at: now.toISOString() },
    {
      kind: "payment",
      title: "Payment received",
      body: `${formatCurrency(pricing.total, opts.currency, { decimals: 2 })} for ${ref}`,
      href,
      at: new Date(now.getTime() + 15_000).toISOString(),
    },
    {
      kind: "trip",
      title: "Action needed: visa documents",
      body: "Upload passport copies so we can start your Umrah visa applications.",
      href,
      at: new Date(now.getTime() + 52_000).toISOString(),
    },
  ]);
  return booking;
}

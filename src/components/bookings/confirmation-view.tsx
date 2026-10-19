"use client";

import Link from "next/link";
import { Check, FileText, Home, Mail, Receipt, Ticket } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/engine/currency";
import type { Booking } from "@/lib/types/booking";
import { FlightBookingSummary } from "./flight-booking-summary";
import { DocumentsPanel, Panel, PaymentPanel, StatusBadge, SupportPanel, TimelineView, resendEmail } from "./panels";
import { HotelBookingSummary, UmrahBookingSummary } from "./stay-booking-summaries";

export function BookingSummary({ booking }: { booking: Booking }) {
  if (booking.product === "flight") return <FlightBookingSummary booking={booking} />;
  if (booking.product === "hotel") return <HotelBookingSummary booking={booking} />;
  return <UmrahBookingSummary booking={booking} />;
}

const NEXT_STEPS = {
  flight: [
    "1. Check your email for e-tickets and your itinerary receipt.",
    "2. Online check-in opens 24–48 hours before departure.",
    "3. Arrive at the airport 3 hours before an international flight.",
  ],
  hotel: ["1. Your voucher has been emailed — show it at check-in.", "2. Contact the hotel directly for late arrivals.", "3. Cancel or change from your booking before the free-cancellation deadline."],
  umrah: [
    "1. Send passport scans and photos for every traveller within 48 hours.",
    "2. Your visa is processed in 3–5 working days.",
    "3. Flight tickets and the final itinerary are issued 14 days before departure.",
  ],
};

function firstName(b: Booking) {
  return (b.product === "flight" ? b.passengers[0]?.firstName : b.product === "umrah" ? b.travellers[0]?.firstName : b.guests[0]?.firstName) ?? "traveller";
}

export function ConfirmationView({ booking, signedIn }: { booking: Booking; signedIn: boolean }) {
  const simulated=booking.providerMode==="simulated";
  const isFlight = booking.product === "flight";
  const docHref = isFlight ? `/documents/eticket/${booking.id}` : `/documents/voucher/${booking.id}`;
  const viewHref = signedIn ? `/account/bookings/${booking.id}` : `/manage-booking/${booking.id}`;
  const pending = booking.payment.status === "pending";
  const tiles = [
    { label: "Booking reference", value: booking.id, mono: true },
    { label: isFlight ? "Airline PNR" : "Confirmation no.", value: booking.product === "flight" ? booking.pnr : booking.confirmationNumber, mono: true },
    { label: pending ? "Due at property" : "Total paid", value: formatCurrency(booking.pricing.total, booking.currency, { decimals: 2 }) },
  ];
  return (
    <div>
      <section className="mb-8 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <div className="p-6 sm:p-10">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <Check className="h-9 w-9" strokeWidth={3} aria-hidden />
            </span>
            <div>
              <Badge tone="success" className="mb-2">
                {pending ? "Reservation confirmed" : "Payment received"}
              </Badge>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Booking confirmed</h1>
              <p className="mt-1.5 text-[15px] text-slate-600">
                Thank you, {firstName(booking)}. {simulated ? <>This is a simulated confirmation. No real card was charged, reservation made or email sent. Contact: <b className="text-navy-900">{booking.customerEmail}</b>.</> : <>We’ve sent your {isFlight ? "e-tickets" : "voucher"} and receipt to <b className="text-navy-900">{booking.customerEmail}</b>.</>}
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-lg border border-emerald-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.label}</p>
                <p className={t.mono ? "mt-1 font-mono text-2xl font-extrabold tracking-wide text-navy-900" : "mt-1 text-2xl font-extrabold text-navy-900 tnum"}>{t.value}</p>
              </div>
            ))}
            <div className="rounded-lg border border-emerald-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-2">
                <StatusBadge status={booking.status} />
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={viewHref} size="lg" leftIcon={<Ticket className="h-4 w-4" />}>
              View booking
            </ButtonLink>
            <ButtonLink href={docHref} target="_blank" size="lg" variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
              {isFlight ? "View / download e-ticket" : "View / download voucher"}
            </ButtonLink>
            <ButtonLink href={`/documents/invoice/${booking.id}`} target="_blank" size="lg" variant="outline" leftIcon={<Receipt className="h-4 w-4" />}>
              View / download invoice
            </ButtonLink>
            <Button size="lg" variant="outline" disabled={simulated} onClick={() => resendEmail(booking, "Booking confirmation (resent)")} leftIcon={<Mail className="h-4 w-4" />}>
              Email confirmation
            </Button>
            <ButtonLink href="/" size="lg" variant="ghost" leftIcon={<Home className="h-4 w-4" />}>
              Return home
            </ButtonLink>
          </div>
        </div>
      </section>
      {!signedIn && (
        <InlineNotice tone="info" title="Keep your booking safe" className="mb-6">
          {simulated ? <>Save your reference <b>{booking.id}</b> and keep this browser session to reopen this confirmation.</> : <>Save your reference <b>{booking.id}</b> — you can always find this booking under{" "}
          <Link href="/manage-booking" className="font-bold underline">
            Manage booking
          </Link>{" "}
          with your last name. Or{" "}
          <Link href={`/sign-up?email=${encodeURIComponent(booking.customerEmail)}`} className="font-bold underline">
            create an account
          </Link>{" "}
          with the same email to see all your trips in one place.</>}
        </InlineNotice>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <BookingSummary booking={booking} />
          <PaymentPanel booking={booking} />
        </div>
        <aside className="space-y-6">
          <Panel title="What happens next" id="next-h">
            <ol className="space-y-3 text-[13px] text-slate-700">
              {(simulated ? ["This confirmation is simulated; no live booking or visa application was submitted.","No email was delivered and no real money was taken.","Keep this confirmation and booking reference."] : NEXT_STEPS[booking.product]).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Panel>
          <Panel title="Booking timeline" id="tl-h">
            <TimelineView events={booking.timeline} />
          </Panel>
          <DocumentsPanel booking={booking} />
          <SupportPanel booking={booking} />
        </aside>
      </div>
    </div>
  );
}

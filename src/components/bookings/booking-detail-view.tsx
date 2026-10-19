"use client";

import Link from "next/link";
import { BedDouble, CalendarClock, Copy, Download, Mail, Moon, Plane, Receipt, RefreshCcw, Settings2, Undo2, XCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { STATUS_META, PRODUCT_LABEL } from "@/lib/engine/bookings/status";
import { formatCurrency } from "@/lib/engine/currency";
import { formatDateTimeMed } from "@/lib/engine/dates";
import { useAccountStore, useBookingsStore } from "@/lib/stores/bookings";
import type { Booking, ServiceRequest } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { BookingSummary } from "./confirmation-view";
import { BackLink, DocumentsPanel, Panel, PaymentPanel, StatusBadge, SupportPanel, TimelineView } from "./panels";

const PRODUCT_ICON = { flight: Plane, hotel: BedDouble, umrah: Moon };

/** Statuses after which the booking can't be changed or cancelled any more. */
export const isClosed = (b: Pick<Booking, "status">) => ["cancelled", "refunded", "completed"].includes(b.status);

export type BookingMode = "guest" | "account";

/** Where a booking's pages live: under the account area or the guest Manage Booking section. */
export function bookingPaths(mode: BookingMode, ref: string) {
  return mode === "account"
    ? { basePath: `/account/bookings/${ref}`, backHref: "/account/bookings", backLabel: "My bookings" }
    : { basePath: `/manage-booking/${ref}`, backHref: "/manage-booking", backLabel: "Manage booking" };
}

function CopyChip({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="group flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-left hover:bg-slate-100"
      aria-label={`Copy ${label} ${value}`}
    >
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="font-mono text-[15px] font-extrabold tracking-wide text-navy-900">{value}</span>
      </span>
      <Copy className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" aria-hidden />
    </button>
  );
}

function ManagePanel({ booking, basePath }: { booking: Booking; basePath: string }) {
  const open = !isClosed(booking);
  const isFlight = booking.product === "flight";
  return (
    <Panel title="Manage your booking" id="mg-h">
      <div className="flex flex-col gap-2.5">
        <ButtonLink
          href={isFlight ? `/documents/eticket/${booking.id}` : `/documents/voucher/${booking.id}`}
          target="_blank"
          block
          leftIcon={<Download className="h-4 w-4" />}
        >
          {isFlight ? "Download e-ticket" : "Download voucher"}
        </ButtonLink>
        <div className="grid grid-cols-2 gap-2.5">
          <ButtonLink href={`/documents/invoice/${booking.id}`} target="_blank" variant="outline" leftIcon={<Receipt className="h-4 w-4" />}>
            Invoice
          </ButtonLink>
          <Button
            variant="outline"
            disabled={booking.providerMode === "simulated"}
            onClick={() => {
              useBookingsStore.getState().updateBooking(booking.id, (b) => ({
                ...b,
                emails: [...b.emails, { at: new Date().toISOString(), type: isFlight ? "E-ticket (resent)" : "Voucher (resent)", to: b.customerEmail }],
              }));
              toast.success(`Sent to ${booking.customerEmail} (simulated)`);
            }}
            leftIcon={<Mail className="h-4 w-4" />}
          >
            Email
          </Button>
        </div>
        <hr className="my-1 border-slate-100" />
        <ButtonLink href={`${basePath}/manage`} variant="subtle" block leftIcon={<Settings2 className="h-4 w-4" />} disabled={!open}>
          Manage booking
        </ButtonLink>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-1">
          <ButtonLink href={`${basePath}/manage?tab=change`} variant="ghost" block leftIcon={<CalendarClock className="h-4 w-4" />} disabled={!open}>
            Request change
          </ButtonLink>
          <ButtonLink href={`${basePath}/cancel?type=cancellation`} variant="ghost" block leftIcon={<XCircle className="h-4 w-4" />} disabled={!open}>
            Request cancellation
          </ButtonLink>
          <ButtonLink
            href={`${basePath}/cancel?type=refund`}
            variant="ghost"
            block
            leftIcon={<Undo2 className="h-4 w-4" />}
            disabled={!open && booking.status !== "cancelled"}
          >
            Request refund
          </ButtonLink>
        </div>
        {!open && <p className="text-xs text-slate-500">This booking is {STATUS_META[booking.status].label.toLowerCase()}, so changes are no longer available.</p>}
      </div>
    </Panel>
  );
}

const requestTitle = (r: ServiceRequest) =>
  `${r.kind === "change" ? "Change request" : r.kind === "cancellation" ? "Cancellation request" : "Refund request"} ${r.id} · ${r.status.replace("_", " ")}`;

/** A booking's full page: header with references, open requests, itinerary, payment and the manage/support sidebar. */
export function BookingDetailView({
  booking,
  mode,
  basePath,
  backHref,
  backLabel,
}: {
  booking: Booking;
  mode: BookingMode;
  basePath: string;
  backHref: string;
  backLabel: string;
}) {
  const Icon = PRODUCT_ICON[booking.product];
  const requests = useAccountStore((s) => s.requests).filter((r) => r.bookingId === booking.id);
  return (
    <div>
      <BackLink href={backHref}>{backLabel}</BackLink>
      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                booking.product === "umrah" ? "bg-umrah-50 text-umrah-800" : "bg-brand-50 text-brand-600",
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{PRODUCT_LABEL[booking.product]}</p>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-[28px]">{booking.title}</h1>
              <p className="mt-1 text-sm text-slate-600">{booking.subtitle}</p>
              <p className="mt-1 text-xs text-slate-400">
                Booked {formatDateTimeMed(booking.createdAt)} · {booking.travellerCount} traveller{booking.travellerCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={booking.status} />
            <p className="text-right">
              <span className="block text-xs text-slate-500">Total {booking.payment.status === "refunded" ? "(refunded)" : "paid"}</span>
              <span className="text-2xl font-extrabold text-navy-900 tnum">{formatCurrency(booking.pricing.total, booking.currency, { decimals: 2 })}</span>
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <CopyChip label="Booking reference" value={booking.id} />
            {booking.product === "flight" ? <CopyChip label="Airline PNR" value={booking.pnr} /> : <CopyChip label="Confirmation no." value={booking.confirmationNumber} />}
          </div>
        </div>
      </header>
      {requests.length > 0 && (
        <div className="mb-6 space-y-2">
          {requests.map((r) => (
            <InlineNotice
              key={r.id}
              tone={r.status === "processed" || r.status === "approved" ? "success" : "info"}
              icon={<RefreshCcw className="h-4 w-4" />}
              title={requestTitle(r)}
            >
              Submitted {formatDateTimeMed(r.createdAt)}.{" "}
              {mode === "account" ? (
                <Link href="/account/refunds" className="font-bold underline">
                  View request
                </Link>
              ) : (
                "We'll email you as it progresses."
              )}
            </InlineNotice>
          ))}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <BookingSummary booking={booking} />
          <PaymentPanel booking={booking} />
        </div>
        <aside className="space-y-6">
          <ManagePanel booking={booking} basePath={basePath} />
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

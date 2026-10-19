"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, CreditCard, FileText, Mail, MessageCircle, Printer, Receipt, Ticket, Wallet, type LucideIcon } from "lucide-react";
import { PriceBreakdownView } from "@/components/checkout/summary";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { STATUS_META } from "@/lib/engine/bookings/status";
import { formatDateTimeMed } from "@/lib/engine/dates";
import { useBookingsStore } from "@/lib/stores/bookings";
import type { Booking, BookingStatus, PaymentRecord, TimelineEvent } from "@/lib/types/booking";
import { cn } from "@/lib/utils";

/** White card with a titled header row; the building block of booking pages. */
export function Panel({ title, icon, action, children, className, id }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id: string }) {
  return (
    <section aria-labelledby={id} className={cn("rounded-xl border border-slate-200 bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 id={id} className="flex items-center gap-2.5 text-[16px] font-bold text-navy-900">
          {icon && <span className="text-slate-400">{icon}</span>}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function paymentMethodLabel(p: Pick<PaymentRecord, "method" | "brand" | "last4">) {
  return p.method === "apple_pay" ? "Apple Pay (demo)" : p.method === "google_pay" ? "Google Pay (demo)" : `${p.brand ?? "Card"} ending ${p.last4}`;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-600">
      ← {children}
    </Link>
  );
}

/** Logs a simulated email on the booking and confirms with a toast. */
export function resendEmail(booking: Booking, type: string) {
  if(booking.providerMode === "simulated"){toast.info("Simulated confirmation only. No email was sent.");return;}
  useBookingsStore.getState().updateBooking(booking.id, (b) => ({ ...b, emails: [...b.emails, { at: new Date().toISOString(), type, to: b.customerEmail }] }));
  toast.success(`Confirmation sent to ${booking.customerEmail} (simulated)`);
}

export function DocumentsPanel({ booking }: { booking: Booking }) {
  const ref = booking.id;
  const docs: { href: string; label: string; icon: LucideIcon }[] = [
    booking.product === "flight"
      ? { href: `/documents/eticket/${ref}`, label: "E-ticket & itinerary receipt", icon: Ticket }
      : booking.product === "hotel"
        ? { href: `/documents/voucher/${ref}`, label: "Hotel booking voucher", icon: Ticket }
        : { href: `/documents/voucher/${ref}`, label: "Umrah booking voucher & itinerary", icon: Ticket },
    { href: `/documents/invoice/${ref}`, label: "Tax invoice", icon: Receipt },
  ];
  return (
    <Panel title="Documents" icon={<FileText className="h-5 w-5" />} id="docs-h">
      <ul className="divide-y divide-slate-100">
        {docs.map((d) => (
          <li key={d.href} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
            <span className="flex items-center gap-3 text-sm font-semibold text-navy-900">
              <d.icon className="h-5 w-5 text-brand-500" aria-hidden /> {d.label}
            </span>
            <span className="flex gap-2">
              <ButtonLink href={d.href} target="_blank" size="sm" variant="outline" leftIcon={<Printer className="h-3.5 w-3.5" />}>
                View / print
              </ButtonLink>
            </span>
          </li>
        ))}
        <li className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <span className="flex items-center gap-3 text-sm font-semibold text-navy-900">
            <Mail className="h-5 w-5 text-brand-500" aria-hidden /> Email documents to {booking.customerEmail}
          </span>
          <Button size="sm" variant="subtle" disabled={booking.providerMode === "simulated"} onClick={() => resendEmail(booking, booking.product === "flight" ? "E-ticket & invoice (resent)" : "Voucher & invoice (resent)")}>
            Send email
          </Button>
        </li>
      </ul>
      {booking.emails.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="mb-1 font-bold uppercase tracking-wide text-slate-400">Email log (simulated)</p>
          {booking.emails.slice(-3).map((e, i) => (
            <p key={i}>
              {formatDateTimeMed(e.at)} · {e.type} → {e.to}
            </p>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      {children}
    </div>
  );
}

export function PaymentPanel({ booking }: { booking: Booking }) {
  const p = booking.payment;
  const tone = p.status === "captured" ? "success" : p.status === "refunded" || p.status === "partially_refunded" ? "neutral" : "warning";
  const label = p.status === "captured" ? "Paid" : p.status === "refunded" ? "Refunded" : p.status === "partially_refunded" ? "Part refunded" : "Pay at property";
  return (
    <Panel title="Payment & price" icon={<CreditCard className="h-5 w-5" />} id="pay-h">
      <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <Term label="Method">
          <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-navy-900">
            <Wallet className="h-4 w-4 text-slate-400" aria-hidden /> {paymentMethodLabel(p)}
          </dd>
        </Term>
        <Term label="Status">
          <dd className="mt-0.5">
            <Badge tone={tone}>{label}</Badge>
          </dd>
        </Term>
        <Term label="Transaction">
          <dd className="mt-0.5 font-mono text-[13px] font-semibold text-navy-900">{p.transactionId}</dd>
        </Term>
        <Term label={p.status === "pending" ? "Payment due" : "Paid on"}>
          <dd className="mt-0.5 font-semibold text-navy-900 tnum">{p.status === "pending" ? "At the hotel" : formatDateTimeMed(p.paidAt)}</dd>
        </Term>
        <Term label="Invoice">
          <dd className="mt-0.5 font-semibold text-navy-900">{booking.invoiceNo}</dd>
        </Term>
      </dl>
      <PriceBreakdownView breakdown={booking.pricing} totalLabel={p.status === "pending" ? "Due at property" : p.status === "refunded" ? "Total (refunded)" : "Total paid"} />
    </Panel>
  );
}

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} className={cn("!px-2 !py-1 !text-xs", className)}>
      {meta.label}
    </Badge>
  );
}

export function SupportPanel({ booking }: { booking: Booking }) {
  return (
    <Panel title="Need help?" icon={<MessageCircle className="h-5 w-5" />} id="sup-h">
      <p className="text-sm text-slate-600">
        Quote reference <b className="text-navy-900">{booking.id}</b> when you contact us so we can help faster.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/help/contact?booking=${booking.id}`} size="sm" variant="outline">
          Message support
        </ButtonLink>
        <ButtonLink href="/help" size="sm" variant="ghost">
          Help centre
        </ButtonLink>
      </div>
    </Panel>
  );
}

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={cn(
              "absolute -left-[33px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white",
              e.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300",
            )}
          >
            {e.done && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
          </span>
          <p className={cn("text-sm font-bold", e.done ? "text-navy-900" : "text-slate-400")}>{e.label}</p>
          {e.detail && <p className="text-[13px] text-slate-600">{e.detail}</p>}
          <p className="text-xs text-slate-400 tnum">{e.done ? formatDateTimeMed(e.at) : "Pending"}</p>
        </li>
      ))}
    </ol>
  );
}

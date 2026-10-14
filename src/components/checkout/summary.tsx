"use client";

import { useState, type ReactNode } from "react";
import { ChevronUp, ShieldCheck, Tag } from "lucide-react";
import { AirlineMark } from "@/components/brand";
import { Money } from "@/components/money";
import { Drawer } from "@/components/ui/overlay";
import { formatCurrency } from "@/lib/engine/currency";
import { formatDayShort, formatTime } from "@/lib/engine/dates";
import type { PriceBreakdown } from "@/lib/engine/pricing";
import type { Offer, Pax } from "@/lib/types/flights";
import { cn, plural } from "@/lib/utils";

const GROUP_ORDER = ["base", "taxes", "extras", "fee", "discount"] as const;

/** Price lines grouped fare → taxes → extras → service → savings, then the total. */
export function PriceBreakdownView({ breakdown, className, totalLabel = "Total to pay" }: { breakdown: PriceBreakdown; className?: string; totalLabel?: string }) {
  const currency = breakdown.currency;
  const lines = GROUP_ORDER.flatMap((kind) => breakdown.lines.filter((l) => l.kind === kind));
  return (
    <div className={className}>
      <dl className="space-y-2.5 text-[13px]">
        {lines.map((l) => (
          <div key={l.id} className="flex items-start justify-between gap-3">
            <dt className="min-w-0 text-slate-600">
              <span className={cn(l.kind === "discount" && "font-semibold text-emerald-700")}>{l.label}</span>
              {l.detail && <span className="block text-xs text-slate-400">{l.detail}</span>}
            </dt>
            <dd className={cn("shrink-0 font-semibold tnum", l.kind === "discount" ? "text-emerald-700" : "text-navy-900")}>
              {l.amount < 0 ? "−" : ""}
              {formatCurrency(Math.abs(l.amount), currency, { decimals: 2 })}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
        <span className="text-[15px] font-bold text-navy-900">{totalLabel}</span>
        <span className="text-2xl font-extrabold text-navy-900 tnum">{formatCurrency(breakdown.total, currency, { decimals: 2 })}</span>
      </div>
    </div>
  );
}

export function FlightTripSummary({ offer, pax }: { offer: Offer; pax: Pax }) {
  const travellers = pax.adults + pax.children + pax.infants;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <AirlineMark code={offer.airlineCode} />
        <div className="leading-tight">
          <p className="text-sm font-bold text-navy-900">{offer.airlineName}</p>
          <p className="text-xs capitalize text-slate-500">
            {offer.cabin.replace("_", " ")} · {plural(travellers, "passenger")}
          </p>
        </div>
      </div>
      <ul className="space-y-3">
        {offer.legs.map((leg) => (
          <li key={leg.id} className="text-[13px]">
            <p className="font-bold text-navy-900">
              {leg.fromCity} → {leg.toCity}
            </p>
            <p className="text-slate-600 tnum">
              {formatDayShort(leg.departLocal)} · {formatTime(leg.departLocal)} {leg.from} – {formatTime(leg.arriveLocal)} {leg.to}
              {leg.arrivalDayOffset > 0 && <sup className="font-bold text-red-600"> +{leg.arrivalDayOffset}</sup>}
            </p>
            <p className="text-xs text-slate-500">{leg.stops === 0 ? "Direct" : `${leg.stops} stop · ${leg.layovers.map((l) => l.airport).join(", ")}`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sticky total at the bottom of the screen below `lg`; tapping it opens the full summary. */
export function MobileSummaryBar({ breakdown, children, label = "Total" }: { breakdown: PriceBreakdown; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_20px_-12px_rgba(7,31,66,0.3)] backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between" aria-label="View price details">
          <span className="text-left">
            <span className="block text-xs font-medium text-slate-500">{label}</span>
            <span className="text-xl font-extrabold text-navy-900 tnum">
              <Money amount={breakdown.total} currency={breakdown.currency} decimals={2} />
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-brand-600">
            Price details <ChevronUp className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />
      <Drawer open={open} onOpenChange={setOpen} title="Booking summary" side="bottom">
        <div className="p-4">{children}</div>
      </Drawer>
    </>
  );
}

/** "Your booking" card: optional header and body sections, the price breakdown, then a footer slot. */
export function SummaryPanel({
  title = "Your booking",
  header,
  breakdown,
  children,
  footer,
  className,
}: {
  title?: string;
  header?: ReactNode;
  breakdown: PriceBreakdown;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <aside aria-label="Booking summary" className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white", className)}>
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <h2 className="text-[15px] font-bold text-navy-900">{title}</h2>
      </div>
      {header && <div className="border-b border-slate-100 p-5">{header}</div>}
      {children && <div className="border-b border-slate-100 p-5">{children}</div>}
      <div className="p-5">
        <PriceBreakdownView breakdown={breakdown} />
        {breakdown.discount > 0 && (
          <p className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
            <Tag className="h-3.5 w-3.5" aria-hidden /> You’re saving {formatCurrency(breakdown.discount, breakdown.currency, { decimals: 2 })} as a member
          </p>
        )}
        {footer}
      </div>
      <p className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> Final price, no hidden fees. Taxes and service fee included above.
      </p>
    </aside>
  );
}

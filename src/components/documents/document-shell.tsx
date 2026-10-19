"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { CheaperflyLogo } from "@/components/brand";
import { BookingGate } from "@/components/bookings/booking-gate";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/types/booking";

/** Deterministic decorative barcode (seeded from `value`); not a scannable code. */
export function Barcode({ value, className = "" }: { value: string; className?: string }) {
  let seed = 0;
  for (let i = 0; i < value.length; i++) seed = (31 * seed + value.charCodeAt(i)) >>> 0;
  const widths: number[] = [];
  for (let i = 0; i < 64; i++) {
    seed = (1664525 * seed + 0x3c6ef35f) >>> 0;
    widths.push(1 + (seed % 3));
  }
  let x = 0;
  return (
    <svg viewBox="0 0 220 44" className={className} role="img" aria-label={`Sample barcode for ${value}`}>
      {widths.map((w, i) => {
        const rect = <rect key={i} x={x} y={0} width={w} height={44} fill={i % 2 === 0 ? "#071F42" : "transparent"} />;
        x += w + 0.6;
        return rect;
      })}
    </svg>
  );
}

/** Grey print-preview backdrop with "Print / Save as PDF"; the booking is gated like the confirmation. */
export function DocumentShell({ reference, documentKind, children }: { reference: string; documentKind: 'invoice'|'eticket'|'voucher'; children: (b: Booking) => ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-200/70 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[860px] items-center justify-between gap-3 px-4">
        <Link href="/account/bookings" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to bookings
        </Link>
        <Button onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
          Print / Save as PDF
        </Button>
      </div>
      <div className="mx-auto max-w-[860px] px-4 print:max-w-none print:px-0">
        <BookingGate reference={reference} mode="document" documentKind={documentKind}>
          {children}
        </BookingGate>
      </div>
    </div>
  );
}

/** One printed page. */
export function Paper({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`print-page mb-6 break-after-page rounded-lg bg-white p-8 shadow-card last:break-after-auto sm:p-10 ${className}`}>{children}</article>;
}

export function PaperHeader({ title, subtitle, right }: { title: string; subtitle?: string; right: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b-2 border-navy-900 pb-5">
      <div>
        <CheaperflyLogo />
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title} · Simulated — not valid for travel</p>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      <div className="text-right text-xs leading-relaxed text-slate-600">{right}</div>
    </div>
  );
}

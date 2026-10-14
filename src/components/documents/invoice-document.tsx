"use client";

import { paymentMethodLabel } from "@/components/bookings/panels";
import { formatCurrency } from "@/lib/engine/currency";
import { formatDateMed, formatDateTimeMed } from "@/lib/engine/dates";
import { useSessionStore } from "@/lib/stores/session";
import type { Booking } from "@/lib/types/booking";
import { DocumentShell, Paper, PaperHeader } from "./document-shell";

function billedTo(b: Booking) {
  const lead = b.product === "flight" ? b.passengers[0] : b.product === "umrah" ? b.travellers[0] : b.guests[0];
  return `${lead.title} ${lead.firstName} ${lead.lastName}`;
}

function Invoice({ b }: { b: Booking }) {
  const profile = useSessionStore((s) => s.profile);
  const money = (n: number) => formatCurrency(n, b.currency, { decimals: 2 });
  // The account's billing address, when the invoice belongs to the signed-in customer.
  const address = profile && profile.email.toLowerCase() === b.customerEmail.toLowerCase() && profile.address.line1 ? profile.address : null;
  const paid = b.payment.status === "captured";
  const refunded = b.payment.status === "refunded";
  const category = (kind: string) =>
    kind === "fee" ? "Service fee" : kind === "taxes" ? "Taxes" : kind === "base" ? (b.product === "flight" ? "Base fare" : b.product === "hotel" ? "Accommodation" : "Package") : kind;
  return (
    <Paper>
      <PaperHeader
        title="Tax invoice"
        subtitle="Cheaperfly Travel Ltd (prototype entity) · VAT no. GB000 0000 00"
        right={
          <>
            <p>
              Invoice no. <b className="font-mono text-sm text-navy-900">{b.invoiceNo}</b>
            </p>
            <p>Invoice date {formatDateMed(b.createdAt)}</p>
            <p>
              Booking ref <b className="font-mono text-navy-900">{b.id}</b>
            </p>
          </>
        }
      />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed to</p>
          <p className="mt-1 text-[15px] font-bold text-navy-900">{billedTo(b)}</p>
          <p className="text-sm text-slate-600">{b.customerEmail}</p>
          <p className="text-sm text-slate-600">
            {b.contact.countryCode} {b.contact.mobile}
          </p>
          {address && (
            <p className="mt-1 text-sm text-slate-600">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}, {address.city} {address.postcode}
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment</p>
          <p className="mt-1 text-sm font-semibold text-navy-900">{paymentMethodLabel(b.payment)}</p>
          <p className="text-sm text-slate-600">Transaction {b.payment.transactionId}</p>
          <p className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-700">
            {refunded ? "Refunded" : paid ? "Paid" : "Payable at property"}
          </p>
        </div>
      </div>
      <p className="mt-7 text-sm font-semibold text-navy-900">
        {b.title} <span className="font-normal text-slate-500">· {b.subtitle}</span>
      </p>
      <table className="mt-3 w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-y border-slate-300 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2">Category</th>
            <th className="px-2 py-2 text-right">Amount ({b.currency})</th>
          </tr>
        </thead>
        <tbody>
          {b.pricing.lines.map((l) => (
            <tr key={l.id} className="border-b border-slate-200">
              <td className="px-2 py-2.5">
                <p className="font-semibold text-navy-900">{l.label}</p>
                {l.detail && <p className="text-xs text-slate-500">{l.detail}</p>}
              </td>
              <td className="px-2 py-2.5 capitalize text-slate-600">{category(l.kind)}</td>
              <td className={`px-2 py-2.5 text-right tnum ${l.amount < 0 ? "text-emerald-700" : ""}`}>{l.amount < 0 ? `−${money(Math.abs(l.amount))}` : money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-[15px] font-extrabold text-navy-900">
            <td colSpan={2} className="border-t-2 border-navy-900 px-2 pt-3 text-right">
              Total {refunded ? "(refunded)" : paid ? "paid" : "due"}
            </td>
            <td className="border-t-2 border-navy-900 px-2 pt-3 text-right tnum">{money(b.pricing.total)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-8 grid gap-4 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500 sm:grid-cols-2">
        <p>Amounts shown in {b.currency}. Taxes included in the price are shown above. Cheaperfly acts as an agent for airlines, hotels and Umrah suppliers.</p>
        <p className="sm:text-right">Generated {formatDateTimeMed(new Date().toISOString())}. Prototype document for demonstration only — not a real tax document.</p>
      </div>
    </Paper>
  );
}

export function InvoiceDocument({ reference }: { reference: string }) {
  return <DocumentShell reference={reference}>{(b) => <Invoice b={b} />}</DocumentShell>;
}

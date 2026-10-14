"use client";

import { useState } from "react";
import { FileText, Receipt, Search, Ticket } from "lucide-react";
import { StatusBadge } from "@/components/bookings/panels";
import { ButtonLink } from "@/components/ui/button";
import { TabList } from "@/components/ui/disclosure";
import { StateView } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { formatCurrency } from "@/lib/engine/currency";
import { formatDateMed } from "@/lib/engine/dates";
import type { Booking } from "@/lib/types/booking";
import { PageTitle } from "./account-shell";
import { useMyBookings } from "./my-bookings";

type Filter = "all" | "tickets" | "invoices";

interface DocRow {
  key: string;
  b: Booking;
  kind: "ticket" | "invoice";
  label: string;
  href: string;
}

/** Two documents per booking: the e-ticket or voucher, and the invoice. */
function documentsFor(b: Booking): DocRow[] {
  return [
    {
      key: `${b.id}-t`,
      b,
      kind: "ticket",
      label: b.product === "flight" ? "E-ticket & itinerary receipt" : b.product === "hotel" ? "Hotel voucher" : "Umrah voucher & itinerary",
      href: b.product === "flight" ? `/documents/eticket/${b.id}` : `/documents/voucher/${b.id}`,
    },
    { key: `${b.id}-i`, b, kind: "invoice", label: `Invoice ${b.invoiceNo}`, href: `/documents/invoice/${b.id}` },
  ];
}

export function DocumentsPage() {
  const { all } = useMyBookings();
  const [tab, setTab] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = all
    .flatMap(documentsFor)
    .filter((d) => tab === "all" || (tab === "tickets" ? d.kind === "ticket" : d.kind === "invoice"))
    .filter((d) => !q || `${d.b.id} ${d.b.title} ${d.label}`.toLowerCase().includes(q));

  return (
    <div>
      <PageTitle title="Documents" subtitle="E-tickets, vouchers and invoices for all your bookings. Print or save as PDF." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <TabList
          label="Document type"
          variant="pill"
          value={tab}
          onChange={(id) => setTab(id as Filter)}
          tabs={[
            { id: "all", label: "All" },
            { id: "tickets", label: "Tickets & vouchers" },
            { id: "invoices", label: "Invoices" },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <label htmlFor="doc-q" className="sr-only">
            Search documents
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input id="doc-q" type="search" placeholder="Search documents" className="h-10 pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      {rows.length === 0 ? (
        <StateView
          icon={<FileText className="h-7 w-7" />}
          title="No documents found"
          description="Documents appear here as soon as you make a booking."
          actions={<ButtonLink href="/flights">Search flights</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {rows.map((d) => (
            <li key={d.key} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${d.kind === "ticket" ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-600"}`}
              >
                {d.kind === "ticket" ? <Ticket className="h-5 w-5" aria-hidden /> : <Receipt className="h-5 w-5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy-900">{d.label}</p>
                <p className="truncate text-xs text-slate-500">
                  {d.b.title} · <span className="font-mono">{d.b.id}</span> · {formatDateMed(d.b.createdAt)}
                </p>
              </div>
              <StatusBadge status={d.b.status} />
              <span className="hidden text-sm font-bold text-navy-900 tnum sm:block">
                {d.kind === "invoice" ? formatCurrency(d.b.pricing.total, d.b.currency, { decimals: 2 }) : ""}
              </span>
              <ButtonLink href={d.href} target="_blank" size="sm" variant="outline">
                View / print
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

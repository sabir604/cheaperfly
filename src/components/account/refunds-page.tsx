"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Receipt } from "lucide-react";
import { TimelineView } from "@/components/bookings/panels";
import { Button, ButtonLink } from "@/components/ui/button";
import { TabList } from "@/components/ui/disclosure";
import { StateView } from "@/components/ui/feedback";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { advanceRequest } from "@/lib/engine/bookings/requests";
import { formatCurrency } from "@/lib/engine/currency";
import { formatDateTimeMed } from "@/lib/engine/dates";
import { useAccountStore } from "@/lib/stores/bookings";
import type { RequestStatus, ServiceRequest } from "@/lib/types/booking";
import { PageTitle } from "./account-shell";

const STATUS: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  submitted: { label: "Submitted", tone: "warning" },
  under_review: { label: "Under review", tone: "brand" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  processed: { label: "Processed", tone: "success" },
};

const Term = ({ children }: { children: string }) => <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</dt>;

function RequestCard({ r }: { r: ServiceRequest }) {
  const status = STATUS[r.status];
  const open = r.status !== "processed" && r.status !== "rejected";
  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-navy-900">{r.id}</span>
            <Badge tone="outline" className="capitalize">
              {r.kind}
            </Badge>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1.5 text-[16px] font-bold text-navy-900">{r.bookingTitle}</p>
          <p className="text-xs text-slate-500">
            Booking{" "}
            <Link href={`/account/bookings/${r.bookingId}`} className="font-mono font-bold text-brand-600 hover:underline">
              {r.bookingId}
            </Link>{" "}
            · Submitted {formatDateTimeMed(r.createdAt)}
          </p>
        </div>
        {r.refundEstimate && (
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{r.status === "processed" ? "Refunded" : "Estimated refund"}</p>
            <p className="text-2xl font-extrabold text-navy-900 tnum">{formatCurrency(r.refundEstimate.net, r.currency, { decimals: 2 })}</p>
          </div>
        )}
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_1fr]">
        <dl className="space-y-3 text-sm">
          {r.passengers.length > 0 && (
            <div>
              <Term>Covers</Term>
              <dd className="font-semibold text-navy-900">{r.passengers.join(", ")}</dd>
            </div>
          )}
          <div>
            <Term>Reason</Term>
            <dd className="font-semibold text-navy-900">{r.reason}</dd>
          </div>
          <div>
            <Term>Your message</Term>
            <dd className="italic text-slate-600">“{r.explanation}”</dd>
          </div>
          {r.changeDetails?.preferredDate && (
            <div>
              <Term>Preferred date</Term>
              <dd className="font-semibold text-navy-900">{r.changeDetails.preferredDate}</dd>
            </div>
          )}
        </dl>
        <TimelineView events={r.timeline} />
      </div>
      {open && (
        <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Demo: simulate the back office
          </span>
          <Button size="sm" variant="outline" onClick={() => advanceRequest(r.id, "next")}>
            Advance to next status
          </Button>
          <Button size="sm" variant="ghost" onClick={() => advanceRequest(r.id, "reject")}>
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

type Filter = "all" | "refunds" | "changes";

export function RefundsPage() {
  const requests = useAccountStore((s) => s.requests);
  const [tab, setTab] = useState<Filter>("all");
  const shown = requests.filter((r) => tab === "all" || (tab === "refunds" ? r.kind !== "change" : r.kind === "change"));
  return (
    <div>
      <PageTitle title="Refund Requests" subtitle="Track cancellations, refunds and change requests." />
      <TabList
        label="Request type"
        value={tab}
        onChange={(id) => setTab(id as Filter)}
        className="mb-5"
        tabs={[
          { id: "all", label: "All", count: requests.length },
          { id: "refunds", label: "Refunds & cancellations", count: requests.filter((r) => r.kind !== "change").length },
          { id: "changes", label: "Changes", count: requests.filter((r) => r.kind === "change").length },
        ]}
      />
      {shown.length === 0 ? (
        <StateView
          icon={<Receipt className="h-7 w-7" />}
          title="No requests yet"
          description="If you need to cancel, get a refund or change a booking, start from the booking page and we'll track it here."
          actions={<ButtonLink href="/account/bookings">Go to my bookings</ButtonLink>}
        />
      ) : (
        <ul className="space-y-5" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {shown.map((r) => (
            <RequestCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

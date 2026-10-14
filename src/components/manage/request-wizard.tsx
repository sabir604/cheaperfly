"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Info } from "lucide-react";
import { BackLink, Panel } from "@/components/bookings/panels";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/form";
import { submitRefundRequest } from "@/lib/engine/bookings/requests";
import { estimateRefund } from "@/lib/engine/bookings/status";
import { formatCurrency } from "@/lib/engine/currency";
import type { Booking, ServiceRequest } from "@/lib/types/booking";
import { cn } from "@/lib/utils";

const REASONS = [
  "Change of plans",
  "Medical or family emergency",
  "Schedule change by the supplier",
  "Visa or passport problem",
  "Found a better price",
  "Booked by mistake / duplicate booking",
  "Other",
];
const STEPS = ["Who", "Reason", "Review"];

/** The people a request can cover. Hotel requests always cover the whole reservation. */
function requestParties(b: Booking) {
  if (b.product === "flight") return b.passengers.map((p) => ({ id: p.id, name: `${p.title} ${p.firstName} ${p.lastName}`, sub: `${p.type} · ticket ${p.ticketNumber}` }));
  if (b.product === "umrah") return b.travellers.map((t) => ({ id: t.id, name: `${t.title} ${t.firstName} ${t.lastName}`, sub: t.type }));
  return b.guests.map((g, i) => ({ id: `g${i}`, name: `${g.title} ${g.firstName} ${g.lastName}`, sub: i === 0 ? "Lead guest" : "Guest" }));
}

const Term = ({ children }: { children: string }) => <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</dt>;

function Submitted({ booking, request, kind, basePath }: { booking: Booking; request: ServiceRequest; kind: string; basePath: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
        </span>
        <h1 className="text-2xl font-extrabold">Your {kind} request is submitted</h1>
        <p className="mt-2 text-slate-600">
          Case reference <b className="font-mono text-navy-900">{request.id}</b>. We’ll review it against the fare and supplier conditions and email{" "}
          <b>{booking.customerEmail}</b> with the outcome, usually within 2 working days.
        </p>
        <dl className="mx-auto mt-6 grid max-w-md gap-3 rounded-lg bg-white p-4 text-left text-sm sm:grid-cols-2">
          <div>
            <Term>Booking</Term>
            <dd className="font-bold text-navy-900">{booking.id}</dd>
          </div>
          <div>
            <Term>Status</Term>
            <dd className="font-bold text-amber-700">Submitted</dd>
          </div>
          <div>
            <Term>Estimated refund</Term>
            <dd className="font-bold text-navy-900 tnum">{formatCurrency(request.refundEstimate?.net ?? 0, booking.currency, { decimals: 2 })}</dd>
          </div>
          <div>
            <Term>Estimated time</Term>
            <dd className="font-bold text-navy-900">5–10 working days</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {basePath.startsWith("/account") && <ButtonLink href="/account/refunds">View my requests</ButtonLink>}
          <ButtonLink href={basePath} variant="outline">
            Back to booking
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/**
 * Three-step cancellation or refund request ending in an `RF-#####` case.
 * Original behaviour kept: any `?type=` other than `refund` (including `change`) runs as a cancellation.
 */
export function RequestWizard({ booking, kind, basePath }: { booking: Booking; kind: "cancellation" | "refund"; basePath: string }) {
  const parties = requestParties(booking);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(parties.map((p) => p.id));
  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ServiceRequest | null>(null);
  const isHotel = booking.product === "hotel";
  const covered = isHotel ? parties.map((p) => p.id) : selected;
  const estimate = estimateRefund(booking, covered);
  const isFlight = booking.product === "flight";

  function next() {
    const errs: Record<string, string> = {};
    if (step === 0 && !isHotel && selected.length === 0) errs.who = `Select at least one ${isFlight ? "passenger" : "traveller"}.`;
    if (step === 1) {
      if (!reason) errs.reason = "Choose a reason";
      if (explanation.trim().length < 15) errs.explanation = "Please explain in at least 15 characters so we can process this faster.";
    }
    setErrors(errs);
    if (!Object.keys(errs).length) setStep((s) => s + 1);
  }

  async function submit() {
    if (!ack) return setErrors({ ack: "Please confirm you understand the conditions." });
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    const request = submitRefundRequest(booking, { kind, passengerIds: covered, reason, explanation: explanation.trim() });
    setSubmitting(false);
    setSubmitted(request);
  }

  if (submitted) return <Submitted booking={booking} request={submitted} kind={kind} basePath={basePath} />;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={basePath}>Back to booking {booking.id}</BackLink>
      <h1 className="text-2xl font-extrabold sm:text-[28px]">Request {kind === "refund" ? "a refund" : "cancellation"}</h1>
      <p className="mb-6 mt-1 text-slate-600">
        {booking.title} · <span className="font-mono">{booking.id}</span>
      </p>
      <ol className="mb-6 flex items-center gap-3" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {i < step ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("hidden text-sm font-semibold sm:block", i === step ? "text-navy-900" : "text-slate-400")}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Panel title={isHotel ? "Cancel your stay" : `Who is this ${kind} for?`} id="rq-who">
          {isHotel ? (
            <p className="text-sm text-slate-700">
              The whole reservation at <b>{booking.title}</b> will be cancelled.
            </p>
          ) : (
            <fieldset>
              <legend className="sr-only">Select travellers</legend>
              <ul className="space-y-2.5">
                {parties.map((p) => (
                  <li key={p.id} className={cn("rounded-lg border-2 px-4 py-3", selected.includes(p.id) ? "border-brand-500 bg-brand-50" : "border-slate-200")}>
                    <Checkbox
                      checked={selected.includes(p.id)}
                      onChange={(e) => setSelected((all) => (e.target.checked ? [...all, p.id] : all.filter((x) => x !== p.id)))}
                      label={p.name}
                      description={p.sub}
                    />
                  </li>
                ))}
              </ul>
              {errors.who && (
                <p role="alert" className="mt-2 text-sm font-medium text-red-600">
                  {errors.who}
                </p>
              )}
            </fieldset>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={next}>Continue</Button>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Why are you asking?" id="rq-why">
          <div className="grid gap-5">
            <Field label="Reason" htmlFor="rf-reason" error={errors.reason} required>
              <Select id="rf-reason" invalid={!!errors.reason} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select a reason</option>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tell us more" htmlFor="rf-expl" error={errors.explanation} required hint={`${explanation.trim().length}/15 minimum characters`}>
              <Textarea
                id="rf-expl"
                rows={5}
                maxLength={600}
                invalid={!!errors.explanation}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Give us any detail that helps the supplier approve your request."
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={next}>Review request</Button>
          </div>
        </Panel>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Panel title="Review your request" id="rq-review">
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <Term>Request type</Term>
                <dd className="font-bold capitalize text-navy-900">{kind}</dd>
              </div>
              <div>
                <Term>Reason</Term>
                <dd className="font-bold text-navy-900">{reason}</dd>
              </div>
              <div className="sm:col-span-2">
                <Term>Covers</Term>
                <dd className="font-bold text-navy-900">
                  {parties
                    .filter((p) => covered.includes(p.id))
                    .map((p) => p.name)
                    .join(", ")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <Term>Your explanation</Term>
                <dd className="italic text-slate-700">“{explanation}”</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Estimated refund" id="rq-estimate">
            <ul className="space-y-2 text-sm">
              {estimate.lines.map((line, i) => (
                <li key={i} className={cn("flex justify-between gap-4", line.tone === "total" && "border-t border-slate-200 pt-3 text-base font-extrabold text-navy-900")}>
                  <span className={cn(line.tone === "neg" && "text-slate-600", line.tone === "total" && "text-navy-900")}>{line.label}</span>
                  <span
                    className={cn(
                      "tnum",
                      line.tone === "neg" && "text-red-600",
                      line.tone === "total" && (estimate.net > 0 ? "text-emerald-700" : "text-slate-700"),
                    )}
                  >
                    {line.amount < 0 ? "−" : ""}
                    {formatCurrency(Math.abs(line.amount), booking.currency, { decimals: 2 })}
                  </span>
                </li>
              ))}
            </ul>
            <InlineNotice tone={estimate.net > 0 ? "info" : "warning"} className="mt-5" icon={<Info className="h-4 w-4" />}>
              {estimate.note} The final amount is confirmed by the {isFlight ? "airline" : "supplier"}. Refunds go to your original payment method in 5–10 working days after
              approval.
            </InlineNotice>
          </Panel>
          <div className={cn("rounded-xl border bg-white p-5", errors.ack ? "border-red-400" : "border-slate-200")}>
            <Checkbox
              checked={ack}
              onChange={(e) => {
                setAck(e.target.checked);
                setErrors({});
              }}
              label={
                <span className="text-sm">
                  I understand this is a request, not an instant cancellation, and that the refund amount depends on the fare/supplier conditions. See our{" "}
                  <Link href="/legal/refund-policy" target="_blank" className="font-bold text-brand-600 underline">
                    refund policy
                  </Link>
                  .
                </span>
              }
            />
            {errors.ack && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-600">
                {errors.ack}
              </p>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="danger" loading={submitting} onClick={submit}>
              Submit {kind} request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

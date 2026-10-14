"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BaggageChips, LegRow } from "@/components/flights/leg";
import { useCurrency } from "@/components/money";
import { Button } from "@/components/ui/button";
import { countryName } from "@/data/countries";
import { ASSISTANCE_OPTIONS, baggageOptionById, mealOptionById } from "@/data/extras";
import { formatDateMed } from "@/lib/engine/dates";
import type { PriceBreakdown } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import type { FlightDraft } from "@/lib/types/booking";
import { FlightGuard } from "./flight-guard";
import { KeyValue, ReviewSection, TermsBox } from "./review-parts";
import { FlightTripSummary, MobileSummaryBar, SummaryPanel } from "./summary";
import { TYPE_LABEL } from "./traveller-fields";

function ReviewPage({ draft, breakdown }: { draft: FlightDraft; breakdown: PriceBreakdown }) {
  const router = useRouter();
  const { gbp, fmt } = useCurrency();
  const patchFlight = useDraftsStore((s) => s.patchFlight);
  const setActive = useDraftsStore((s) => s.setActive);
  const [termsError, setTermsError] = useState(false);
  const fare = draft.offer.fares.find((f) => f.id === draft.fareId)!;
  const legs = draft.offer.legs;
  const legLabel = (i: number) => (legs.length === 2 ? (i === 0 ? "Outbound" : "Return") : `Flight ${i + 1}`);
  const missingNames = draft.passengers.some((p) => !p.firstName || !p.lastName);
  const bags = draft.passengers.flatMap((p) =>
    Object.entries(draft.extras.baggage[p.id] ?? {})
      .map(([li, id]) => ({ p, li: Number(li), opt: baggageOptionById(id) }))
      .filter((b) => b.opt),
  );
  const seats = legs.flatMap((leg) =>
    leg.segments.flatMap((seg) => Object.entries(draft.extras.seats[seg.id] ?? {}).map(([paxId, sel]) => ({ seg, p: draft.passengers.find((x) => x.id === paxId)!, sel }))),
  );

  const onContinue = () => {
    if (missingNames) return router.push("/flights/book/passengers");
    if (!draft.termsAccepted) {
      setTermsError(true);
      document.getElementById("terms")?.focus();
      return;
    }
    setActive("flight");
    router.push("/checkout/payment");
  };

  const summary = <FlightTripSummary offer={draft.offer} pax={draft.criteria.pax} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Review your booking</h1>
        <p className="mt-1 text-slate-600">Check everything carefully. Use Edit on any section to change it — your other choices are kept.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ReviewSection id="r-itin" title="Flight itinerary" editHref={`/flights/fare/${draft.offer.id}`} editLabel="Change flight">
            <div className="space-y-5">
              {legs.map((leg, i) => (
                <LegRow key={leg.id} leg={leg} label={`${legLabel(i)} · ${formatDateMed(leg.departLocal)}`} className={i > 0 ? "border-t border-dashed border-slate-200 pt-5" : ""} />
              ))}
            </div>
          </ReviewSection>
          <ReviewSection id="r-fare" title="Fare" editHref={`/flights/fare/${draft.offer.id}`} editLabel="Change fare">
            <p className="text-[15px] font-bold text-navy-900">
              {draft.offer.airlineName} · {fare.name}
            </p>
            <BaggageChips fare={fare} className="mt-2" />
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
              <li>{fare.changeFee === null ? "Changes not permitted" : fare.changeFee === 0 ? "Free changes" : "Changes with a fee"}</li>
              <li>{fare.refundFee === null ? "Non-refundable" : fare.refundFee === 0 ? "Fully refundable" : "Refundable with a fee"}</li>
              <li>{fare.meal ? "Meal included" : "No meal included"}</li>
            </ul>
          </ReviewSection>
          <ReviewSection id="r-pax" title={`Passengers (${draft.passengers.length})`} editHref="/flights/book/passengers">
            <ul className="divide-y divide-slate-100">
              {draft.passengers.map((p, i) => (
                <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-[15px] font-bold text-navy-900">
                    {p.title} {p.firstName} {p.middleName} {p.lastName}{" "}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      {TYPE_LABEL[p.type]} {i + 1}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Born {formatDateMed(p.dob)} · {countryName(p.nationality)} · Passport {p.passportNo.replace(/.(?=.{3})/g, "•")} ({countryName(p.passportCountry)}) expires{" "}
                    {formatDateMed(p.passportExpiry)}
                    {p.frequentFlyer ? ` · FF ${p.frequentFlyer}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </ReviewSection>
          <ReviewSection id="r-bag" title="Baggage" editHref="/flights/book/extras">
            {bags.length === 0 ? (
              <p className="text-sm text-slate-600">
                No extra baggage added. Included: {fare.checkedBag.pieces > 0 ? `${fare.checkedBag.pieces} × ${fare.checkedBag.kg} kg checked` : "hand baggage only"}, {fare.cabinBag}{" "}
                cabin.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {bags.map((b) => (
                  <li key={`${b.p.id}-${b.li}`} className="flex justify-between gap-3">
                    <span>
                      <b className="text-navy-900">{b.p.firstName}</b> · {legLabel(b.li)} · {b.opt!.label}
                    </span>
                    <span className="font-semibold tnum">{fmt(gbp(b.opt!.price))}</span>
                  </li>
                ))}
              </ul>
            )}
          </ReviewSection>
          <ReviewSection id="r-seat" title="Seats" editHref="/flights/book/seats">
            {seats.length === 0 ? (
              <p className="text-sm text-slate-600">
                {draft.extras.seatsSkipped ? "You skipped seat selection. Seats will be allocated at check-in." : "No seats selected. Seats will be allocated at check-in."}
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {seats.map((s) => (
                  <li key={`${s.seg.id}-${s.p.id}`} className="flex justify-between gap-3">
                    <span>
                      <b className="text-navy-900">{s.p.firstName}</b> · {s.seg.from} → {s.seg.to} ({s.seg.flightNumber}) · Seat <b>{s.sel.seat}</b>
                    </span>
                    <span className="font-semibold tnum">{s.sel.price ? fmt(gbp(s.sel.price)) : "Included"}</span>
                  </li>
                ))}
              </ul>
            )}
          </ReviewSection>
          <ReviewSection id="r-meal" title="Meals & assistance" editHref="/flights/book/extras">
            <ul className="space-y-1.5 text-sm">
              {draft.passengers.map((p) => {
                const meals = legs.map(
                  (_, li) => mealOptionById(draft.extras.meals[p.id]?.[li] ?? (p.type === "infant" ? "infant" : p.type === "child" ? "child" : "standard"))?.label ?? "Standard meal",
                );
                const assist = draft.extras.assistance[p.id];
                const assistLabel = assist && assist.type !== "none" ? ASSISTANCE_OPTIONS.find((o) => o.id === assist.type)?.label : null;
                return (
                  <li key={p.id}>
                    <b className="text-navy-900">{p.firstName}</b> · {meals.join(" / ")}
                    {assistLabel && (
                      <span className="text-slate-600">
                        {" "}
                        · {assistLabel}
                        {assist?.notes ? ` (“${assist.notes}”)` : ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </ReviewSection>
          <ReviewSection id="r-contact" title="Contact details" editHref="/flights/book/passengers">
            <KeyValue
              items={[
                { label: "Email", value: draft.contact.email },
                { label: "Mobile", value: `${draft.contact.countryCode} ${draft.contact.mobile}` },
              ]}
            />
          </ReviewSection>
          <TermsBox
            checked={draft.termsAccepted}
            onChange={(v) => {
              patchFlight({ termsAccepted: v });
              if (v) setTermsError(false);
            }}
            error={termsError}
          >
            I have checked the passenger names and travel details, and I accept the{" "}
            <Link href="/legal/terms" target="_blank" className="font-bold text-brand-600 underline">
              Terms &amp; Conditions
            </Link>
            , the{" "}
            <Link href="/legal/refund-policy" target="_blank" className="font-bold text-brand-600 underline">
              fare rules and refund policy
            </Link>{" "}
            and the airline’s conditions of carriage.
          </TermsBox>
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/flights/book/seats" className="text-center text-sm font-semibold text-slate-600 hover:text-brand-600">
              ← Back to seats
            </Link>
            <Button size="xl" onClick={onContinue} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continue to payment
            </Button>
          </div>
        </div>
        <div className="hidden lg:block">
          <SummaryPanel className="sticky top-24" header={summary} breakdown={breakdown} />
        </div>
      </div>
      <MobileSummaryBar breakdown={breakdown}>
        <SummaryPanel header={summary} breakdown={breakdown} className="border-0" />
      </MobileSummaryBar>
    </div>
  );
}

/** Step 5: everything on one page, with Edit links and the terms checkbox. */
export function ReviewStep() {
  return <FlightGuard>{(ctx) => <ReviewPage {...ctx} />}</FlightGuard>;
}

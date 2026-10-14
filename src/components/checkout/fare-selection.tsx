"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, Check, Minus, X } from "lucide-react";
import { LegTimeline } from "@/components/flights/leg";
import { useCurrency } from "@/components/money";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { flightSearchHref } from "@/lib/engine/criteria";
import { formatCurrency, toCurrency, type CurrencyCode } from "@/lib/engine/currency";
import { flightService } from "@/lib/engine/flights/service";
import { fareAdultTotal, fareTripTotal } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useUiStore } from "@/lib/stores/session";
import type { FlightDraft } from "@/lib/types/booking";
import type { Fare } from "@/lib/types/flights";
import { cn, plural } from "@/lib/utils";
import { FlightGuard, PageSkeleton, useFlightDraft } from "./flight-guard";
import { FlightTripSummary, MobileSummaryBar, SummaryPanel } from "./summary";

function Feature({ tone, children, sub }: { tone: "yes" | "no" | "partial"; children: ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      {tone === "yes" ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Included" />
      ) : tone === "no" ? (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-label="Not included" />
      ) : (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="Partly included" />
      )}
      <span className="leading-snug">
        <span className="font-semibold text-slate-800">{children}</span>
        {sub && <span className="block text-xs text-slate-500">{sub}</span>}
      </span>
    </div>
  );
}

/** What each fare family includes, as label → rendered row. */
function fareFeatures(fare: Fare, currency: CurrencyCode): { label: string; node: ReactNode }[] {
  const money = (gbp: number) => formatCurrency(toCurrency(gbp, currency), currency);
  return [
    { label: "Cabin baggage", node: <Feature tone="yes">{fare.cabinBag}</Feature> },
    {
      label: "Checked baggage",
      node:
        fare.checkedBag.pieces > 0 ? (
          <Feature tone="yes">
            {fare.checkedBag.pieces} × {fare.checkedBag.kg} kg
          </Feature>
        ) : (
          <Feature tone="no" sub="Add later from £18">
            No checked bag
          </Feature>
        ),
    },
    {
      label: "Seat selection",
      node:
        fare.seatSelection === "paid" ? (
          <Feature tone="partial" sub="Choose a seat for a fee">
            Paid seats
          </Feature>
        ) : fare.seatSelection === "standard_free" ? (
          <Feature tone="yes">Free standard seat</Feature>
        ) : (
          <Feature tone="yes" sub="Extra legroom half price">
            Free preferred seat
          </Feature>
        ),
    },
    {
      label: "Changes",
      node:
        fare.changeFee === null ? (
          <Feature tone="no">Not permitted</Feature>
        ) : fare.changeFee === 0 ? (
          <Feature tone="yes">Free changes</Feature>
        ) : (
          <Feature tone="partial" sub="plus any fare difference">
            {money(fare.changeFee)} per change
          </Feature>
        ),
    },
    {
      label: "Cancellation & refund",
      node:
        fare.refundFee === null ? (
          <Feature tone="no" sub="Unused taxes refundable">
            Non-refundable
          </Feature>
        ) : fare.refundFee === 0 ? (
          <Feature tone="yes">Fully refundable</Feature>
        ) : (
          <Feature tone="partial">Refundable, {money(fare.refundFee)} fee</Feature>
        ),
    },
    {
      label: "Meal",
      node: fare.meal ? (
        <Feature tone="yes">Included</Feature>
      ) : (
        <Feature tone="no" sub="Buy onboard">
          Not included
        </Feature>
      ),
    },
    {
      label: "Other benefits",
      node: (
        <ul className="space-y-1.5">
          {fare.perks.map((p) => (
            <li key={p}>
              <Feature tone="yes">{p}</Feature>
            </li>
          ))}
        </ul>
      ),
    },
  ];
}

function FareStep({ draft }: { draft: FlightDraft }) {
  const router = useRouter();
  const { currency, fmt } = useCurrency();
  const selectFare = useDraftsStore((s) => s.selectFare);
  const patchFlight = useDraftsStore((s) => s.patchFlight);
  const scenario = useUiStore((s) => s.scenario);
  const setScenario = useUiStore((s) => s.setScenario);
  const { breakdown } = useFlightDraft();
  const [checking, setChecking] = useState(false);
  const [expired, setExpired] = useState(false);
  const [priceChange, setPriceChange] = useState<{ fareId: string; newFare: number; newTax: number } | null>(null);
  const offer = draft.offer;
  const pax = draft.criteria.pax;
  const travellers = pax.adults + pax.children + pax.infants;
  const saver = offer.fares[0];
  const selected = offer.fares.find((f) => f.id === draft.fareId) ?? null;
  const labels = offer.legs.length === 2 ? ["Outbound", "Return"] : offer.legs.map((_, i) => `Flight ${i + 1}`);
  const resultsHref = flightSearchHref(draft.criteria);

  async function onContinue() {
    if (!selected) return;
    setChecking(true);
    const result = await flightService.revalidate(offer, selected.id, { scenario });
    setChecking(false);
    // "expired" and "price-changed" are one-shot QA scenarios.
    if (scenario !== "ok" && scenario !== "empty" && scenario !== "error") setScenario("ok");
    if (result.status === "expired") setExpired(true);
    else if (result.status === "price_changed") setPriceChange({ fareId: selected.id, newFare: result.newFarePerAdult, newTax: result.newTaxPerAdult });
    else router.push("/flights/book/passengers");
  }

  function acceptNewPrice() {
    if (!priceChange) return;
    const fares = offer.fares.map((f) => (f.id === priceChange.fareId ? { ...f, farePerAdult: priceChange.newFare, taxPerAdult: priceChange.newTax } : f));
    patchFlight({ offer: { ...offer, fares } });
    setPriceChange(null);
    router.push("/flights/book/passengers");
  }

  if (expired)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          icon={<CalendarClock className="h-7 w-7" />}
          title="This fare has expired"
          description="The airline hasn't held this fare for you. Search again to see the latest availability and prices."
          actions={
            <>
              <ButtonLink href={resultsHref}>Search again</ButtonLink>
              <ButtonLink href="/flights" variant="outline">
                New search
              </ButtonLink>
            </>
          }
        />
      </div>
    );

  const continueButton = (
    <Button size="lg" block onClick={onContinue} disabled={!selected} loading={checking} rightIcon={<ArrowRight className="h-4 w-4" />}>
      {selected ? `Continue with ${selected.name}` : "Select a fare to continue"}
    </Button>
  );

  return (
    <div className="container-page py-8">
      <Link href={resultsHref} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to results
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Review your flight and choose a fare</h1>
        <p className="mt-1 text-slate-600">Prices are per person including taxes. Your total updates as you choose.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="itin-h" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="itin-h" className="text-lg font-bold">
                Your itinerary
              </h2>
              <Badge tone="outline">{offer.airlineName}</Badge>
            </div>
            <div className={cn("grid gap-8", offer.legs.length > 1 && "xl:grid-cols-2")}>
              {offer.legs.map((leg, i) => (
                <div key={leg.id} className={cn(i > 0 && "border-t border-dashed border-slate-200 pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0")}>
                  <LegTimeline leg={leg} title={labels[i]} />
                </div>
              ))}
            </div>
          </section>
          <section aria-labelledby="fare-h">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 id="fare-h" className="text-lg font-bold">
                Choose your fare
              </h2>
              <p className="text-sm text-slate-500">Compare what’s included before you decide</p>
            </div>
            <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div role="radiogroup" aria-label="Fare families" className="grid min-w-[680px] grid-cols-3 gap-3">
                {offer.fares.map((fare, i) => {
                  const isSelected = fare.id === draft.fareId;
                  const perPerson = fareAdultTotal(fare, currency);
                  const diff = perPerson - fareAdultTotal(saver, currency);
                  const total = fareTripTotal(fare, pax, currency);
                  return (
                    <div
                      key={fare.id}
                      className={cn(
                        "flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-colors",
                        isSelected ? "border-brand-500 shadow-lift" : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <div className={cn("p-4", isSelected ? "bg-brand-50" : "bg-slate-50/70")}>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-extrabold leading-tight text-navy-900">{fare.name}</h3>
                          {i === 1 && <Badge tone="brand">Popular</Badge>}
                          {i === 0 && <Badge tone="success">Lowest price</Badge>}
                        </div>
                        <p className="mt-2 text-[26px] font-extrabold leading-none text-navy-900 tnum">{fmt(perPerson)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          per person
                          {diff > 0 && (
                            <span className="font-semibold text-slate-700">
                              {" "}
                              · +{fmt(diff)} vs {saver.name}
                            </span>
                          )}
                        </p>
                        {travellers > 1 && <p className="mt-0.5 text-xs font-semibold text-slate-700 tnum">{fmt(total)} total</p>}
                      </div>
                      <dl className="flex-1 space-y-4 p-4">
                        {fareFeatures(fare, currency).map((row) => (
                          <div key={row.label}>
                            <dt className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.label}</dt>
                            <dd>{row.node}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="p-4 pt-0">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`Select ${fare.name}, ${fmt(perPerson)} per person`}
                          onClick={() => selectFare(fare.id)}
                          className={cn(
                            "flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors",
                            isSelected ? "bg-brand-500 text-white" : "border border-brand-500 text-brand-600 hover:bg-brand-50",
                          )}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Selected
                            </>
                          ) : (
                            "Select this fare"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <div className="hidden lg:block" />
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {breakdown && (
              <SummaryPanel header={<FlightTripSummary offer={offer} pax={pax} />} breakdown={breakdown}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Selected fare</p>
                <p className="mt-0.5 text-[15px] font-bold text-navy-900">{selected ? selected.name : "None yet"}</p>
                <p className="text-xs text-slate-500">{plural(travellers, "passenger")}</p>
              </SummaryPanel>
            )}
            {continueButton}
            {!selected && <p className="text-center text-xs text-slate-500">Choose one of the fares to see your total.</p>}
          </div>
        </div>
      </div>
      <div className="mt-8 lg:hidden">{continueButton}</div>
      {breakdown && (
        <MobileSummaryBar breakdown={breakdown}>
          <SummaryPanel header={<FlightTripSummary offer={offer} pax={pax} />} breakdown={breakdown} className="border-0" />
        </MobileSummaryBar>
      )}
      <Dialog open={!!priceChange} onOpenChange={(open) => !open && setPriceChange(null)}>
        <DialogContent title="The price has changed" description="The airline updated this fare while you were browsing." size="sm">
          {priceChange && selected && (
            <div>
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-4 text-amber-900">
                <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
                <div className="text-sm">
                  <p>
                    Was <b className="tnum">{fmt(fareAdultTotal(selected, currency))}</b> per person
                  </p>
                  <p>
                    Now <b className="text-lg tnum">{fmt(toCurrency(priceChange.newFare, currency) + toCurrency(priceChange.newTax, currency))}</b> per person
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">You can continue at the new price or go back and choose a different flight. Nothing has been charged.</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                <Button onClick={acceptNewPrice} className="flex-1">
                  Accept new price
                </Button>
                <ButtonLink href={resultsHref} variant="outline" className="flex-1">
                  Choose another flight
                </ButtonLink>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Step 1: the itinerary and the three fare families. The offer must match this tab's draft. */
export function FareSelection({ offerId }: { offerId: string }) {
  const { hydrated, draft } = useFlightDraft();
  if (!hydrated) return <PageSkeleton />;
  if (!draft || draft.offer.id !== offerId)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          icon={<CalendarClock className="h-7 w-7" />}
          title="This fare is no longer available"
          description="The selected flight has expired or was opened from a different session. Search again to see current fares."
          actions={<ButtonLink href="/flights">Search flights</ButtonLink>}
        />
      </div>
    );
  return <FlightGuard requireFare={false}>{({ draft: d }) => <FareStep draft={d} />}</FlightGuard>;
}

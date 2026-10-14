"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accessibility, ArrowRight, Briefcase, Check, Info, Luggage, Utensils } from "lucide-react";
import { useCurrency } from "@/components/money";
import { Button } from "@/components/ui/button";
import { TabList, TabPanel } from "@/components/ui/disclosure";
import { InlineNotice } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { ASSISTANCE_OPTIONS, BAGGAGE_OPTIONS, MEAL_OPTIONS } from "@/data/extras";
import type { PriceBreakdown } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import type { FlightDraft, FlightPassenger } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { FlightGuard } from "./flight-guard";
import { FlightTripSummary, MobileSummaryBar, SummaryPanel } from "./summary";
import { TYPE_LABEL } from "./traveller-fields";

/** "Amira Khan", or "Adult 1" before names are entered. */
export function paxName(p: Pick<FlightPassenger, "firstName" | "lastName" | "type">, index: number) {
  return p.firstName ? `${p.firstName} ${p.lastName}` : `${TYPE_LABEL[p.type]} ${index + 1}`;
}

const legLabel = (count: number, i: number) => (count === 2 ? (i === 0 ? "Outbound" : "Return") : `Flight ${i + 1}`);

/** Selectable tile used for baggage, meals and assistance (radio semantics). */
export function OptionCard({
  selected,
  onClick,
  title,
  sub,
  price,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  sub?: ReactNode;
  price?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start rounded-lg border-2 px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        selected ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300",
      )}
    >
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      )}
      <span className="pr-6 text-sm font-bold text-navy-900">{title}</span>
      {sub && <span className="mt-0.5 text-xs text-slate-500">{sub}</span>}
      {price && <span className="mt-2 text-sm font-extrabold text-navy-900 tnum">{price}</span>}
      {children}
    </button>
  );
}

function CodeChip({ code }: { code: string }) {
  return <span className="mt-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">{code}</span>;
}

function PaxSection({ id, icon, title, type, children }: { id: string; icon: ReactNode; title: string; type?: FlightPassenger["type"]; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby={id}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
        {icon}
        <h3 id={id} className="text-[15px] font-bold text-navy-900">
          {title}
        </h3>
        {type && <span className="text-xs text-slate-500">{TYPE_LABEL[type]}</span>}
      </div>
      {children}
    </section>
  );
}

function BaggageTab({ draft }: { draft: FlightDraft }) {
  const { gbp, fmt } = useCurrency();
  const setBaggage = useDraftsStore((s) => s.setBaggage);
  const fare = draft.offer.fares.find((f) => f.id === draft.fareId)!;
  const legs = draft.offer.legs;
  const included = fare.checkedBag.pieces > 0 ? `${fare.checkedBag.pieces} × ${fare.checkedBag.kg} kg` : null;
  return (
    <div className="space-y-5">
      <InlineNotice tone="info" icon={<Info className="h-4 w-4" />}>
        Your <b>{fare.name}</b> fare includes {included ? `${included} checked baggage` : "no checked baggage"} and {fare.cabinBag} cabin baggage per passenger. Adding baggage
        now is cheaper than at the airport.
      </InlineNotice>
      {draft.passengers.map((p, pi) => (
        <PaxSection key={p.id} id={`bag-${p.id}`} icon={<Luggage className="h-5 w-5 text-slate-400" aria-hidden />} title={paxName(p, pi)} type={p.type}>
          <div className="divide-y divide-slate-100">
            {legs.map((leg, li) => {
              const chosen = draft.extras.baggage[p.id]?.[li] ?? null;
              return (
                <div key={leg.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-navy-900">
                      {legLabel(legs.length, li)} · {leg.fromCity} → {leg.toCity}
                    </p>
                    <p className="text-xs text-slate-500">Included: {p.type === "infant" ? "10 kg infant allowance" : (included ?? "hand baggage only")}</p>
                  </div>
                  <div role="radiogroup" aria-label={`Extra baggage for ${paxName(p, pi)}, flight ${li + 1}`} className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    <OptionCard selected={chosen === null} onClick={() => setBaggage(p.id, li, null)} title="No extra" sub="Use included" price={fmt(0)} />
                    {BAGGAGE_OPTIONS.map((o) => (
                      <OptionCard key={o.id} selected={chosen === o.id} onClick={() => setBaggage(p.id, li, o.id)} title={o.label} sub={o.note} price={`+${fmt(gbp(o.price))}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PaxSection>
      ))}
    </div>
  );
}

function MealsTab({ draft }: { draft: FlightDraft }) {
  const setMeal = useDraftsStore((s) => s.setMeal);
  const fare = draft.offer.fares.find((f) => f.id === draft.fareId)!;
  const legs = draft.offer.legs;
  return (
    <div className="space-y-5">
      <InlineNotice tone="info" icon={<Info className="h-4 w-4" />}>
        {fare.meal
          ? "A meal is included on your fare. Choose a special meal if you have a dietary need — special meals are free."
          : "Your fare doesn't include a meal, but you can request a special meal preference. Airlines will do their best to honour it; snacks and drinks can be bought onboard."}{" "}
        Requests should be made at least 24 hours before departure.
      </InlineNotice>
      {draft.passengers.map((p, pi) => {
        const options = MEAL_OPTIONS.filter((m) => (!m.for || m.for === p.type) && (p.type === "infant" || m.for !== "infant"));
        return (
          <PaxSection key={p.id} id={`meal-${p.id}`} icon={<Utensils className="h-5 w-5 text-slate-400" aria-hidden />} title={paxName(p, pi)} type={p.type}>
            <div className="divide-y divide-slate-100">
              {legs.map((leg, li) => {
                const chosen = draft.extras.meals[p.id]?.[li] ?? (p.type === "infant" ? "infant" : p.type === "child" ? "child" : "standard");
                return (
                  <div key={leg.id} className="p-5">
                    <p className="mb-3 text-sm font-bold text-navy-900">
                      {legLabel(legs.length, li)} · {leg.fromCity} → {leg.toCity}
                    </p>
                    <div role="radiogroup" aria-label={`Meal for ${paxName(p, pi)}, flight ${li + 1}`} className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                      {options.map((m) => (
                        <OptionCard key={m.id} selected={chosen === m.id} onClick={() => setMeal(p.id, li, m.id)} title={m.label} sub={m.description}>
                          {m.code !== "—" && <CodeChip code={m.code} />}
                        </OptionCard>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </PaxSection>
        );
      })}
    </div>
  );
}

function AssistanceTab({ draft }: { draft: FlightDraft }) {
  const setAssistance = useDraftsStore((s) => s.setAssistance);
  return (
    <div className="space-y-5">
      <InlineNotice tone="info" icon={<Info className="h-4 w-4" />}>
        Special assistance is free of charge. We’ll pass your request to the airline, which will confirm it by email. Please also tell the airline at check-in.
      </InlineNotice>
      {draft.passengers.map((p, pi) => {
        const request = draft.extras.assistance[p.id] ?? { type: "none", notes: "" };
        return (
          <PaxSection key={p.id} id={`as-${p.id}`} icon={<Accessibility className="h-5 w-5 text-slate-400" aria-hidden />} title={paxName(p, pi)}>
            <div className="p-5">
              <div role="radiogroup" aria-label={`Assistance for ${paxName(p, pi)}`} className="grid gap-2.5 sm:grid-cols-2">
                {ASSISTANCE_OPTIONS.map((o) => (
                  <OptionCard
                    key={o.id}
                    selected={request.type === o.id}
                    onClick={() => setAssistance(p.id, { type: o.id, notes: o.id === "none" ? "" : request.notes })}
                    title={o.label}
                    sub={o.description}
                  >
                    {o.code && <CodeChip code={o.code} />}
                  </OptionCard>
                ))}
              </div>
              {request.type !== "none" && (
                <div className="mt-4">
                  <label htmlFor={`as-notes-${p.id}`} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                    {request.type === "other" ? "Tell us what you need" : "Anything else the airline should know?"} <span className="font-normal text-slate-400">Optional</span>
                  </label>
                  <Textarea
                    id={`as-notes-${p.id}`}
                    rows={3}
                    maxLength={300}
                    placeholder="e.g. Travelling with a folding wheelchair; needs help boarding"
                    value={request.notes ?? ""}
                    onChange={(e) => setAssistance(p.id, { ...request, notes: e.target.value })}
                  />
                </div>
              )}
            </div>
          </PaxSection>
        );
      })}
    </div>
  );
}

type Tab = "baggage" | "meals" | "assistance";

function ExtrasPage({ draft, breakdown }: { draft: FlightDraft; breakdown: PriceBreakdown }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("baggage");
  const bagCount = Object.values(draft.extras.baggage).reduce((n, perLeg) => n + Object.keys(perLeg).length, 0);
  const mealCount = Object.values(draft.extras.meals).reduce((n, perLeg) => n + Object.values(perLeg).filter((m) => m !== "standard").length, 0);
  const assistCount = Object.values(draft.extras.assistance).filter((a) => a.type !== "none").length;
  const summary = <FlightTripSummary offer={draft.offer} pax={draft.criteria.pax} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Personalise your trip</h1>
        <p className="mt-1 text-slate-600">Add baggage, choose meals and request assistance. Everything is optional and your total updates instantly.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <TabList
            label="Extras"
            value={tab}
            onChange={(id) => setTab(id as Tab)}
            className="mb-6"
            tabs={[
              { id: "baggage", label: "Baggage", count: bagCount || undefined, icon: <Briefcase className="h-4 w-4" /> },
              { id: "meals", label: "Meals", count: mealCount || undefined, icon: <Utensils className="h-4 w-4" /> },
              { id: "assistance", label: "Assistance", count: assistCount || undefined, icon: <Accessibility className="h-4 w-4" /> },
            ]}
          />
          <TabPanel id="baggage" active={tab === "baggage"}>
            <BaggageTab draft={draft} />
          </TabPanel>
          <TabPanel id="meals" active={tab === "meals"}>
            <MealsTab draft={draft} />
          </TabPanel>
          <TabPanel id="assistance" active={tab === "assistance"}>
            <AssistanceTab draft={draft} />
          </TabPanel>
          <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/flights/book/passengers" className="text-center text-sm font-semibold text-slate-600 hover:text-brand-600">
              ← Back to passengers
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row">
              {tab !== "assistance" && (
                <Button variant="outline" size="lg" onClick={() => setTab(tab === "baggage" ? "meals" : "assistance")}>
                  Next: {tab === "baggage" ? "Meals" : "Assistance"}
                </Button>
              )}
              <Button size="lg" onClick={() => router.push("/flights/book/seats")} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue to seats
              </Button>
            </div>
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

/** Step 3: extra baggage, meals and special assistance, per passenger and leg. */
export function ExtrasStep() {
  return <FlightGuard>{(ctx) => <ExtrasPage {...ctx} />}</FlightGuard>;
}

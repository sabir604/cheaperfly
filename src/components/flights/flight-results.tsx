"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarClock,
  ChevronDown,
  Clock,
  Leaf,
  Pencil,
  Plane,
  RefreshCcw,
  RefreshCw,
  SearchX,
  SlidersHorizontal,
  Ticket,
  Users,
  Wifi,
} from "lucide-react";
import { AirlineMark } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { FlightSearchForm } from "@/components/search/flight-search-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { AIRLINE_MAP, CABIN_LABEL } from "@/data/flights";
import { airportCityOf, getAirport } from "@/lib/engine/airports";
import { flightSearchHref } from "@/lib/engine/criteria";
import { formatDayShort, formatDuration, localMinutesOfDay, parseDate } from "@/lib/engine/dates";
import { flightService } from "@/lib/engine/flights/service";
import { fareAdultTotal, fareTripTotal } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore, useUiStore } from "@/lib/stores/session";
import type { DatePrice, FlightCriteria, FlightSearchResult, Offer, Pax } from "@/lib/types/flights";
import { cn, plural } from "@/lib/utils";
import { BaggageChips, LegRow, LegTimeline } from "./leg";

// ---------- offer card ----------

function OfferCard({
  offer,
  pax,
  badges,
  expanded,
  onToggle,
  onSelect,
  selecting,
}: {
  offer: Offer;
  pax: Pax;
  badges: string[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  selecting: boolean;
}) {
  const { currency, fmt } = useCurrency();
  const fare = offer.fares[0];
  const perPerson = fareAdultTotal(fare, currency);
  const total = fareTripTotal(fare, pax, currency);
  const travellers = pax.adults + pax.children + pax.infants;
  const labels = offer.legs.length === 2 ? ["Outbound", "Return"] : offer.legs.map((_, i) => `Flight ${i + 1}`);
  const detailsId = `details-${offer.id}`;
  return (
    <article
      aria-label={`${offer.airlineName} flight, ${fmt(perPerson)} per person`}
      className={cn("overflow-hidden rounded-xl border bg-white transition-shadow", expanded ? "border-brand-300 shadow-lift" : "border-slate-200 hover:shadow-card")}
    >
      <div className="grid lg:grid-cols-[1fr_216px]">
        <div className="space-y-4 p-4 sm:p-5">
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <Badge key={b} tone={b === "Cheapest" ? "success" : b === "Fastest" ? "brand" : "navy"}>
                  {b}
                </Badge>
              ))}
            </div>
          )}
          {offer.legs.map((leg, i) => (
            <LegRow key={leg.id} leg={leg} label={labels[i]} className={cn(i > 0 && "border-t border-dashed border-slate-200 pt-4")} />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
            <BaggageChips fare={fare} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className={cn("flex items-center gap-1.5", offer.refundable ? "text-emerald-700" : "text-slate-500")}>
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden /> {offer.refundable ? "Flexible options" : "Non-refundable"}
              </span>
              <span className="hidden items-center gap-1.5 text-slate-500 sm:flex">
                <Leaf className="h-3.5 w-3.5" aria-hidden /> {offer.co2Kg} kg CO₂
              </span>
              {offer.seatsLeft ? <span className="font-semibold text-red-600">{offer.seatsLeft} seats left at this price</span> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5 lg:flex-col lg:items-stretch lg:justify-center lg:border-l lg:border-t-0">
          <div className="lg:text-right">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:justify-end">
              <Ticket className="h-3 w-3" aria-hidden /> {fare.name}
            </p>
            <p className="mt-0.5 text-[28px] font-extrabold leading-none text-navy-900 tnum">{fmt(perPerson)}</p>
            <p className="mt-1 text-xs text-slate-500">per person · {offer.legs.length === 2 ? "return" : offer.legs.length > 2 ? "multi-city" : "one way"} · incl. taxes</p>
            {travellers > 1 && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-700 lg:justify-end">
                <Users className="h-3 w-3" aria-hidden /> {fmt(total)} for {plural(travellers, "passenger")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <Button onClick={onSelect} loading={selecting} size="lg" className="lg:w-full">
              Select
            </Button>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={detailsId}
              className="flex items-center justify-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Flight details
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div id={detailsId} className="border-t border-slate-200 bg-white px-4 py-6 sm:px-6">
          <div className={cn("grid gap-8", offer.legs.length > 1 && "lg:grid-cols-2")}>
            {offer.legs.map((leg, i) => (
              <LegTimeline key={leg.id} leg={leg} title={labels[i]} />
            ))}
          </div>
          <div className="mt-7 grid gap-6 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Baggage — {fare.name}</h4>
              <BaggageChips fare={fare} className="flex-col items-start !gap-y-1.5" />
              <p className="mt-2 text-xs text-slate-500">More baggage can be added after choosing your fare.</p>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Fare notes</h4>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>Cabin: {CABIN_LABEL[offer.cabin]}</li>
                <li>{fare.changeFee === null ? "Changes not permitted" : fare.changeFee === 0 ? "Free changes" : `Changes from ${fare.changeFee} GBP + fare difference`}</li>
                <li>{fare.refundFee === null ? "Non-refundable (taxes only)" : fare.refundFee === 0 ? "Fully refundable" : `Refundable (fee ${fare.refundFee} GBP)`}</li>
                <li>{fare.meal ? "Meal included" : "Meal available to buy"}</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Better fares available</h4>
              <p className="text-xs text-slate-600">Compare {offer.fares.map((f) => f.name).join(", ")} on the next step, including baggage, seats and flexibility.</p>
              <Button size="sm" variant="subtle" className="mt-2" onClick={onSelect}>
                Compare fares
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ---------- ±3 day price strip ----------

function DateStrip({ prices, criteria }: { prices: DatePrice[]; criteria: FlightCriteria }) {
  const router = useRouter();
  const { gbp, fmt } = useCurrency();
  if (prices.length < 2) return null;
  const known = prices.filter((p) => p.price !== null).map((p) => p.price as number);
  const min = known.length ? Math.min(...known) : 0;
  const current = criteria.legs[0].date;
  return (
    <nav aria-label="Compare nearby dates" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2 sm:min-w-0 sm:grid sm:grid-cols-7">
        {prices.map((p) => {
          const active = p.date === current;
          const cheapest = p.price !== null && p.price === min;
          return (
            <li key={p.date} className="w-[112px] sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (active) return;
                  const legs = criteria.legs.map((l, i) =>
                    i === 0 ? { ...l, date: p.date } : i === 1 && criteria.trip === "return" ? { ...l, date: p.returnDate! } : l,
                  );
                  router.push(flightSearchHref({ ...criteria, legs }));
                }}
                aria-current={active ? "date" : undefined}
                disabled={p.price === null}
                className={cn(
                  "flex w-full flex-col items-center rounded-lg border px-2 py-2.5 text-center transition-colors",
                  active ? "border-brand-500 bg-brand-500 text-white shadow-sm" : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50",
                )}
              >
                <span className={cn("text-xs font-medium", active ? "text-brand-100" : "text-slate-500")}>{format(parseDate(p.date)!, "EEE d MMM")}</span>
                {p.returnDate && <span className={cn("text-[10px]", active ? "text-brand-100" : "text-slate-400")}>→ {format(parseDate(p.returnDate)!, "d MMM")}</span>}
                <span className={cn("mt-0.5 text-[15px] font-extrabold tnum", active ? "text-white" : cheapest ? "text-emerald-600" : "text-navy-900")}>
                  {p.price === null ? "—" : fmt(gbp(p.fare ?? p.price) + (p.fare !== undefined ? gbp(p.tax ?? 0) : 0))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------- filters ----------

type TimeBucket = "early" | "morning" | "afternoon" | "evening";

interface Filters {
  stops: number[];
  airlines: string[];
  depAirports: string[];
  arrAirports: string[];
  depTime: TimeBucket[];
  arrTime: TimeBucket[];
  /** Which leg the time filters apply to. */
  timeLeg: number;
  maxDurationMin: number | null;
  checkedBag: boolean;
  refundable: boolean;
  maxPrice: number | null;
}

const EMPTY_FILTERS: Filters = {
  stops: [],
  airlines: [],
  depAirports: [],
  arrAirports: [],
  depTime: [],
  arrTime: [],
  timeLeg: 0,
  maxDurationMin: null,
  checkedBag: false,
  refundable: false,
  maxPrice: null,
};

const TIME_BUCKETS: { id: TimeBucket; label: string; range: string; from: number; to: number }[] = [
  { id: "early", label: "Early", range: "00:00–05:59", from: 0, to: 360 },
  { id: "morning", label: "Morning", range: "06:00–11:59", from: 360, to: 720 },
  { id: "afternoon", label: "Afternoon", range: "12:00–17:59", from: 720, to: 1080 },
  { id: "evening", label: "Evening", range: "18:00–23:59", from: 1080, to: 1440 },
];

const bucketOf = (localIso: string) => {
  const m = localMinutesOfDay(localIso);
  return TIME_BUCKETS.find((b) => m >= b.from && m < b.to)!.id;
};
const maxStops = (o: Offer) => Math.max(...o.legs.map((l) => l.stops));
/** Saver price per adult, GBP: what sorting, filtering and badges use. */
const fromPrice = (o: Offer) => o.fares[0].farePerAdult + o.fares[0].taxPerAdult;

const isFiltered = (f: Filters) =>
  f.stops.length > 0 ||
  f.airlines.length > 0 ||
  f.depAirports.length > 0 ||
  f.arrAirports.length > 0 ||
  f.depTime.length > 0 ||
  f.arrTime.length > 0 ||
  f.maxDurationMin !== null ||
  f.checkedBag ||
  f.refundable ||
  f.maxPrice !== null;

/** "Recommended" score (lower is better): price, duration, stops, bags and airline weight. */
function score(o: Offer, minPrice: number, minDuration: number) {
  const weight = AIRLINE_MAP[o.airlineCode]?.weight ?? 0.8;
  return 0.5 * (fromPrice(o) / minPrice) + 0.38 * (o.totalDurationMin / minDuration) + 0.18 * maxStops(o) + 0.22 * Number(!o.checkedBagIncluded) - 0.15 * weight;
}

type Sort = "recommended" | "cheapest" | "fastest" | "departure";

function sortOffers(offers: Offer[], sort: Sort): Offer[] {
  const out = [...offers];
  if (!out.length) return out;
  const minPrice = Math.min(...out.map(fromPrice));
  const minDuration = Math.min(...out.map((o) => o.totalDurationMin));
  switch (sort) {
    case "cheapest":
      return out.sort((a, b) => fromPrice(a) - fromPrice(b) || a.totalDurationMin - b.totalDurationMin);
    case "fastest":
      return out.sort((a, b) => a.totalDurationMin - b.totalDurationMin || fromPrice(a) - fromPrice(b));
    case "departure":
      return out.sort((a, b) => a.legs[0].departLocal.localeCompare(b.legs[0].departLocal) || fromPrice(a) - fromPrice(b));
    default:
      return out.sort((a, b) => score(a, minPrice, minDuration) - score(b, minPrice, minDuration));
  }
}

interface Facets {
  airlines: { code: string; name: string; count: number; minPrice: number }[];
  depAirports: { code: string; count: number }[];
  arrAirports: { code: string; count: number }[];
  stops: { value: number; count: number; minPrice: number }[];
  minPrice: number;
  maxPrice: number;
  minDuration: number;
  maxDuration: number;
}

function buildFacets(offers: Offer[]): Facets {
  const airlines = new Map<string, Facets["airlines"][number]>();
  const dep = new Map<string, number>();
  const arr = new Map<string, number>();
  const stops = new Map<number, Facets["stops"][number]>();
  for (const o of offers) {
    const price = fromPrice(o);
    const a = airlines.get(o.airlineCode) ?? { code: o.airlineCode, name: o.airlineName, count: 0, minPrice: Infinity };
    a.count++;
    a.minPrice = Math.min(a.minPrice, price);
    airlines.set(o.airlineCode, a);
    dep.set(o.legs[0].from, (dep.get(o.legs[0].from) ?? 0) + 1);
    arr.set(o.legs[0].to, (arr.get(o.legs[0].to) ?? 0) + 1);
    const n = Math.min(maxStops(o), 2);
    const s = stops.get(n) ?? { value: n, count: 0, minPrice: Infinity };
    s.count++;
    s.minPrice = Math.min(s.minPrice, price);
    stops.set(n, s);
  }
  const prices = offers.map(fromPrice);
  const durations = offers.map((o) => Math.max(...o.legs.map((l) => l.durationMin)));
  return {
    airlines: [...airlines.values()].sort((a, b) => a.minPrice - b.minPrice),
    depAirports: [...dep].map(([code, count]) => ({ code, count })),
    arrAirports: [...arr].map(([code, count]) => ({ code, count })),
    stops: [0, 1, 2].map((v) => stops.get(v) ?? { value: v, count: 0, minPrice: 0 }),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    minDuration: durations.length ? Math.min(...durations) : 0,
    maxDuration: durations.length ? Math.max(...durations) : 0,
  };
}

function FilterGroup({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <fieldset className="border-b border-slate-200 py-5 first:pt-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <legend className="text-[13px] font-bold uppercase tracking-wide text-navy-900">{title}</legend>
        {action}
      </div>
      {children}
    </fieldset>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const STOP_LABELS = ["Direct", "1 stop", "2+ stops"];

function TimeButtons({ selected, onToggle }: { selected: TimeBucket[]; onToggle: (b: TimeBucket) => void }) {
  return (
    <>
      {TIME_BUCKETS.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-pressed={selected.includes(b.id)}
          onClick={() => onToggle(b.id)}
          className={cn(
            "rounded-lg border px-2 py-2 text-center transition-colors",
            selected.includes(b.id) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-700 hover:border-slate-300",
          )}
        >
          <span className="block text-[13px] font-semibold">{b.label}</span>
          <span className="block text-[10px] text-slate-500">{b.range}</span>
        </button>
      ))}
    </>
  );
}

function FilterPanel({
  filters,
  onChange,
  facets,
  legCount,
  resultCount,
  totalCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  facets: Facets;
  legCount: number;
  resultCount: number;
  totalCount: number;
}) {
  const { currency, gbp, fmt } = useCurrency();
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const price = filters.maxPrice ?? facets.maxPrice;
  const duration = filters.maxDurationMin ?? facets.maxDuration;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">
          {resultCount} of {totalCount} flights
        </p>
        {isFiltered(filters) && (
          <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })} className="text-[13px] font-bold text-brand-600 hover:text-brand-700">
            Reset all
          </button>
        )}
      </div>
      <FilterGroup title="Stops">
        <div className="space-y-2.5">
          {facets.stops.map((s) => (
            <div key={s.value} className="flex items-center justify-between gap-2">
              <Checkbox checked={filters.stops.includes(s.value)} disabled={s.count === 0} onChange={() => set({ stops: toggle(filters.stops, s.value) })} label={STOP_LABELS[s.value]} />
              <span className="text-xs text-slate-500 tnum">{s.count ? `from ${fmt(gbp(s.minPrice))}` : "—"}</span>
            </div>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Price (per person)">
        <input
          type="range"
          min={facets.minPrice}
          max={facets.maxPrice}
          step={5}
          value={price}
          onChange={(e) => set({ maxPrice: Number(e.target.value) >= facets.maxPrice ? null : Number(e.target.value) })}
          aria-label="Maximum price"
          className="w-full accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500 tnum">
          <span>{fmt(gbp(facets.minPrice))}</span>
          <span className="font-bold text-navy-900">Up to {fmt(gbp(price))}</span>
        </div>
        <span className="sr-only">Currency {currency}</span>
      </FilterGroup>
      <FilterGroup title="Airlines">
        <div className="space-y-2.5">
          {facets.airlines.map((a) => (
            <div key={a.code} className="flex items-center justify-between gap-2">
              <Checkbox
                checked={filters.airlines.includes(a.code)}
                onChange={() => set({ airlines: toggle(filters.airlines, a.code) })}
                label={
                  <span className="flex items-center gap-2">
                    <AirlineMark code={a.code} size="sm" />
                    {a.name}
                  </span>
                }
              />
              <span className="text-xs text-slate-500 tnum">{fmt(gbp(a.minPrice))}</span>
            </div>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Baggage & flexibility">
        <div className="space-y-2.5">
          <Checkbox checked={filters.checkedBag} onChange={(e) => set({ checkedBag: e.target.checked })} label="Checked bag included" />
          <Checkbox checked={filters.refundable} onChange={(e) => set({ refundable: e.target.checked })} label="Refundable / flexible fares" />
        </div>
      </FilterGroup>
      <FilterGroup
        title="Flight times"
        action={
          legCount > 1 ? (
            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-bold" role="group" aria-label="Which flight">
              {Array.from({ length: legCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={filters.timeLeg === i}
                  onClick={() => set({ timeLeg: i })}
                  className={cn("rounded px-2 py-1", filters.timeLeg === i ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}
                >
                  {legCount === 2 ? (i === 0 ? "Out" : "Return") : `#${i + 1}`}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        <p className="mb-2 text-xs font-semibold text-slate-600">Departure</p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          <TimeButtons selected={filters.depTime} onToggle={(b) => set({ depTime: toggle(filters.depTime, b) })} />
        </div>
        <p className="mb-2 text-xs font-semibold text-slate-600">Arrival</p>
        <div className="grid grid-cols-2 gap-1.5">
          <TimeButtons selected={filters.arrTime} onToggle={(b) => set({ arrTime: toggle(filters.arrTime, b) })} />
        </div>
      </FilterGroup>
      <FilterGroup title="Journey duration">
        <input
          type="range"
          min={facets.minDuration}
          max={facets.maxDuration}
          step={15}
          value={duration}
          onChange={(e) => set({ maxDurationMin: Number(e.target.value) >= facets.maxDuration ? null : Number(e.target.value) })}
          aria-label="Maximum journey duration"
          className="w-full accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500 tnum">
          <span>{formatDuration(facets.minDuration)}</span>
          <span className="font-bold text-navy-900">Up to {formatDuration(duration)}</span>
        </div>
      </FilterGroup>
      <FilterGroup title="Departure airports">
        <div className="space-y-2.5">
          {facets.depAirports.map((a) => (
            <Checkbox
              key={a.code}
              checked={filters.depAirports.includes(a.code)}
              onChange={() => set({ depAirports: toggle(filters.depAirports, a.code) })}
              label={`${a.code} · ${getAirport(a.code)?.name ?? ""}`}
              description={`${a.count} flights`}
            />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Arrival airports">
        <div className="space-y-2.5">
          {facets.arrAirports.map((a) => (
            <Checkbox
              key={a.code}
              checked={filters.arrAirports.includes(a.code)}
              onChange={() => set({ arrAirports: toggle(filters.arrAirports, a.code) })}
              label={`${a.code} · ${getAirport(a.code)?.name ?? ""}`}
              description={`${a.count} flights`}
            />
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

function DrawerFooter({ count, onApply, onReset }: { count: number; onApply: () => void; onReset: () => void }) {
  return (
    <div className="flex gap-3">
      <Button variant="outline" onClick={onReset} className="flex-1">
        Reset
      </Button>
      <Button onClick={onApply} className="flex-[2]">
        Show {count} flight{count === 1 ? "" : "s"}
      </Button>
    </div>
  );
}

// ---------- loading ----------

const SEARCH_STEPS = ["Searching available flights", "Comparing fares across airlines", "Checking baggage options", "Finding the best prices"];

function SearchProgress({ route }: { route: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(SEARCH_STEPS.length - 1, s + 1)), 650);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8" role="status" aria-live="polite">
      <div className="flex items-center gap-4">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50">
          <Plane className="h-6 w-6 animate-pulse text-brand-600" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-navy-900">{SEARCH_STEPS[step]}…</p>
          <p className="truncate text-sm text-slate-500">{route}</p>
        </div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className="h-full rounded-full bg-brand-500 transition-all duration-700 ease-out" style={{ width: `${((step + 1) / SEARCH_STEPS.length) * 92}%` }} />
      </div>
      <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        {SEARCH_STEPS.map((s, i) => (
          <li key={s} className={i <= step ? "font-semibold text-brand-700" : ""}>
            {i < step ? "✓ " : ""}
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[1fr_216px]">
          <div className="space-y-5 p-5">
            {[0, 1].map((r) => (
              <div key={r} className="flex items-center gap-5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-6">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-3 border-t border-slate-200 bg-slate-50/60 p-5 lg:border-l lg:border-t-0">
            <Skeleton className="ml-auto h-3 w-24" />
            <Skeleton className="ml-auto h-8 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** "London ⇄ Dubai", "London → Dubai", or "London → Dubai → Istanbul" for multi-city. */
export function routeTitle(c: FlightCriteria): string {
  if (c.trip === "multicity")
    return c.legs
      .map((l) => airportCityOf(l.from))
      .concat(airportCityOf(c.legs[c.legs.length - 1].to))
      .join(" → ");
  return `${airportCityOf(c.legs[0].from)} ${c.trip === "return" ? "⇄" : "→"} ${airportCityOf(c.legs[0].to)}`;
}

// ---------- page ----------

type Outcome =
  | { status: "ready"; data: FlightSearchResult }
  | { status: "expired"; data: FlightSearchResult }
  | { status: "error"; message: string };
type State = { status: "loading" } | Outcome;

const PAGE_SIZE = 12;

/** Remount per search (see the page) so filters, sort and paging start fresh. */
export function FlightResults({ criteria }: { criteria: FlightCriteria }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { fmt, gbp } = useCurrency();
  const setScenario = useUiStore((s) => s.setScenario);
  const startFlight = useDraftsStore((s) => s.startFlight);
  const profile = useSessionStore((s) => s.profile);
  const [attempt, setAttempt] = useState(0);
  const request = `${JSON.stringify(criteria)}#${attempt}`;
  // The outcome is tagged with the request it answers; anything older means we're still loading.
  const [outcome, setOutcome] = useState<(Outcome & { request: string }) | null>(null);
  const state: State = outcome && outcome.request === request ? outcome : { status: "loading" };
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>("recommended");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [modifying, setModifying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    // Read the QA scenario at search time; changing it later shouldn't re-run the search.
    const sc = useUiStore.getState().scenario;
    // One-shot QA scenarios reset after use; "price-changed" stays on for the fare step.
    const resetScenario = () => sc !== "ok" && sc !== "price-changed" && setScenario("ok");
    flightService
      .search(criteria, { scenario: sc })
      .then((data) => {
        if (cancelled) return;
        resetScenario();
        setOutcome(sc === "expired" ? { status: "expired", data, request } : { status: "ready", data, request });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        resetScenario();
        setOutcome({ status: "error", message: err.message, request });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `request` stands in for `criteria`
  }, [request, hydrated]);

  // Results are held for 20 minutes.
  useEffect(() => {
    if (outcome?.status !== "ready") return;
    const id = setTimeout(() => setOutcome({ ...outcome, status: "expired" }), 20 * 60 * 1000);
    return () => clearTimeout(id);
  }, [outcome]);

  const data = state.status === "ready" || state.status === "expired" ? state.data : null;
  const offers = useMemo(() => data?.offers ?? [], [data]);
  const facets = useMemo(() => buildFacets(offers), [offers]);
  const filtered = useMemo(
    () =>
      offers.filter((o) => {
        if (filters.stops.length && !filters.stops.includes(Math.min(maxStops(o), 2))) return false;
        if (filters.airlines.length && !filters.airlines.includes(o.airlineCode)) return false;
        if (filters.depAirports.length && !filters.depAirports.includes(o.legs[0].from)) return false;
        if (filters.arrAirports.length && !filters.arrAirports.includes(o.legs[0].to)) return false;
        const leg = o.legs[Math.min(filters.timeLeg, o.legs.length - 1)];
        if (filters.depTime.length && !filters.depTime.includes(bucketOf(leg.departLocal))) return false;
        if (filters.arrTime.length && !filters.arrTime.includes(bucketOf(leg.arriveLocal))) return false;
        if (filters.maxDurationMin !== null && Math.max(...o.legs.map((l) => l.durationMin)) > filters.maxDurationMin) return false;
        if (filters.checkedBag && !o.checkedBagIncluded) return false;
        if (filters.refundable && !o.refundable) return false;
        if (filters.maxPrice !== null && fromPrice(o) > filters.maxPrice) return false;
        return true;
      }),
    [offers, filters],
  );
  const sorted = useMemo(() => sortOffers(filtered, sort), [filtered, sort]);
  const cheapest = useMemo(() => (offers.length ? offers.reduce((a, b) => (fromPrice(a) <= fromPrice(b) ? a : b)) : null), [offers]);
  const fastest = useMemo(() => (offers.length ? offers.reduce((a, b) => (a.totalDurationMin <= b.totalDurationMin ? a : b)) : null), [offers]);
  const best = useMemo(() => (offers.length ? sortOffers(offers, "recommended")[0] : null), [offers]);

  const pax = criteria.pax;
  const travellers = pax.adults + pax.children + pax.infants;
  const first = criteria.legs[0];
  const last = criteria.legs[criteria.legs.length - 1];
  const sorts: { id: Sort; label: string; sub: string }[] = [
    { id: "recommended", label: "Recommended", sub: "Best overall" },
    { id: "cheapest", label: "Cheapest", sub: cheapest ? fmt(gbp(fromPrice(cheapest))) : "—" },
    { id: "fastest", label: "Fastest", sub: fastest ? formatDuration(fastest.totalDurationMin) : "—" },
    { id: "departure", label: "Departure", sub: "Earliest first" },
  ];

  const select = (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || !data) return;
    setSelecting(offerId);
    startFlight(criteria, data.searchId, offer, profile ? { email: profile.email, countryCode: profile.countryCode, mobile: profile.mobile } : undefined);
    router.push(`/flights/fare/${offer.id}`);
  };

  const filterPanel = (
    <FilterPanel filters={filters} onChange={setFilters} facets={facets} legCount={criteria.legs.length} resultCount={sorted.length} totalCount={offers.length} />
  );

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">{routeTitle(criteria)}</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                {formatDayShort(first.date)}
                {criteria.trip === "return" && ` – ${formatDayShort(criteria.legs[1].date)}`}
                {criteria.trip === "multicity" && ` – ${formatDayShort(last.date)}`} · {plural(travellers, "passenger")} · {CABIN_LABEL[criteria.cabin]}
              </p>
            </div>
            <Button variant={modifying ? "subtle" : "outline"} leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setModifying((m) => !m)} aria-expanded={modifying}>
              Modify search
            </Button>
          </div>
          {modifying && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <FlightSearchForm initial={criteria} idPrefix="mod" onSubmitted={() => setModifying(false)} />
            </div>
          )}
        </div>
      </div>

      <div className="container-page py-6">
        {data && data.datePrices.length > 1 && (
          <div className="mb-6">
            <DateStrip prices={data.datePrices} criteria={criteria} />
          </div>
        )}

        {state.status === "loading" && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
            <div className="hidden lg:block" aria-hidden>
              <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="skeleton h-3 w-24" />
                    <div className="skeleton h-4 w-40" />
                    <div className="skeleton h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SearchProgress route={`${routeTitle(criteria)} · ${formatDayShort(first.date)}`} />
              <ResultSkeletons count={4} />
            </div>
          </div>
        )}

        {state.status === "error" && (
          <StateView
            tone="error"
            icon={<Wifi className="h-7 w-7" />}
            title="We couldn't complete your search"
            description={<>{state.message} Nothing has been booked or charged. Please try again — if it keeps happening our team can search for you.</>}
            actions={
              <>
                <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </Button>
                <Button variant="outline" onClick={() => setModifying(true)}>
                  Modify search
                </Button>
                <ButtonLink href="/help/contact" variant="ghost">
                  Contact support
                </ButtonLink>
              </>
            }
          />
        )}

        {state.status === "expired" && (
          <StateView
            tone="warning"
            icon={<CalendarClock className="h-7 w-7" />}
            title="Your search has expired"
            description="Fares and availability change quickly, so results are only held for 20 minutes. Refresh to see the latest prices for this trip."
            actions={
              <>
                <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setAttempt((a) => a + 1)}>
                  Refresh results
                </Button>
                <ButtonLink href="/flights" variant="outline">
                  Start a new search
                </ButtonLink>
              </>
            }
          />
        )}

        {state.status === "ready" && offers.length === 0 && (
          <StateView
            icon={<SearchX className="h-7 w-7" />}
            title="No flights found for these dates"
            description={`We couldn't find ${CABIN_LABEL[criteria.cabin].toLowerCase()} flights from ${airportCityOf(first.from)} to ${airportCityOf(first.to)} on ${formatDayShort(first.date)}. Try different dates, nearby airports or another cabin.`}
            actions={
              <>
                <Button onClick={() => setModifying(true)} leftIcon={<Pencil className="h-4 w-4" />}>
                  Modify search
                </Button>
                {criteria.trip === "return" && (
                  <ButtonLink variant="outline" href={flightSearchHref({ ...criteria, trip: "oneway", legs: [criteria.legs[0]] })}>
                    Search one way instead
                  </ButtonLink>
                )}
                <ButtonLink href="/help/contact" variant="ghost">
                  Ask an expert to search
                </ButtonLink>
              </>
            }
          />
        )}

        {state.status === "ready" && offers.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
            <aside className="hidden lg:block" aria-label="Filters">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">{filterPanel}</div>
            </aside>
            <section aria-label="Flight results" className="min-w-0">
              <div role="radiogroup" aria-label="Sort flights" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sorts.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={sort === s.id}
                    onClick={() => setSort(s.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors",
                      sort === s.id ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <span className={cn("block text-[13px] font-bold", sort === s.id ? "text-brand-700" : "text-navy-900")}>{s.label}</span>
                    <span className="block text-xs text-slate-500 tnum">{s.sub}</span>
                  </button>
                ))}
              </div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700" aria-live="polite">
                  {sorted.length} {sorted.length === 1 ? "flight" : "flights"}
                  {isFiltered(filters) && <span className="font-normal text-slate-500"> (filtered from {offers.length})</span>}
                </p>
                <Button variant="outline" size="sm" className="lg:hidden" leftIcon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
                  Filters{isFiltered(filters) ? " •" : ""}
                </Button>
              </div>
              {sorted.length === 0 ? (
                <StateView
                  compact
                  icon={<SlidersHorizontal className="h-7 w-7" />}
                  title="No flights match your filters"
                  description="Try removing a filter — for example allow one stop or a wider time range."
                  actions={
                    <Button onClick={() => setFilters(EMPTY_FILTERS)} leftIcon={<RefreshCw className="h-4 w-4" />}>
                      Reset all filters
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-4">
                  {sorted.slice(0, visible).map((o) => {
                    const badges: string[] = [];
                    if (cheapest?.id === o.id) badges.push("Cheapest");
                    if (fastest?.id === o.id) badges.push("Fastest");
                    if (best?.id === o.id) badges.push("Best overall");
                    return (
                      <li key={o.id}>
                        <OfferCard
                          offer={o}
                          pax={pax}
                          badges={badges}
                          expanded={expanded === o.id}
                          onToggle={() => setExpanded((e) => (e === o.id ? null : o.id))}
                          onSelect={() => select(o.id)}
                          selecting={selecting === o.id}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              {sorted.length > visible && (
                <div className="mt-6 text-center">
                  <Button variant="outline" size="lg" rightIcon={<ChevronDown className="h-4 w-4" />} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Show more flights ({sorted.length - visible} more)
                  </Button>
                </div>
              )}
              <p className="mt-8 flex items-start gap-2 text-xs text-slate-500">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Prices are per person for the selected cabin, include taxes and carrier charges, and are held for 20 minutes. Baggage and seat fees are shown at checkout.{" "}
                <Link href="/help/baggage" className="font-semibold text-brand-600 hover:underline">
                  Baggage guide
                </Link>
              </p>
            </section>
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Filters"
        side="bottom"
        footer={<DrawerFooter count={sorted.length} onApply={() => setDrawerOpen(false)} onReset={() => setFilters(EMPTY_FILTERS)} />}
      >
        <div className="p-4">{filterPanel}</div>
      </Drawer>
      {state.status === "ready" && (
        <span className="sr-only" aria-live="polite">
          {sorted.length} flights shown
        </span>
      )}
    </div>
  );
}

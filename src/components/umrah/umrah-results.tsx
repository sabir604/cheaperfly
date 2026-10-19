"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bus, CalendarDays, MapPin, Plane, RefreshCw, SearchX, SlidersHorizontal, Star, Utensils, Wifi } from "lucide-react";
import { Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { UmrahSearchForm } from "@/components/search/umrah-search-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Checkbox, Select } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { CATEGORY_LABEL, MEAL_SHORT, UMRAH_DEPARTURE_CITIES } from "@/data/umrah";
import { serializeUmrahCriteria, type UmrahUrlCriteria } from "@/lib/engine/criteria";
import { formatDateMed } from "@/lib/engine/dates";
import { packageFromPrice, umrahService } from "@/lib/engine/umrah";
import { useHydrated } from "@/lib/stores/hydration";
import { useUiStore } from "@/lib/stores/session";
import type { UmrahPackage, UmrahRoomType } from "@/lib/types/umrah";
import { cn, plural } from "@/lib/utils";

type Duration = "short" | "medium" | "long";

interface Filters {
  city: string;
  durations: Duration[];
  stars: number[];
  distance: number | null;
  meals: string[];
  room: UmrahRoomType;
  maxPrice: number | null;
}

const emptyFilters = (city: string): Filters => ({ city, durations: [], stars: [], distance: null, meals: [], room: "quad", maxPrice: null });
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const durationOf = (nights: number): Duration => (nights <= 7 ? "short" : nights <= 10 ? "medium" : "long");

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-slate-200 py-5 first:pt-0 last:border-b-0">
      <legend className="mb-3 text-[13px] font-bold uppercase tracking-wide text-navy-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function PackageCard({ pkg, price, criteria, city }: { pkg: UmrahPackage; price: number; criteria: UmrahUrlCriteria; city: string }) {
  const { fmt } = useCurrency();
  const makkah = pkg.options!.hotels.find(x=>x.id===pkg.makkahHotelId)!;
  const madinah = pkg.options!.hotels.find(x=>x.id===pkg.madinahHotelId)!;
  const flight = pkg.options!.flights.find(x=>x.id===pkg.flightOptionIds[0])!;
  const transfer = pkg.options!.transfers.find(x=>x.id===pkg.defaultTransferId)!;
  const next = pkg.departures.filter((d) => !criteria.month || criteria.month === "any" || d.date.startsWith(criteria.month))[0] ?? pkg.departures[0];
  const href = `/umrah/packages/${pkg.slug}?${serializeUmrahCriteria({ ...criteria, departureCity: city })}`;
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
      <div className="grid md:grid-cols-[300px_1fr]">
        <Link href={href} className="relative block" aria-label={`View ${pkg.name}`}>
          <Photo src={pkg.images[0]} alt={pkg.name} className="h-56 md:h-full" imgClassName="transition-transform duration-500 hover:scale-[1.03]" sizes="300px" scrim>
            <Badge tone="gold" className="absolute left-3 top-3 z-10 !bg-gold-500 !px-2 !py-1 !text-white">
              {CATEGORY_LABEL[pkg.category]}
            </Badge>
            <p className="absolute bottom-3 left-3 z-10 text-xs font-bold uppercase tracking-wider text-white">{pkg.nights} nights</p>
          </Photo>
        </Link>
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_190px]">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[19px] font-bold leading-snug text-navy-900">
                  <Link href={href} className="hover:text-umrah-700">
                    {pkg.name}
                  </Link>
                </h3>
                <p className="mt-0.5 text-[13px] text-slate-600">{pkg.tagline}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-umrah-800 px-2 py-1 text-xs font-bold text-white">
                <Star className="h-3 w-3 fill-gold-400 text-gold-400" aria-hidden /> {pkg.rating.toFixed(1)}
              </span>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
              {[
                { h: makkah, label: `Makkah · ${pkg.makkahNights} nights`, to: "the Haram" },
                { h: madinah, label: `Madinah · ${pkg.madinahNights} nights`, to: "the Masjid" },
              ].map(({ h, label, to }) => (
                <div key={label}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="font-semibold text-navy-900">{h.name}</dd>
                  <dd className="flex items-center gap-2 text-xs text-slate-600">
                    <Stars count={h.stars} size={11} /> <MapPin className="h-3 w-3" aria-hidden /> {h.distanceM} m to {to}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <Plane className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {flight.airline}
                {flight.stops === 0 ? " · direct" : " · 1 stop"}
              </li>
              <li className="flex items-center gap-1.5">
                <Bus className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {transfer.label}
              </li>
              <li className="flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {pkg.mealLabel}
              </li>
              <li className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Next: {formatDateMed(next.date)}
                {next.seatsLeft <= 8 ? ` · ${next.seatsLeft} seats left` : ""}
              </li>
            </ul>
            <p className="mt-3 text-xs font-semibold text-umrah-700">Visa processing included · {pkg.groupSize}</p>
          </div>
          <div className="flex flex-row items-end justify-between gap-3 border-t border-slate-100 pt-3 lg:flex-col lg:items-end lg:justify-end lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="text-right">
              <p className="text-[11px] text-slate-500">from, per person</p>
              <p className="text-[28px] font-extrabold leading-none text-navy-900 tnum">{fmt(price)}</p>
              <p className="text-[10px] text-slate-400">{plural(criteria.adults + criteria.children + criteria.infants, "traveller")} · taxes &amp; fees at checkout</p>
            </div>
            <ButtonLink href={href} variant="umrah" className="lg:w-full">
              View package
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}

type Outcome = { status: "ready"; list: UmrahPackage[] } | { status: "error"; message: string };

/** `/umrah/packages`: search form, filters and package list. Mount with a `key` per search so filters reset. */
export function UmrahResults({ criteria }: { criteria: UmrahUrlCriteria }) {
  const hydrated = useHydrated();
  const { currency, fmt } = useCurrency();
  const setScenario = useUiStore((s) => s.setScenario);
  const [attempt, setAttempt] = useState(0);
  const request = `${JSON.stringify(criteria)}#${attempt}`;
  const [outcome, setOutcome] = useState<(Outcome & { request: string }) | null>(null);
  const state: Outcome | { status: "loading" } = outcome && outcome.request === request ? outcome : { status: "loading" };
  const [filters, setFilters] = useState<Filters>(() => emptyFilters(criteria.departureCity));
  const [sort, setSort] = useState("recommended");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const sc = useUiStore.getState().scenario;
    const resetScenario = () => sc !== "ok" && sc !== "price-changed" && setScenario("ok");
    umrahService.search({ month: criteria.month, nights: criteria.nights }, {scenario:sc})
      .then((list) => {
        if (cancelled) return;
        resetScenario();
        setOutcome({ status: "ready", list, request });
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

  const ready = outcome?.status === "ready" && outcome.request === request ? outcome.list : null;
  const list = useMemo(() => ready ?? [], [ready]);
  const priced = useMemo(() => list.map((p) => ({ p, price: packageFromPrice(p, currency, filters.room) })), [list, currency, filters.room]);
  const prices = priced.map((x) => x.price);
  const maxP = prices.length ? Math.max(...prices) : 0;
  const minP = prices.length ? Math.min(...prices) : 0;
  const shown = useMemo(
    () =>
      priced
        .filter(({ p, price }) => {
          if (!p.departureCities.includes(filters.city)) return false;
          if (filters.durations.length && !filters.durations.includes(durationOf(p.nights))) return false;
          const makkah = p.options!.hotels.find(x=>x.id===p.makkahHotelId)!;
          if (filters.stars.length && !filters.stars.includes(makkah.stars)) return false;
          if (filters.distance !== null && makkah.distanceM > filters.distance) return false;
          if (filters.meals.length && !filters.meals.includes(p.meal)) return false;
          return filters.maxPrice === null || price <= filters.maxPrice;
        })
        .sort((a, b) =>
          sort === "price"
            ? a.price - b.price
            : sort === "duration"
              ? a.p.nights - b.p.nights
              : sort === "distance"
                ? a.p.options!.hotels.find(x=>x.id===a.p.makkahHotelId)!.distanceM - b.p.options!.hotels.find(x=>x.id===b.p.makkahHotelId)!.distanceM
                : b.p.rating - a.p.rating,
        ),
    [priced, filters, sort],
  );
  const filtered =
    filters.durations.length > 0 ||
    filters.stars.length > 0 ||
    filters.distance !== null ||
    filters.meals.length > 0 ||
    filters.maxPrice !== null ||
    filters.room !== "quad" ||
    filters.city !== criteria.departureCity;
  const reset = () => setFilters(emptyFilters(criteria.departureCity));

  const panel = (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">
          {shown.length} of {list.length} packages
        </p>
        {filtered && (
          <button type="button" onClick={reset} className="text-[13px] font-bold text-umrah-700 hover:underline">
            Reset all
          </button>
        )}
      </div>
      <FilterGroup title="Departure">
        <label htmlFor="uf-city" className="sr-only">
          Departure city
        </label>
        <Select id="uf-city" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
          {UMRAH_DEPARTURE_CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </FilterGroup>
      <FilterGroup title="Duration">
        <div className="space-y-2.5">
          {(
            [
              ["short", "Up to 7 nights"],
              ["medium", "8–10 nights"],
              ["long", "11+ nights"],
            ] as const
          ).map(([id, label]) => (
            <Checkbox key={id} checked={filters.durations.includes(id)} onChange={() => setFilters({ ...filters, durations: toggle(filters.durations, id) })} label={label} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Makkah hotel category">
        <div className="flex gap-2">
          {[5, 4, 3].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={filters.stars.includes(n)}
              onClick={() => setFilters({ ...filters, stars: toggle(filters.stars, n) })}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-sm font-bold",
                filters.stars.includes(n) ? "border-umrah-700 bg-umrah-50 text-umrah-800" : "border-slate-200 text-slate-700",
              )}
            >
              {n} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Distance from the Haram">
        <div role="radiogroup" aria-label="Distance from the Haram" className="space-y-2">
          {(
            [
              [null, "Any distance"],
              [300, "Within 300 m"],
              [500, "Within 500 m"],
              [1000, "Within 1 km"],
            ] as const
          ).map(([v, label]) => (
            <label key={String(v)} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input type="radio" name="udist" checked={filters.distance === v} onChange={() => setFilters({ ...filters, distance: v })} className="h-4 w-4 accent-umrah-700" />
              {label}
            </label>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Meal plan">
        <div className="space-y-2.5">
          {["breakfast", "half_board", "full_board"].map((m) => (
            <Checkbox key={m} checked={filters.meals.includes(m)} onChange={() => setFilters({ ...filters, meals: toggle(filters.meals, m) })} label={MEAL_SHORT[m]} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Room type (per-person price)">
        <div role="radiogroup" aria-label="Room type" className="space-y-2">
          {(["quad", "triple", "double"] as UmrahRoomType[]).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm capitalize text-slate-700">
              <input type="radio" name="uroom" checked={filters.room === r} onChange={() => setFilters({ ...filters, room: r })} className="h-4 w-4 accent-umrah-700" />
              {r}
            </label>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Price per person">
        <input
          type="range"
          min={minP}
          max={maxP}
          step={10}
          value={filters.maxPrice ?? maxP}
          onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) >= maxP ? null : Number(e.target.value) })}
          aria-label="Maximum price per person"
          className="w-full accent-umrah-700"
        />
        <div className="mt-1 flex justify-between text-xs tnum text-slate-500">
          <span>{fmt(minP)}</span>
          <span className="font-bold text-navy-900">Up to {fmt(filters.maxPrice ?? maxP)}</span>
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div>
      <div className="bg-umrah-900 text-white">
        <div className="container-page py-6">
          <p className="eyebrow mb-1 text-gold-400">Umrah packages</p>
          <h1 className="!text-white text-2xl font-extrabold sm:text-[30px]">Find your Umrah package</h1>
          <div className="mt-5 rounded-xl bg-white p-4 sm:p-5">
            <UmrahSearchForm initial={criteria} idPrefix="ur" />
          </div>
        </div>
      </div>
      <div className="container-page py-6">
        {state.status === "loading" && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8" aria-busy>
            <Skeleton className="hidden h-96 rounded-xl lg:block" />
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5" role="status">
                <p className="text-[17px] font-bold text-navy-900">Finding Umrah packages…</p>
                <p className="text-sm text-slate-500">Checking hotel distances, flights and departure dates.</p>
              </div>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          </div>
        )}
        {state.status === "error" && (
          <StateView
            tone="error"
            icon={<Wifi className="h-7 w-7" />}
            title="We couldn't load packages"
            description={`${state.message} Nothing has been booked or charged.`}
            actions={
              <>
                <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </Button>
                <ButtonLink href="/help/contact" variant="outline">
                  Contact support
                </ButtonLink>
              </>
            }
          />
        )}
        {state.status === "ready" && list.length === 0 && (
          <StateView
            icon={<SearchX className="h-7 w-7" />}
            title="No packages match your search"
            description="Try a different month or duration, or ask our Umrah team to build a package for you."
            actions={
              <>
                <ButtonLink href="/umrah/packages">Show all packages</ButtonLink>
                <ButtonLink href="/help/contact" variant="outline">
                  Ask our Umrah team
                </ButtonLink>
              </>
            }
          />
        )}
        {state.status === "ready" && list.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
            <aside className="hidden lg:block" aria-label="Filters">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">{panel}</div>
            </aside>
            <section aria-label="Umrah packages" className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700" aria-live="polite">
                  {shown.length} package{shown.length === 1 ? "" : "s"} from {filters.city}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="lg:hidden" leftIcon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
                    Filters{filtered ? " •" : ""}
                  </Button>
                  <label htmlFor="usort" className="sr-only">
                    Sort packages
                  </label>
                  <select id="usort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-semibold">
                    <option value="recommended">Recommended</option>
                    <option value="price">Price: low to high</option>
                    <option value="duration">Duration: shortest</option>
                    <option value="distance">Closest to the Haram</option>
                  </select>
                </div>
              </div>
              {shown.length === 0 ? (
                <StateView
                  compact
                  icon={<SlidersHorizontal className="h-7 w-7" />}
                  title="No packages match your filters"
                  description="Try removing a filter or choosing a different departure city."
                  actions={<Button onClick={reset}>Reset all filters</Button>}
                />
              ) : (
                <ul className="space-y-4">
                  {shown.map(({ p, price }) => (
                    <li key={p.slug}>
                      <PackageCard pkg={p} price={price} criteria={criteria} city={filters.city} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Filters"
        side="bottom"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={reset}>
              Reset
            </Button>
            <Button variant="umrah" className="flex-[2]" onClick={() => setDrawerOpen(false)}>
              Show {shown.length} package{shown.length === 1 ? "" : "s"}
            </Button>
          </div>
        }
      >
        <div className="p-4">{panel}</div>
      </Drawer>
    </div>
  );
}

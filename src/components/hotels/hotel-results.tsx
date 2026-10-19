"use client";
import type { HotelSearch } from "@cheaperfly/api-contracts/hotels";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, List, Map as MapIcon, MapPin, Pencil, RefreshCw, SearchX, SlidersHorizontal, Star, Utensils, Wifi } from "lucide-react";
import { ScoreBadge, Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { HotelSearchForm } from "@/components/search/hotel-search-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Checkbox } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { getDestination, type Hotel } from "@/data/hotels";
import { hotelDetailHref } from "@/lib/engine/criteria";
import { formatDateMed, formatDayShort, nightsBetween } from "@/lib/engine/dates";
import {
  EMPTY_HOTEL_FILTERS,
  MEAL_LABEL,
  applyHotelFilters,
  hotelService,
  isHotelFiltered,
  sortHotelRows,
  type HotelCriteria,
  type HotelFilters,
  type HotelRow,
  type HotelSort,
  type MealPlan,
} from "@/lib/engine/hotels";
import { useHydrated } from "@/lib/stores/hydration";
import { useUiStore } from "@/lib/stores/session";
import { cn, plural } from "@/lib/utils";
import { AmenityChips, amenityLabel } from "./amenities";
import { HotelMap } from "./hotel-map";

function HotelCard({ row, criteria, active, onHover, compact }: { row: HotelRow; criteria: HotelCriteria; active: boolean; onHover?: (id: string | null) => void; compact?: boolean }) {
  const { fmtGbp } = useCurrency();
  const { hotel, quote } = row;
  const href = hotelDetailHref(hotel.id, criteria);
  return (
    <article
      id={`hotel-${hotel.id}`}
      onMouseEnter={() => onHover?.(hotel.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn("overflow-hidden rounded-xl border bg-white transition-shadow", active ? "border-brand-500 shadow-lift ring-1 ring-brand-500" : "border-slate-200 hover:shadow-card")}
    >
      <div className={cn("grid", !compact && "md:grid-cols-[300px_1fr]")}>
        <Link href={href} aria-label={`View ${hotel.name}`} className="relative block">
          <Photo src={hotel.images[0]} alt={hotel.name} className={cn(compact ? "h-40" : "h-52 md:h-full")} imgClassName="transition-transform duration-500 hover:scale-[1.03]" sizes="300px">
            {hotel.badge && (
              <Badge tone="navy" className="absolute left-3 top-3 z-10 !px-2 !py-1">
                {hotel.badge}
              </Badge>
            )}
            <span className="absolute bottom-3 right-3 z-10 rounded bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{hotel.images.length} photos</span>
          </Photo>
        </Link>
        <div className={cn("grid min-w-0 gap-4 p-4 sm:p-5", !compact && "lg:grid-cols-[1fr_200px]")}>
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Stars count={hotel.stars} size={13} />
                <h3 className="mt-1 text-[18px] font-bold leading-snug text-navy-900">
                  <Link href={href} className="hover:text-brand-600">
                    {hotel.name}
                  </Link>
                </h3>
                <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /> {hotel.area}, {hotel.city}
                </p>
                <p className="text-xs font-medium text-brand-700">{hotel.distanceLabel}</p>
              </div>
              <ScoreBadge score={hotel.rating} label={hotel.ratingLabel} reviews={hotel.reviewCount} className="shrink-0 text-right max-sm:hidden" />
            </div>
            <div className="mt-3">
              <AmenityChips ids={hotel.keyAmenities} />
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px]">
              <p className="font-bold text-navy-900">{quote.roomName}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" aria-hidden /> {MEAL_LABEL[quote.meal]}
                </span>
                <span className={cn("flex items-center gap-1 font-semibold", quote.refundable ? "text-emerald-700" : "text-slate-500")}>
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  {quote.refundable ? `Free cancellation until ${formatDateMed(quote.freeCancelUntil!)}` : "Non-refundable"}
                </span>
                {quote.payLater && <span className="font-semibold text-brand-700">Pay at hotel</span>}
              </p>
            </div>
          </div>
          <div className={cn("flex flex-row items-end justify-between gap-3 border-t border-slate-100 pt-3", !compact && "lg:flex-col lg:items-end lg:justify-end lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0")}>
            <ScoreBadge score={hotel.rating} className="sm:hidden" />
            <div className="text-right">
              <p className="text-[11px] text-slate-500">
                {plural(quote.nights, "night")}, {plural(quote.rooms, "room")}
              </p>
              <p className="text-[26px] font-extrabold leading-none text-navy-900 tnum">{fmtGbp(quote.perNight)}</p>
              <p className="text-xs text-slate-500">per night</p>
              <p className="mt-1 text-xs font-semibold text-slate-700 tnum">{fmtGbp(quote.roomTotal)} total</p>
              <p className="text-[10px] text-slate-400">+ taxes &amp; fees at checkout</p>
            </div>
            <ButtonLink href={href} size="md" className={cn(!compact && "lg:w-full")}>
              See availability
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-slate-200 py-5 first:pt-0 last:border-b-0">
      <legend className="mb-3 text-[13px] font-bold uppercase tracking-wide text-navy-900">{title}</legend>
      {children}
    </fieldset>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const TYPE_LABEL: Record<string, string> = { hotel: "Hotel", resort: "Resort", apartment: "Apartment / suites", boutique: "Boutique hotel" };
const AMENITY_FILTERS = ["wifi", "pool", "spa", "gym", "restaurant", "beach", "family", "kids", "parking", "shuttle", "halal", "prayer", "haram_shuttle", "zamzam", "kitchen"];

function FiltersPanel({
  filters,
  onChange,
  hotels,
  priceRange,
  shown,
  total,
}: {
  filters: HotelFilters;
  onChange: (f: HotelFilters) => void;
  hotels: Hotel[];
  priceRange: [number, number];
  shown: number;
  total: number;
}) {
  const { gbp, fmt } = useCurrency();
  const set = (patch: Partial<HotelFilters>) => onChange({ ...filters, ...patch });
  const amenities = AMENITY_FILTERS.filter((a) => hotels.some((h) => h.amenities.includes(a)));
  const types = Array.from(new Set(hotels.map((h) => h.propertyType)));
  const meals = Array.from(new Set(hotels.flatMap((h) => h.ratePlans.map((p) => p.meal as MealPlan))));
  const maxPrice = filters.maxPrice ?? priceRange[1];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">
          {shown} of {total} properties
        </p>
        {isHotelFiltered(filters) && (
          <button type="button" onClick={() => onChange({ ...EMPTY_HOTEL_FILTERS })} className="text-[13px] font-bold text-brand-600 hover:text-brand-700">
            Reset all
          </button>
        )}
      </div>
      <FilterGroup title="Price per night">
        <input
          type="range"
          min={priceRange[0]}
          max={priceRange[1]}
          step={5}
          value={maxPrice}
          onChange={(e) => set({ maxPrice: Number(e.target.value) >= priceRange[1] ? null : Number(e.target.value) })}
          aria-label="Maximum price per night"
          className="w-full accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs tnum text-slate-500">
          <span>{fmt(gbp(priceRange[0]))}</span>
          <span className="font-bold text-navy-900">Up to {fmt(gbp(maxPrice))}</span>
        </div>
      </FilterGroup>
      <FilterGroup title="Star rating">
        <div className="flex gap-2">
          {[5, 4, 3].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={filters.stars.includes(n)}
              onClick={() => set({ stars: toggle(filters.stars, n) })}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-sm font-bold transition-colors",
                filters.stars.includes(n) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-700 hover:border-slate-300",
              )}
            >
              {n} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Guest rating">
        <div role="radiogroup" aria-label="Minimum guest rating" className="space-y-2">
          {(
            [
              [0, "Any"],
              [9, "Exceptional 9+"],
              [8, "Excellent 8+"],
              [7, "Good 7+"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input type="radio" name="rating" checked={filters.minRating === v} onChange={() => set({ minRating: v })} className="h-4 w-4 accent-brand-500" />
              {label}
            </label>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Property type">
        <div className="space-y-2.5">
          {types.map((t) => (
            <Checkbox key={t} checked={filters.types.includes(t)} onChange={() => set({ types: toggle(filters.types, t) })} label={TYPE_LABEL[t]} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Meal plan">
        <div className="space-y-2.5">
          {meals.map((m) => (
            <Checkbox key={m} checked={filters.meals.includes(m)} onChange={() => set({ meals: toggle(filters.meals, m) })} label={MEAL_LABEL[m]} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Cancellation">
        <Checkbox
          checked={filters.freeCancellation}
          onChange={(e) => set({ freeCancellation: e.target.checked })}
          label="Free cancellation"
          description="Rates you can cancel without a fee"
        />
      </FilterGroup>
      <FilterGroup title="Amenities">
        <div className="space-y-2.5">
          {amenities.map((a) => (
            <Checkbox key={a} checked={filters.amenities.includes(a)} onChange={() => set({ amenities: toggle(filters.amenities, a) })} label={amenityLabel(a)} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Distance from centre">
        <div role="radiogroup" aria-label="Maximum distance" className="space-y-2">
          {(
            [
              [null, "Any distance"],
              [1, "Within 1 km"],
              [3, "Within 3 km"],
              [5, "Within 5 km"],
            ] as const
          ).map(([v, label]) => (
            <label key={String(v)} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input type="radio" name="distance" checked={filters.maxDistanceKm === v} onChange={() => set({ maxDistanceKm: v })} className="h-4 w-4 accent-brand-500" />
              {label}
            </label>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

const SORTS: { id: HotelSort; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "price", label: "Price: low to high" },
  { id: "rating", label: "Guest rating" },
  { id: "distance", label: "Distance from centre" },
];

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="rounded-xl border border-slate-200 bg-white p-5" role="status" aria-live="polite">
        <p className="text-[17px] font-bold text-navy-900">Finding the best stays…</p>
        <p className="text-sm text-slate-500">Checking availability, room rates and cancellation terms.</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-brand-500" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[300px_1fr]">
          <Skeleton className="h-52 rounded-none md:h-56" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="ml-auto h-9 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

type Outcome = { status: "ready"; data: HotelSearch } | { status: "error"; message: string };

/** `/hotels/search`: filters, sort, list or map view. Mount with a `key` per search so filters reset. */
export function HotelResults({ criteria }: { criteria: HotelCriteria }) {
  const hydrated = useHydrated();
  const { fmtGbp } = useCurrency();
  const setScenario = useUiStore((s) => s.setScenario);
  const [attempt, setAttempt] = useState(0);
  const request = `${JSON.stringify(criteria)}#${attempt}`;
  const [outcome, setOutcome] = useState<(Outcome & { request: string }) | null>(null);
  const state: Outcome | { status: "loading" } = outcome && outcome.request === request ? outcome : { status: "loading" };
  const [filters, setFilters] = useState<HotelFilters>(EMPTY_HOTEL_FILTERS);
  const [sort, setSort] = useState<HotelSort>("recommended");
  const [view, setView] = useState<"list" | "map">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modifying, setModifying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const sc = useUiStore.getState().scenario;
    const resetScenario = () => sc !== "ok" && sc !== "price-changed" && setScenario("ok");
    hotelService
      .search(criteria, { scenario: sc })
      .then((data) => {
        if (cancelled) return;
        resetScenario();
        setOutcome({ status: "ready", data, request });
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

  const destination = getDestination(criteria.destination);
  const data = state.status === "ready" ? state.data : null;
  const hotels = useMemo(() => data?.items.map((i) => i.hotel) ?? [], [data]);
  const rankedIds = useMemo(() => data?.items.map((i) => i.hotel.id) ?? [], [data]);
  const priceRange = useMemo((): [number, number] => {
    const prices = data?.items.map((i) => i.bestQuote.perNight) ?? [0];
    return [Math.min(...prices), Math.max(...prices)];
  }, [data]);
  const rows = useMemo(() => (data ? sortHotelRows(applyHotelFilters(hotels, criteria, filters, Object.fromEntries(data.items.map(i=>[i.hotel.id,i.quotes]))), sort, rankedIds) : []), [data, hotels, criteria, filters, sort, rankedIds]);
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const guests = criteria.occupancy.adults + criteria.occupancy.children;
  const filtersPanel = <FiltersPanel filters={filters} onChange={setFilters} hotels={hotels} priceRange={priceRange} shown={rows.length} total={hotels.length} />;
  const activeRow = activeId ? rows.find((r) => r.hotel.id === activeId) : undefined;

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">Hotels in {destination?.city}</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                {formatDayShort(criteria.checkIn)} – {formatDayShort(criteria.checkOut)} · {plural(nights, "night")} · {plural(guests, "guest")}, {plural(criteria.occupancy.rooms, "room")}
              </p>
            </div>
            <Button variant={modifying ? "subtle" : "outline"} leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setModifying((m) => !m)} aria-expanded={modifying}>
              Modify search
            </Button>
          </div>
          {modifying && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <HotelSearchForm initial={criteria} idPrefix="hmod" onSubmitted={() => setModifying(false)} />
            </div>
          )}
        </div>
      </div>
      <div className="container-page py-6">
        {state.status === "loading" && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
            <div className="hidden space-y-5 rounded-xl border border-slate-200 bg-white p-5 lg:block" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
            <ResultsSkeleton />
          </div>
        )}
        {state.status === "error" && (
          <StateView
            tone="error"
            icon={<Wifi className="h-7 w-7" />}
            title="We couldn't load hotels right now"
            description={`${state.message} Nothing has been booked or charged. Please try again.`}
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
        {state.status === "ready" && hotels.length === 0 && (
          <StateView
            icon={<SearchX className="h-7 w-7" />}
            title="No hotels available for these dates"
            description={`We couldn't find rooms in ${destination?.city} for ${plural(guests, "guest")} in ${plural(criteria.occupancy.rooms, "room")} on those dates. Try different dates or fewer guests per room.`}
            actions={
              <>
                <Button leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setModifying(true)}>
                  Change dates or guests
                </Button>
                <ButtonLink href="/hotels" variant="outline">
                  Explore other destinations
                </ButtonLink>
              </>
            }
          />
        )}
        {state.status === "ready" && hotels.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
            <aside className="hidden lg:block" aria-label="Filters">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">{filtersPanel}</div>
            </aside>
            <section aria-label="Hotel results" className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700" aria-live="polite">
                  {rows.length} {rows.length === 1 ? "property" : "properties"} in {destination?.city}
                  {isHotelFiltered(filters) && <span className="font-normal text-slate-500"> (filtered from {hotels.length})</span>}
                </p>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                  <Button variant="outline" size="sm" className="lg:hidden" leftIcon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
                    Filters{isHotelFiltered(filters) ? " •" : ""}
                  </Button>
                  <label className="sr-only" htmlFor="hsort">
                    Sort hotels
                  </label>
                  <select
                    id="hsort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as HotelSort)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-800 sm:flex-none"
                  >
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div role="group" aria-label="View" className="flex rounded-lg bg-slate-100 p-0.5">
                    {(
                      [
                        ["list", List, "List"],
                        ["map", MapIcon, "Map"],
                      ] as const
                    ).map(([id, Icon, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={view === id}
                        onClick={() => setView(id)}
                        className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold", view === id ? "bg-white text-navy-900 shadow-sm" : "text-slate-600")}
                      >
                        <Icon className="h-4 w-4" aria-hidden /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {rows.length === 0 ? (
                <StateView
                  compact
                  icon={<SlidersHorizontal className="h-7 w-7" />}
                  title="No properties match your filters"
                  description="Try removing a filter, such as free cancellation or a specific meal plan."
                  actions={
                    <Button onClick={() => setFilters(EMPTY_HOTEL_FILTERS)} leftIcon={<RefreshCw className="h-4 w-4" />}>
                      Reset all filters
                    </Button>
                  }
                />
              ) : view === "list" ? (
                <ul className="space-y-4">
                  {rows.map((row) => (
                    <li key={row.hotel.id}>
                      <HotelCard row={row} criteria={criteria} active={activeId === row.hotel.id} onHover={setActiveId} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_1fr]">
                  <ul className="order-2 max-h-[75vh] space-y-3 overflow-y-auto pr-1 xl:order-1">
                    {rows.map((row) => (
                      <li key={row.hotel.id}>
                        <HotelCard row={row} criteria={criteria} active={activeId === row.hotel.id} onHover={setActiveId} compact />
                      </li>
                    ))}
                  </ul>
                  <div className="order-1 xl:order-2">
                    <div className="sticky top-20">
                      <HotelMap
                        destinationId={criteria.destination}
                        className="h-[380px] xl:h-[75vh]"
                        activeId={activeId}
                        onSelect={(id) => {
                          setActiveId(id);
                          document.getElementById(`hotel-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        }}
                        pins={rows.map((r) => ({ id: r.hotel.id, x: r.hotel.map.x, y: r.hotel.map.y, label: fmtGbp(r.quote.perNight) }))}
                      />
                      {activeRow && (
                        <p className="mt-2 text-center text-xs text-slate-500">
                          Selected: <b className="text-navy-900">{activeRow.hotel.name}</b> — see it highlighted in the list
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
            <Button variant="outline" onClick={() => setFilters(EMPTY_HOTEL_FILTERS)} className="flex-1">
              Reset
            </Button>
            <Button onClick={() => setDrawerOpen(false)} className="flex-[2]">
              Show {rows.length} propert{rows.length === 1 ? "y" : "ies"}
            </Button>
          </div>
        }
      >
        <div className="p-4">{filtersPanel}</div>
      </Drawer>
    </div>
  );
}

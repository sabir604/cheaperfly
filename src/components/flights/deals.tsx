"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, Plane, Search, Trash2 } from "lucide-react";
import { AirlineMark } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { SectionHeading } from "@/components/ui/primitives";
import { IMG } from "@/data/hotels";
import { flightSearchHref } from "@/lib/engine/criteria";
import { formatDayShort } from "@/lib/engine/dates";
import { DEAL_ROUTES, HOME_DESTINATIONS, cheapestDeal, dealCriteria } from "@/lib/engine/deals";
import { fareAdultTotal } from "@/lib/engine/pricing";
import { useSiteConfig } from "@/lib/site-config";
import { useHydrated } from "@/lib/stores/hydration";
import { useUiStore } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

/** "Fares that caught our eye": cheapest return fare on each deal route, 3 weeks out. */
export function FlightDeals() {
  const { fmt, currency } = useCurrency();
  const rows = useMemo(() => DEAL_ROUTES.map((r) => ({ r, deal: cheapestDeal(r.from, r.to, 21, 7) })).filter((x) => x.deal), []);
  return (
    <section aria-labelledby="deals-h" className="container-page pt-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow mb-1.5 text-brand-600">Featured flight deals</p>
          <h2 id="deals-h" className="text-[28px] font-bold leading-tight">
            Fares that caught our eye
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            The lowest return fares we found for the next few weeks. Prices are per person, include taxes and change daily.
          </p>
          <Link href="/flights" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700">
            Search all destinations <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {rows.map(({ r, deal }) => {
            const d = deal!;
            return (
              <li key={`${r.from}-${r.to}`}>
                <Link href={flightSearchHref(dealCriteria(r.from, r.to, 21, 7))} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-5">
                  <AirlineMark code={d.airlineCode} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-navy-900">
                      {d.fromCity} <span className="mx-1 text-slate-400">⇄</span> {d.toCity}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {formatDayShort(d.depart)} – {formatDayShort(d.ret)} · {d.airlineName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "hidden rounded px-2 py-0.5 text-[11px] font-bold sm:inline-block",
                      d.stops === 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {d.stops === 0 ? "Direct" : `${d.stops} stop`}
                  </span>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500">from</p>
                    <p className="text-lg font-extrabold leading-none text-navy-900 tnum">{fmt(fareAdultTotal(d.offer.fares[0], currency))}</p>
                  </div>
                  <ArrowRight
                    className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 sm:block"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Mosaic of featured destinations (admin-configurable), with "from" prices out of London. */
export function PopularDestinations() {
  const { fmt, currency } = useCurrency();
  const featured = useSiteConfig().homepage.featuredDestinations;
  const items = useMemo(
    () =>
      featured
        .map((code) => HOME_DESTINATIONS.find((d) => d.to === code))
        .filter((d) => !!d)
        .map((d) => ({ ...d, deal: cheapestDeal("LON", d.to), href: flightSearchHref(dealCriteria("LON", d.to)) })),
    [featured],
  );
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="dest-h" className="container-page pt-16">
      <SectionHeading
        eyebrow="Popular right now"
        title={<span id="dest-h">Where will you go next?</span>}
        subtitle="Return flights from London, per person, including taxes."
      />
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:auto-rows-[224px] lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((d, i) => {
          const price = d.deal ? fmt(fareAdultTotal(d.deal.offer.fares[0], currency)) : null;
          return (
            <Link
              key={d.to}
              href={d.href}
              aria-label={`Flights from London to ${d.city}${price ? ` from ${price}` : ""}`}
              className={cn(
                "group relative block w-[260px] shrink-0 snap-start overflow-hidden rounded-xl lg:w-auto",
                i === 0 ? "h-[340px] lg:col-span-2 lg:row-span-2 lg:h-auto" : "h-[340px] lg:h-auto",
              )}
            >
              <Photo
                src={IMG[d.image]}
                alt=""
                scrim
                className="absolute inset-0"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
                sizes={i === 0 ? "(min-width:1024px) 600px, 260px" : "(min-width:1024px) 300px, 260px"}
              />
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{d.country}</p>
                  <h3 className={cn("font-extrabold text-white", i === 0 ? "text-3xl" : "text-xl")} style={{ letterSpacing: "-0.02em" }}>
                    {d.city}
                  </h3>
                  {i === 0 && <p className="mt-1 max-w-xs text-sm text-white/80">{d.tag}</p>}
                  {price && (
                    <p className="mt-2 text-sm text-white/90">
                      from <span className="text-lg font-bold text-white tnum">{price}</span>
                    </p>
                  )}
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors group-hover:bg-white group-hover:text-navy-900">
                  <ArrowUpRight className="h-5 w-5" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** "Pick up where you left off": the last six searches from `cf.ui.recent`. */
export function RecentSearches() {
  const hydrated = useHydrated();
  const recent = useUiStore((s) => s.recent);
  const clearRecent = useUiStore((s) => s.clearRecent);
  if (!hydrated || recent.length === 0) return null;
  return (
    <section aria-labelledby="recent-h" className="container-page pt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-h" className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
          <Clock className="h-4 w-4 text-slate-400" aria-hidden /> Pick up where you left off
        </h2>
        <button type="button" onClick={clearRecent} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
        </button>
      </div>
      <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {recent.map((r) => (
          <li key={r.id} className="snap-start">
            <Link
              href={r.href}
              className="flex w-[290px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-brand-400 hover:bg-brand-50/40"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  r.product === "umrah" ? "bg-umrah-50 text-umrah-800" : "bg-brand-50 text-brand-600",
                )}
              >
                {r.product === "flight" ? <Plane className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-navy-900">{r.label}</span>
                <span className="block truncate text-xs text-slate-500">{r.sublabel}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

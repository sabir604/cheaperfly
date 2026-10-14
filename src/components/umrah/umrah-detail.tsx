"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Bus, CalendarDays, Check, MapPin, Plane, ShieldCheck, Star, X } from "lucide-react";
import { Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { PassengerPicker } from "@/components/search/pickers";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/disclosure";
import { Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { CATEGORY_LABEL, getUmrahFlight, getUmrahHotel, getUmrahTransfer } from "@/data/umrah";
import { toCurrency } from "@/lib/engine/currency";
import { addDaysISO, formatDayLong, formatDayShort } from "@/lib/engine/dates";
import { umrahAdultPackagePrice } from "@/lib/engine/pricing";
import { defaultUmrahConfig, resolveUmrahPricingInput } from "@/lib/engine/umrah";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useSessionStore } from "@/lib/stores/session";
import type { UmrahConfig, UmrahPackage } from "@/lib/types/umrah";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "itinerary", label: "Itinerary" },
  { id: "hotels", label: "Hotels" },
  { id: "flights", label: "Flights" },
  { id: "transfers", label: "Transfers" },
  { id: "inclusions", label: "Inclusions" },
  { id: "exclusions", label: "Exclusions" },
  { id: "important", label: "Important information" },
];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-umrah-700/70">{label}</dt>
      <dd className="font-bold text-navy-900">{children}</dd>
    </div>
  );
}

/** `/umrah/packages/[slug]`. `seed` comes from the search link (departure city, month, party). */
export function UmrahDetail({ pkg, seed }: { pkg: UmrahPackage; seed?: Partial<UmrahConfig> }) {
  const router = useRouter();
  const { currency, fmt } = useCurrency();
  const startUmrah = useDraftsStore((s) => s.startUmrah);
  const profile = useSessionStore((s) => s.profile);
  const [config, setConfig] = useState<UmrahConfig>(() => defaultUmrahConfig(pkg, seed));
  const [section, setSection] = useState("overview");
  const perAdult = umrahAdultPackagePrice(resolveUmrahPricingInput(pkg, config), currency);
  const departure = pkg.departures.find((d) => d.date === config.departureDate)!;
  const paying = config.adults + config.children;
  const makkah = getUmrahHotel(pkg.makkahHotelId)!;
  const madinah = getUmrahHotel(pkg.madinahHotelId)!;

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`u-${s.id}`)).filter((e): e is HTMLElement => !!e);
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setSection(top.target.id.replace("u-", ""));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const book = () => {
    startUmrah(pkg.id, config, profile ? { email: profile.email, countryCode: profile.countryCode, mobile: profile.mobile } : undefined);
    router.push("/umrah/book/customize");
  };

  const bookCard = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-xs font-semibold text-slate-500">From</p>
      <p className="text-[34px] font-extrabold leading-none text-navy-900 tnum">{fmt(perAdult)}</p>
      <p className="text-xs text-slate-500">per adult · quad room · taxes &amp; fees at checkout</p>
      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <div>
          <label htmlFor="ud-date" className="mb-1 block text-[13px] font-semibold text-slate-700">
            Departure date
          </label>
          <Select id="ud-date" value={config.departureDate} onChange={(e) => setConfig({ ...config, departureDate: e.target.value })}>
            {pkg.departures.map((d) => (
              <option key={d.date} value={d.date}>
                {formatDayShort(d.date)}
                {d.label ? ` · ${d.label}` : ""}
              </option>
            ))}
          </Select>
          <p className={cn("mt-1 text-xs font-semibold", departure.seatsLeft <= 8 ? "text-red-600" : "text-emerald-700")}>
            {departure.seatsLeft <= 8 ? `Only ${departure.seatsLeft} seats left` : `${departure.seatsLeft} seats available`}
          </p>
        </div>
        <div>
          <label htmlFor="ud-city" className="mb-1 block text-[13px] font-semibold text-slate-700">
            Departing from
          </label>
          <Select id="ud-city" value={config.departureCity} onChange={(e) => setConfig({ ...config, departureCity: e.target.value })}>
            {pkg.departureCities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <p className="mb-1 text-[13px] font-semibold text-slate-700">Travellers</p>
          <div className="rounded-lg border border-slate-300 px-2 py-0.5">
            <PassengerPicker value={{ adults: config.adults, children: config.children, infants: config.infants }} onChange={(p) => setConfig({ ...config, ...p })} />
          </div>
        </div>
      </div>
      <Button variant="umrah" size="lg" block className="mt-5" onClick={book}>
        Customise &amp; book
      </Button>
      <p className="mt-2 text-center text-xs text-slate-500">
        Estimated total for {paying} paying traveller{paying > 1 ? "s" : ""}: <b className="text-navy-900 tnum">{fmt(perAdult * config.adults + Math.round(0.75 * perAdult) * config.children)}</b>+
      </p>
      <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
        {["Umrah visa processing included", "Customise hotels, room, transfers & extras next", "24/7 in-country pilgrim support"].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-umrah-700" aria-hidden /> {t}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      <div className="bg-umrah-900">
        <div className="container-page pb-6 pt-5">
          <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-umrah-100/80">
            <Link href="/umrah" className="hover:text-white">
              Umrah
            </Link>
            {" / "}
            <Link href="/umrah/packages" className="hover:text-white">
              Packages
            </Link>
            {" / "}
            <span className="text-white">{pkg.name}</span>
          </nav>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="gold" className="!bg-gold-500 !text-white">
                  {CATEGORY_LABEL[pkg.category]}
                </Badge>
                <span className="flex items-center gap-1 text-sm font-bold text-white">
                  <Star className="h-4 w-4 fill-gold-400 text-gold-400" aria-hidden /> {pkg.rating.toFixed(1)}{" "}
                  <span className="font-normal text-umrah-100/80">({pkg.reviewCount} reviews)</span>
                </span>
              </div>
              <h1 className="mt-2 !text-white text-[30px] font-extrabold leading-tight sm:text-[38px]" style={{ letterSpacing: "-0.02em" }}>
                {pkg.name}
              </h1>
              <p className="mt-1 max-w-2xl text-[16px] text-umrah-100/90">{pkg.tagline}</p>
            </div>
            <ul className="flex flex-wrap gap-2 text-sm text-white">
              <li className="rounded-lg bg-white/10 px-3 py-2">
                <b>{pkg.nights}</b> nights
              </li>
              <li className="rounded-lg bg-white/10 px-3 py-2">
                <b>{pkg.makkahNights}</b> Makkah
              </li>
              <li className="rounded-lg bg-white/10 px-3 py-2">
                <b>{pkg.madinahNights}</b> Madinah
              </li>
            </ul>
          </div>
          <div className="grid gap-2 overflow-hidden rounded-2xl md:h-[380px] md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
            <Photo src={pkg.images[0]} alt={pkg.name} priority className="h-64 md:row-span-2 md:h-auto" sizes="(min-width:768px) 50vw, 100vw" />
            {pkg.images.slice(1, 4).map((src, i) => (
              <Photo key={src} src={src} alt="" className={cn("hidden md:block", i === 2 && "md:col-span-2 md:col-start-2 md:row-start-2")} sizes="25vw" />
            ))}
          </div>
        </div>
      </div>
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav aria-label="Package sections" className="container-page scrollbar-none flex gap-6 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => document.getElementById(`u-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-current={section === s.id}
              className={cn(
                "-mb-px shrink-0 border-b-2 py-3.5 text-sm font-semibold transition-colors",
                section === s.id ? "border-umrah-700 text-umrah-800" : "border-transparent text-slate-600 hover:text-navy-900",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 space-y-14">
          <section id="u-overview" className="scroll-mt-36" aria-labelledby="uo-h">
            <h2 id="uo-h" className="mb-3 text-xl font-bold">
              Package overview
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {pkg.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-umrah-700" aria-hidden /> {h}
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-umrah-50 p-5 sm:grid-cols-4">
              <Fact label="Duration">{pkg.nights} nights</Fact>
              <Fact label="Meals">{pkg.mealLabel}</Fact>
              <Fact label="Group">{pkg.groupSize}</Fact>
              <Fact label="Guides">{pkg.guide}</Fact>
            </dl>
            <h3 className="mb-3 mt-8 text-[16px] font-bold">Available departures</h3>
            <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Departure</th>
                    <th className="px-4 py-2.5">Return</th>
                    <th className="px-4 py-2.5">Availability</th>
                    <th className="px-4 py-2.5 text-right">From / person</th>
                    <th className="px-4 py-2.5">
                      <span className="sr-only">Select</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pkg.departures.map((d) => {
                    const price = umrahAdultPackagePrice(resolveUmrahPricingInput(pkg, { ...config, departureDate: d.date }), currency);
                    const selected = d.date === config.departureDate;
                    return (
                      <tr key={d.date} className={cn(selected && "bg-umrah-50/60")}>
                        <td className="px-4 py-3 font-semibold text-navy-900">
                          {formatDayShort(d.date)}
                          {d.label && (
                            <Badge tone="gold" className="ml-2">
                              {d.label}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDayShort(addDaysISO(d.date, pkg.nights))}</td>
                        <td className={cn("px-4 py-3 text-xs font-semibold", d.seatsLeft <= 8 ? "text-red-600" : "text-emerald-700")}>{d.seatsLeft} seats</td>
                        <td className="px-4 py-3 text-right font-bold text-navy-900 tnum">{fmt(price)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant={selected ? "umrah" : "outline"} onClick={() => setConfig({ ...config, departureDate: d.date })} aria-pressed={selected}>
                            {selected ? "Selected" : "Select"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section id="u-itinerary" className="scroll-mt-36" aria-labelledby="ui-h">
            <h2 id="ui-h" className="mb-2 text-xl font-bold">
              Day-by-day itinerary
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white px-6">
              {pkg.itinerary.map((day, i) => (
                <Accordion
                  key={day.day}
                  defaultOpen={i < 2}
                  title={
                    <span>
                      <span className="mr-2 text-umrah-700">Day {day.day}</span>
                      {day.title}
                    </span>
                  }
                  meta={<Badge tone="umrah">{day.location}</Badge>}
                >
                  <p>{day.summary}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {day.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">Meals: {day.meals}</p>
                </Accordion>
              ))}
            </div>
          </section>
          <section id="u-hotels" className="scroll-mt-36" aria-labelledby="uh-h">
            <h2 id="uh-h" className="mb-4 text-xl font-bold">
              Your hotels
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { h: makkah, n: pkg.makkahNights, c: "Makkah", t: "Masjid al-Haram" },
                { h: madinah, n: pkg.madinahNights, c: "Madinah", t: "Al-Masjid an-Nabawi" },
              ].map(({ h, n, c, t }) => (
                <article key={h.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <Photo src={h.image} alt={h.name} ratio="16/10" sizes="400px" />
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-umrah-700">
                      {c} · {n} nights
                    </p>
                    <h3 className="mt-0.5 text-[16px] font-bold text-navy-900">{h.name}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Stars count={h.stars} size={12} /> <MapPin className="h-3.5 w-3.5" aria-hidden /> {h.distanceM} m to {t}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Prefer somewhere closer or more affordable? You can swap hotels in the next step ({pkg.makkahHotelOptions.length} Makkah and {pkg.madinahHotelOptions.length} Madinah
              options).
            </p>
          </section>
          <section id="u-flights" className="scroll-mt-36" aria-labelledby="uf-h">
            <h2 id="uf-h" className="mb-4 text-xl font-bold">
              Flights
            </h2>
            <ul className="space-y-3">
              {pkg.flightOptionIds.map((id) => {
                const f = getUmrahFlight(id)!;
                const amount = fmt(toCurrency(f.priceDelta, currency));
                return (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Plane className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[15px] font-bold text-navy-900">{f.label}</p>
                        <p className="text-xs text-slate-500">
                          {f.route} · {f.baggage}
                        </p>
                      </div>
                    </div>
                    <Badge tone={f.priceDelta < 0 ? "success" : "outline"}>{f.priceDelta === 0 ? "Included" : f.priceDelta > 0 ? `+${amount} pp` : `${amount} pp`}</Badge>
                  </li>
                );
              })}
            </ul>
          </section>
          <section id="u-transfers" className="scroll-mt-36" aria-labelledby="ut-h">
            <h2 id="ut-h" className="mb-4 text-xl font-bold">
              Transfers
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pkg.transferOptionIds.map((id) => {
                const t = getUmrahTransfer(id)!;
                return (
                  <li key={id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="flex items-center gap-2 text-[15px] font-bold text-navy-900">
                      <Bus className="h-4 w-4 text-slate-400" aria-hidden /> {t.label}
                      {id === pkg.defaultTransferId && <Badge tone="umrah">Included</Badge>}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                  </li>
                );
              })}
            </ul>
          </section>
          <section id="u-inclusions" className="scroll-mt-36" aria-labelledby="uin-h">
            <h2 id="uin-h" className="mb-4 text-xl font-bold">
              What’s included
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pkg.inclusions.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </section>
          <section id="u-exclusions" className="scroll-mt-36" aria-labelledby="uex-h">
            <h2 id="uex-h" className="mb-4 text-xl font-bold">
              Not included
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pkg.exclusions.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </section>
          <section id="u-important" className="scroll-mt-36" aria-labelledby="uim-h">
            <h2 id="uim-h" className="mb-4 text-xl font-bold">
              Important information
            </h2>
            <ul className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
              {pkg.important.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-sm text-amber-950">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden /> {x}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="h-4 w-4" aria-hidden /> Selected: <b className="text-navy-900">{formatDayLong(config.departureDate)}</b>
            </p>
          </section>
          <div className="lg:hidden">{bookCard}</div>
        </div>
        <aside className="hidden lg:block" aria-label="Book this package">
          <div className="sticky top-32">{bookCard}</div>
        </aside>
      </div>
    </div>
  );
}

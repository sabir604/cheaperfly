"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Headset, Layers, MessageCircle, Phone, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { ScoreBadge, Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { HOTELS, IMG, getDestination } from "@/data/hotels";
import { dealCriteria } from "@/lib/engine/deals";
import { defaultHotelDates, defaultOccupancy, flightSearchHref, hotelDetailHref } from "@/lib/engine/criteria";
import { bestQuote, type HotelCriteria } from "@/lib/engine/hotels";
import { umrahAdultPackagePrice } from "@/lib/engine/pricing";
import { defaultUmrahConfig, getUmrahPackages, resolveUmrahPricingInput } from "@/lib/engine/umrah";
import { useFeatures, useSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const RECOMMENDED_HOTELS = ["azure-palm-resort", "thamesgate-grand", "bosphorus-pearl", "marina-crest", "corniche-bay-resort", "creek-heritage"];

export function ExploreDubai() {
  return (
    <section aria-labelledby="dubai-h" className="container-page pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="grid grid-cols-[1.35fr_1fr] grid-rows-2 gap-3">
          <Photo src={IMG.dubaiBurj} alt="Burj Khalifa rising above Downtown Dubai" className="row-span-2 min-h-[420px] rounded-2xl" sizes="(min-width:1024px) 320px, 55vw" />
          <Photo src={IMG.dubaiArab} alt="Burj Al Arab on the coast" className="rounded-2xl" sizes="(min-width:1024px) 240px, 40vw" />
          <Photo src={IMG.dubaiBeach} alt="Camels on a Dubai beach with the skyline behind" className="rounded-2xl" sizes="(min-width:1024px) 240px, 40vw" />
        </div>
        <div>
          <p className="eyebrow mb-2 text-brand-600">Explore Dubai</p>
          <h2 id="dubai-h" className="text-[34px] font-extrabold leading-[1.1]">
            Sun, skyline and a stopover worth taking
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-600">
            From the top of the Burj Khalifa to the souks of Deira, Dubai packs a week of sights into a few days. Fly direct from London in under seven hours, then
            stay on the marina, the Palm or in the old town.
          </p>
          <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-slate-200 py-5">
            {[
              ["6h 50m", "Direct from London"],
              ["Nov – Mar", "Best time to go"],
              ["AED", "Local currency"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-lg font-extrabold text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={flightSearchHref(dealCriteria("LON", "DXB"))} size="lg" leftIcon={<Sparkles className="h-4 w-4" />}>
              Flights to Dubai
            </ButtonLink>
            <ButtonLink href="/hotels?dest=dubai" size="lg" variant="outline">
              Hotels in Dubai
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const INSPIRATION = [
  {
    img: IMG.istanbulDusk,
    tag: "City guide",
    title: "48 hours in Istanbul: domes, ferries and the best breakfast in Beyoğlu",
    href: "/hotels?dest=istanbul",
    cta: "Find Istanbul hotels",
  },
  {
    img: IMG.makkahClock,
    tag: "Umrah",
    title: "Your first Umrah: what to pack, what to expect and how to prepare",
    href: "/umrah",
    cta: "Plan your Umrah",
  },
  {
    img: IMG.londonStreet,
    tag: "Value guide",
    title: "London for less: where to stay, and how to save on flights from the Gulf",
    href: "/hotels?dest=london",
    cta: "See London hotels",
  },
];

export function Inspiration() {
  return (
    <section aria-labelledby="insp-h" className="container-page pt-24">
      <SectionHeading eyebrow="Travel inspiration" title={<span id="insp-h">Ideas for your next trip</span>} />
      <div className="grid gap-5 md:grid-cols-[1.25fr_1fr_1fr]">
        {INSPIRATION.map((item) => (
          <Link key={item.title} href={item.href} className="group relative block overflow-hidden rounded-2xl">
            <Photo
              src={item.img}
              alt=""
              scrim
              className="min-h-[300px] md:min-h-[440px]"
              imgClassName="transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width:768px) 420px, 100vw"
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-5">
              <Badge tone="outline" className="mb-2.5 border-white/30 bg-white/15 !text-white backdrop-blur">
                {item.tag}
              </Badge>
              <h3 className="text-[19px] font-bold leading-snug !text-white">{item.title}</h3>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 group-hover:text-white">
                {item.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("done");
      toast.success("You're subscribed. Watch your inbox for fare drops.");
    } else setState("error");
  };
  return (
    <section aria-labelledby="news-h" className="container-page pt-24">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 lg:flex-row lg:items-center">
        <div className="max-w-md">
          <h2 id="news-h" className="text-2xl font-extrabold">
            Get fare drops before everyone else
          </h2>
          <p className="mt-1.5 text-[15px] text-slate-600">One short email a week with the best flight, hotel and Umrah deals. Unsubscribe any time.</p>
        </div>
        {state === "done" ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <Check className="h-4 w-4" aria-hidden /> Thanks — you’re on the list.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="w-full lg:max-w-md">
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="news-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="news-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  invalid={state === "error"}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setState("idle");
                  }}
                />
              </div>
              <Button type="submit" size="md" className="h-11">
                Subscribe
              </Button>
            </div>
            {state === "error" && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
                Please enter a valid email address.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

export function RecommendedHotels() {
  const { fmtGbp } = useCurrency();
  const items = useMemo(
    () =>
      RECOMMENDED_HOTELS.map((id) => {
        const hotel = HOTELS.find((h) => h.id === id)!;
        const dates = defaultHotelDates();
        const criteria: HotelCriteria = {
          destination: getDestination(hotel.city.toLowerCase())!.id,
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
          occupancy: defaultOccupancy(),
        };
        return { hotel, criteria, quote: bestQuote(hotel, criteria) };
      }),
    [],
  );
  return (
    <section aria-labelledby="hotels-h" className="pt-20">
      <div className="container-page">
        <SectionHeading
          eyebrow="Recommended stays"
          title={<span id="hotels-h">Hotels guests love</span>}
          subtitle="Handpicked for location, service and value. Free cancellation on most rooms."
          action={
            <ButtonLink href="/hotels" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Search hotels
            </ButtonLink>
          }
        />
      </div>
      <div className="container-page">
        <ul className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {items.map(({ hotel, criteria, quote }) => (
            <li key={hotel.id} className="w-[290px] shrink-0 snap-start sm:w-[310px]">
              <Link href={hotelDetailHref(hotel.id, criteria)} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
                <Photo src={hotel.images[0]} alt={hotel.name} ratio="4/3" imgClassName="transition-transform duration-500 group-hover:scale-[1.04]" sizes="310px">
                  {hotel.badge && (
                    <Badge tone="navy" className="absolute left-3 top-3 z-10 !px-2 !py-1">
                      {hotel.badge}
                    </Badge>
                  )}
                </Photo>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Stars count={hotel.stars} size={12} />
                      <h3 className="mt-1 truncate text-[16px] font-bold text-navy-900">{hotel.name}</h3>
                      <p className="truncate text-[13px] text-slate-500">
                        {hotel.area}, {hotel.city}
                      </p>
                    </div>
                    <ScoreBadge score={hotel.rating} />
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500">
                      {hotel.ratingLabel} · {hotel.reviewCount.toLocaleString("en-GB")} reviews
                    </p>
                    {quote && (
                      <p className="text-right leading-tight">
                        <span className="block text-[11px] text-slate-500">from / night</span>
                        <span className="text-lg font-extrabold text-navy-900 tnum">{fmtGbp(quote.perNight)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const HELP_TOPICS = [
  ["Change or cancel a flight", "/help/changes"],
  ["Check the status of a refund", "/help/refunds"],
  ["Baggage allowances explained", "/help/baggage"],
  ["Umrah visa and documents", "/help/umrah"],
  ["Payment methods and receipts", "/help/payments"],
];

const BAND_ICON = "flex h-9 w-9 items-center justify-center rounded-lg bg-white/10";

export function SupportBand() {
  const { contact } = useSiteConfig();
  const features = useFeatures();
  return (
    <section aria-labelledby="support-h" className="container-page pt-24">
      <div className="grid overflow-hidden rounded-2xl bg-navy-900 text-white lg:grid-cols-[1.1fr_1fr]">
        <div className="p-8 sm:p-12">
          <p className="eyebrow mb-2 text-brand-300">Support</p>
          <h2 id="support-h" className="!text-white text-[30px] font-extrabold leading-tight">
            We’re with you before, during and after your trip
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-300">
            Change a flight, chase a refund or ask about baggage. Our team and help centre are available around the clock.
          </p>
          <ul className="mt-7 space-y-3.5 text-[15px]">
            {features.telephony && contact.phone && (
              <li className="flex items-center gap-3">
                <span className={BAND_ICON}>
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
                {contact.phone} {contact.phoneHours && <span className="text-sm text-slate-400">· {contact.phoneHours}</span>}
              </li>
            )}
            <li className="flex items-center gap-3">
              <span className={BAND_ICON}>
                <MessageCircle className="h-4 w-4" aria-hidden />
              </span>
              {features.whatsappSupport ? "WhatsApp & in-app messaging" : "In-app messaging"}
            </li>
            <li className="flex items-center gap-3">
              <span className={BAND_ICON}>
                <Clock3 className="h-4 w-4" aria-hidden />
              </span>
              Average first reply in under 5 minutes
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/help/contact" variant="white" size="lg">
              Contact support
            </ButtonLink>
            <ButtonLink href="/manage-booking" size="lg" variant="ghost" className="text-white hover:bg-white/10">
              Manage a booking
            </ButtonLink>
          </div>
        </div>
        <div className="bg-navy-800/60 p-8 sm:p-12">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Popular help topics</h3>
          <ul className="divide-y divide-white/10">
            {HELP_TOPICS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="group flex items-center justify-between py-3.5 text-[15px] text-slate-100 hover:text-white">
                  {label}
                  <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function UmrahBand() {
  const { fmtGbp } = useCurrency();
  const items = useMemo(() => {
    const packages = getUmrahPackages().filter((p) => p.departures.length);
    return ["essential-umrah-7-nights", "family-umrah-10-nights", "premium-haram-view-10-nights"]
      .map((slug) => packages.find((p) => p.slug === slug))
      .filter((p) => !!p)
      .map((p) => ({ p, price: umrahAdultPackagePrice(resolveUmrahPricingInput(p, defaultUmrahConfig(p, { adults: 1 })), "GBP") }));
  }, []);
  return (
    <section aria-labelledby="umrah-h" className="mt-24 bg-umrah-900 py-20 text-white">
      <div className="container-page">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow mb-2 text-gold-400">Umrah with Cheaperfly</p>
            <h2 id="umrah-h" className="!text-white text-[34px] font-extrabold leading-[1.1]">
              Umrah, arranged from door to Haram
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-umrah-100/90">
              Flights, visa processing, hotels close to the Haramain, transfers and on-the-ground support — all in one package you can tailor to your family.
            </p>
          </div>
          <ButtonLink href="/umrah" variant="gold" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Explore Umrah packages
          </ButtonLink>
        </div>
        <ul className="grid gap-5 md:grid-cols-3">
          {items.map(({ p, price }) => (
            <li key={p.slug}>
              <Link
                href={`/umrah/packages/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-umrah-800/60 transition-colors hover:bg-umrah-800"
              >
                <Photo src={p.images[0]} alt={p.name} ratio="16/10" imgClassName="transition-transform duration-500 group-hover:scale-105" sizes="(min-width:768px) 380px, 100vw" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gold-400">
                    <span>{p.nights} nights</span>
                    <span aria-hidden>·</span>
                    <span>
                      {p.makkahNights} Makkah + {p.madinahNights} Madinah
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-lg font-bold !text-white">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-umrah-100/80">{p.tagline}</p>
                  <div className="mt-auto flex items-end justify-between pt-5">
                    <p className="text-xs text-umrah-100/70">
                      {p.mealLabel}
                      <br />
                      Visa &amp; transfers included
                    </p>
                    <p className="text-right leading-tight">
                      <span className="block text-[11px] text-umrah-100/70">from, per person</span>
                      <span className="text-xl font-extrabold text-white tnum">{fmtGbp(price)}</span>
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const WHY = [
  { icon: Tag, title: "Prices you can trust", body: "Taxes, fees and extras are shown before you pay. What you see is what you're charged." },
  { icon: ShieldCheck, title: "Flexible when plans change", body: "Fare rules explained in plain English, with self-service changes and refund tracking." },
  { icon: Layers, title: "One place for the whole trip", body: "Flights, hotels and Umrah in a single account, with every ticket and voucher in one place." },
  { icon: Headset, title: "Real people, any hour", body: "24/7 support in English, Arabic and Urdu by chat, WhatsApp and phone." },
];

export function WhyCheaperfly() {
  return (
    <section aria-labelledby="why-h" className="container-page pt-24">
      <SectionHeading eyebrow="Why Cheaperfly" title={<span id="why-h">Travel that feels straightforward</span>} />
      <ul className="grid gap-y-8 border-t border-slate-200 pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {WHY.map((item, i) => (
          <li key={item.title} className={cn("lg:px-7", i > 0 && "lg:border-l lg:border-slate-200", i === 0 && "lg:pl-0")}>
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-white">
              <item.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="text-[17px] font-bold">{item.title}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

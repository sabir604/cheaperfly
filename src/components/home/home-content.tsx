"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, Headset, Info, Megaphone, ShieldCheck, Tag, TriangleAlert } from "lucide-react";
import { FlightDeals, PopularDestinations, RecentSearches } from "@/components/flights/deals";
import { Photo } from "@/components/photo";
import { BookingEngine } from "@/components/search/booking-engine";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { IMG } from "@/data/hotels";
import { useFeatures, useSiteConfig, type Features } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { ExploreDubai, Inspiration, Newsletter, RecommendedHotels, SupportBand, UmrahBand, WhyCheaperfly } from "./sections";

/** Admin-managed homepage banners and offer cards (empty by default). */
interface Banner {
  id: string;
  enabled: boolean;
  tone: "info" | "promo" | "umrah";
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
}
interface OfferCard {
  id: string;
  enabled: boolean;
  title: string;
  description?: string;
  image: string;
  href?: string;
  badge?: string;
}

const BANNER_TONES = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  promo: "border-gold-300 bg-gold-50 text-navy-900",
  umrah: "border-umrah-200 bg-umrah-50 text-umrah-900",
};

function Banners() {
  const banners = (useSiteConfig().homepage.banners as unknown as Banner[]).filter((b) => b.enabled);
  if (banners.length === 0) return null;
  return (
    <section aria-label="Promotions" className="container-page pt-10">
      <ul className="grid gap-3 md:grid-cols-2">
        {banners.map((b) => {
          const Icon = b.tone === "promo" ? Megaphone : b.tone === "umrah" ? TriangleAlert : Info;
          return (
            <li key={b.id} className={cn("flex items-start gap-3 rounded-xl border p-4", BANNER_TONES[b.tone])}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{b.title}</p>
                {b.body && <p className="mt-0.5 text-sm opacity-90">{b.body}</p>}
                {b.ctaLabel && b.ctaHref && (
                  <Link href={b.ctaHref} className="mt-2 inline-block text-sm font-bold underline underline-offset-2">
                    {b.ctaLabel}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Offers() {
  const offers = (useSiteConfig().homepage.offers as unknown as OfferCard[]).filter((o) => o.enabled);
  if (offers.length === 0) return null;
  return (
    <section aria-labelledby="offers-h" className="container-page pt-16">
      <SectionHeading eyebrow="Offers" title={<span id="offers-h">Current offers</span>} subtitle="Limited-time offers from Cheaperfly." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o) => (
          <li key={o.id}>
            <Link href={o.href || "/flights"} className="group relative flex h-56 overflow-hidden rounded-xl">
              <Photo
                src={IMG[o.image] ?? IMG.dubaiSkyline}
                alt=""
                scrim
                className="absolute inset-0"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
                sizes="(min-width:1024px) 400px, 100vw"
              />
              <div className="relative z-10 mt-auto p-5">
                {o.badge && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded bg-gold-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    <Tag className="h-3 w-3" aria-hidden /> {o.badge}
                  </span>
                )}
                <h3 className="text-lg font-extrabold text-white">{o.title}</h3>
                {o.description && <p className="mt-1 text-sm text-white/85">{o.description}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SECTIONS: Record<string, { node: ReactNode; needs?: (f: Features) => boolean }> = {
  banners: { node: <Banners /> },
  recent: { node: <RecentSearches /> },
  destinations: { node: <PopularDestinations />, needs: (f) => f.flights },
  offers: { node: <Offers /> },
  deals: { node: <FlightDeals />, needs: (f) => f.flights },
  hotels: { node: <RecommendedHotels />, needs: (f) => f.hotels },
  dubai: { node: <ExploreDubai />, needs: (f) => f.hotels },
  umrah: { node: <UmrahBand />, needs: (f) => f.umrah },
  why: { node: <WhyCheaperfly /> },
  inspiration: { node: <Inspiration /> },
  support: { node: <SupportBand /> },
  newsletter: { node: <Newsletter /> },
};

/** Home page: hero + booking engine, then the sections in the order (and visibility) set by the admin. */
export function HomeContent() {
  const { homepage } = useSiteConfig();
  const features = useFeatures();
  const hero = homepage.hero;
  const heroImage = IMG[hero.image] ?? IMG.dubaiSkyline;
  return (
    <>
      <section className="relative isolate bg-navy-950">
        <Photo src={heroImage} alt="" priority sizes="100vw" className="absolute inset-0 -z-10" position="60% 40%" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/15" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy-950/50 to-transparent" />
        <div className="container-page pb-32 pt-14 sm:pb-36 sm:pt-20 lg:pb-40 lg:pt-24">
          {hero.eyebrow && <p className="eyebrow mb-4 text-brand-200">{hero.eyebrow}</p>}
          <h1 className="max-w-2xl text-[40px] font-extrabold leading-[1.04] !text-white sm:text-5xl lg:text-[60px]" style={{ letterSpacing: "-0.03em" }}>
            {hero.titleLine1}
            {hero.titleLine2 && (
              <>
                <br />
                {hero.titleLine2}
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-200">{hero.subtitle}</p>
          {hero.ctaLabel && hero.ctaHref && (
            <div className="mt-6">
              <ButtonLink href={hero.ctaHref} variant="primary" size="lg">
                {hero.ctaLabel}
              </ButtonLink>
            </div>
          )}
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium text-slate-100">
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-[18px] w-[18px] text-brand-300" aria-hidden /> All taxes shown upfront
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-[18px] w-[18px] text-brand-300" aria-hidden /> Secure, protected payments
            </li>
            <li className="flex items-center gap-2">
              <Headset className="h-[18px] w-[18px] text-brand-300" aria-hidden /> {features.telephony || features.whatsappSupport ? "24/7 human support" : "Human support"}
            </li>
          </ul>
        </div>
      </section>
      <div className="container-page relative z-10 -mt-24 sm:-mt-28">
        <BookingEngine />
      </div>
      {homepage.sections
        .filter((s) => s.visible && SECTIONS[s.id] && (!SECTIONS[s.id].needs || SECTIONS[s.id].needs!(features)))
        .map((s) => (
          <Fragment key={s.id}>{SECTIONS[s.id].node}</Fragment>
        ))}
    </>
  );
}

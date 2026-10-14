"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { Badge } from "@/components/ui/primitives";
import { CATEGORY_LABEL, UMRAH_HOTELS } from "@/data/umrah";
import { getUmrahPackages, packageFromPrice } from "@/lib/engine/umrah";

/** The first six packages with departures, as cards. */
export function FeaturedPackages() {
  const { fmt, currency } = useCurrency();
  const packages = useMemo(() => getUmrahPackages().filter((p) => p.departures.length).slice(0, 6), []);
  return (
    <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {packages.map((p, i) => (
        <li key={p.slug} className={i === 0 ? "md:col-span-2 lg:col-span-1 lg:row-span-1" : ""}>
          <Link href={`/umrah/packages/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
            <Photo
              src={p.images[i % p.images.length]}
              alt={p.name}
              ratio="16/10"
              scrim
              imgClassName="transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width:1024px) 400px, 100vw"
            >
              <Badge tone="gold" className="absolute left-3 top-3 z-10 !bg-gold-500 !px-2 !py-1 !text-white">
                {CATEGORY_LABEL[p.category]}
              </Badge>
              <span className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-sm font-bold text-white">
                <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" aria-hidden /> {p.rating.toFixed(1)} <span className="font-normal text-white/80">({p.reviewCount})</span>
              </span>
            </Photo>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-umrah-700">
                {p.nights} nights · {p.makkahNights} Makkah + {p.madinahNights} Madinah
              </p>
              <h3 className="mt-1 text-[18px] font-bold leading-snug text-navy-900">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-[13px] text-slate-600">{p.tagline}</p>
              <div className="mt-auto flex items-end justify-between pt-4">
                <span className="text-xs text-slate-500">
                  {p.mealLabel}
                  <br />
                  Visa included
                </span>
                <span className="text-right leading-tight">
                  <span className="block text-[11px] text-slate-500">from, per person</span>
                  <span className="text-[22px] font-extrabold text-navy-900 tnum">{fmt(packageFromPrice(p, currency))}</span>
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The three closest hotels to the Haram (Makkah) or the Prophet's Mosque (Madinah). */
export function HolyHotels({ city }: { city: "makkah" | "madinah" }) {
  const { fmtGbp } = useCurrency();
  const hotels = UMRAH_HOTELS.filter((h) => h.city === city)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 3);
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {hotels.map((h) => (
        <li key={h.id}>
          <Link href={`/hotels/${h.id}`} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
            <Photo src={h.image} alt={h.name} ratio="4/3" imgClassName="transition-transform duration-500 group-hover:scale-105" sizes="400px" />
            <div className="p-4">
              <Stars count={h.stars} size={12} />
              <h3 className="mt-1 text-[16px] font-bold text-navy-900">{h.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-umrah-700" aria-hidden /> {h.distanceM} m to {city === "makkah" ? "the Haram" : "the Masjid"}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Room from</span>
                <span className="flex items-center gap-1 text-[15px] font-extrabold text-navy-900 tnum">
                  {fmtGbp(4 * h.perNightPerPerson)}
                  <span className="text-xs font-normal text-slate-500">/ night</span>
                  <ArrowRight className="ml-1 h-4 w-4 text-slate-300 group-hover:text-umrah-700" aria-hidden />
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

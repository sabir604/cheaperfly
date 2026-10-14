"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bath, BedDouble, CheckCircle2, ChevronLeft, ChevronRight, Clock, Grid2x2, Heart, MapPin, Maximize2, Share2, Users, Utensils } from "lucide-react";
import { ScoreBadge, Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { DualDateField } from "@/components/search/date-field";
import { OccupancyPicker } from "@/components/search/pickers";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/disclosure";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import type { Hotel, HotelRoom } from "@/data/hotels";
import { hotelDetailHref } from "@/lib/engine/criteria";
import { formatDateMed, formatDayShort, nightsBetween } from "@/lib/engine/dates";
import { MEAL_LABEL, quoteRoom, roomFits, type HotelCriteria, type RoomQuote } from "@/lib/engine/hotels";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useSessionStore } from "@/lib/stores/session";
import { cn, plural } from "@/lib/utils";
import { AmenityIcon, amenityLabel } from "./amenities";
import { HotelMap } from "./hotel-map";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Rooms" },
  { id: "facilities", label: "Facilities" },
  { id: "location", label: "Location" },
  { id: "policies", label: "Policies" },
  { id: "reviews", label: "Reviews" },
];

function Gallery({ hotel }: { hotel: Hotel }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const images = hotel.images;
  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-2xl md:h-[420px] md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
        <button type="button" onClick={() => openAt(0)} className="relative h-64 md:row-span-2 md:h-auto" aria-label={`Open photo gallery, ${images.length} photos`}>
          <Photo src={images[0]} alt={hotel.name} priority className="h-full" imgClassName="transition-transform duration-500 hover:scale-[1.02]" sizes="(min-width:768px) 50vw, 100vw" />
        </button>
        {images.slice(1, 5).map((src, i) => (
          <button key={src + i} type="button" onClick={() => openAt(i + 1)} className="relative hidden md:block" aria-label={`View photo ${i + 2}`}>
            <Photo src={src} alt="" className="h-full" imgClassName="transition-transform duration-500 hover:scale-[1.04]" sizes="25vw">
              {i === 3 && images.length > 5 && <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-lg font-bold text-white">+{images.length - 5}</span>}
            </Photo>
          </button>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-3" leftIcon={<Grid2x2 className="h-4 w-4" />} onClick={() => openAt(0)}>
        Show all {images.length} photos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`${hotel.name} — photos`} size="xl">
          <div className="relative">
            <Photo src={images[index]} alt={`${hotel.name} photo ${index + 1}`} ratio="16/10" className="rounded-lg" sizes="900px" />
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 z-10 rounded bg-black/60 px-2 py-1 text-xs font-semibold text-white">
              {index + 1} / {images.length}
            </span>
          </div>
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <li key={src + i} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === index}
                  className={cn("relative block h-16 w-24 overflow-hidden rounded-md border-2", i === index ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100")}
                >
                  <Photo src={src} alt="" className="h-full" sizes="96px" />
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoomCard({ room, hotel, criteria, onReserve }: { room: HotelRoom; hotel: Hotel; criteria: HotelCriteria; onReserve: (q: RoomQuote) => void }) {
  const { fmtGbp } = useCurrency();
  const [photo, setPhoto] = useState(0);
  const fits = roomFits(room, criteria.occupancy);
  const quotes = hotel.ratePlans.map((p) => quoteRoom(hotel, room, p.id, criteria)).filter((q): q is RoomQuote => !!q);
  const from = quotes.length ? Math.min(...quotes.map((q) => q.perNight)) : 0;
  return (
    <article className={cn("overflow-hidden rounded-xl border bg-white", fits ? "border-slate-200" : "border-slate-200 opacity-80")} aria-labelledby={`room-${room.id}`}>
      <div className="grid lg:grid-cols-[300px_1fr]">
        <div className="relative">
          <Photo src={room.images[photo]} alt={room.name} className="h-56 lg:h-full" sizes="300px" />
          {room.images.length > 1 && (
            <div className="absolute bottom-2 left-2 z-10 flex gap-1">
              {room.images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhoto(i)}
                  aria-label={`Room photo ${i + 1}`}
                  aria-current={photo === i}
                  className={cn("h-1.5 w-6 rounded-full", photo === i ? "bg-white" : "bg-white/50")}
                />
              ))}
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 id={`room-${room.id}`} className="text-[18px] font-bold text-navy-900">
              {room.name}
            </h3>
            {room.roomsLeft <= 3 && fits && <Badge tone="danger">Only {room.roomsLeft} left</Badge>}
            {!fits && <Badge tone="warning">Doesn’t fit your group</Badge>}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-slate-600">
            <li className="flex items-center gap-1.5">
              <Maximize2 className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {room.sizeSqm} m²
            </li>
            <li className="flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {room.bed}
            </li>
            <li className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Sleeps {room.sleeps.adults + room.sleeps.children}
            </li>
            <li className="flex items-center gap-1.5">
              <Bath className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {room.view}
            </li>
          </ul>
          <p className="mt-3 text-sm text-slate-600">{room.description}</p>
          <p className="mt-3 text-xs text-slate-500">{room.amenities.slice(0, 6).join(" · ")}</p>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <p className="bg-slate-50 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Choose your rate · from {fmtGbp(from)} per night</p>
        <ul className="divide-y divide-slate-100">
          {quotes.map((q) => {
            const plan = hotel.ratePlans.find((p) => p.id === q.ratePlanId)!;
            return (
              <li key={q.ratePlanId} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-navy-900">
                    {q.ratePlanName}
                    {plan.priceFactor < 1 && <Badge tone="success">Best price</Badge>}
                    {plan.id === "flexible" && <Badge tone="brand">Most flexible</Badge>}
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[13px]">
                    <li className="flex items-center gap-1.5 text-slate-700">
                      <Utensils className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {MEAL_LABEL[q.meal]}
                    </li>
                    <li className={cn("flex items-center gap-1.5 font-semibold", q.refundable ? "text-emerald-700" : "text-slate-500")}>
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {q.refundable ? `Free cancellation until ${formatDateMed(q.freeCancelUntil!)}` : "Non-refundable — no changes or cancellation"}
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {q.payLater ? "Pay at the hotel" : "Pay now"}
                    </li>
                  </ul>
                </div>
                <div className="flex items-center justify-between gap-5 md:justify-end">
                  <div className="text-right">
                    <p className="text-[22px] font-extrabold leading-none text-navy-900 tnum">{fmtGbp(q.perNight)}</p>
                    <p className="text-xs text-slate-500">per night</p>
                    <p className="text-xs font-semibold text-slate-700 tnum">
                      {fmtGbp(q.roomTotal)} for {plural(q.nights, "night")}
                    </p>
                  </div>
                  <Button disabled={!fits} onClick={() => onReserve(q)} aria-label={`Reserve ${room.name}, ${q.ratePlanName}`}>
                    Reserve
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-bold text-navy-900">{children}</dd>
    </div>
  );
}

/** `/hotels/[slug]`: gallery, sticky section nav, rooms with rate plans, facilities, map, policies and reviews. */
export function HotelDetail({ hotel, criteria: initial }: { hotel: Hotel; criteria: HotelCriteria }) {
  const router = useRouter();
  const { fmtGbp } = useCurrency();
  const startHotel = useDraftsStore((s) => s.startHotel);
  const profile = useSessionStore((s) => s.profile);
  const [criteria, setCriteria] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState("overview");
  const [changing, setChanging] = useState(false);
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const guests = criteria.occupancy.adults + criteria.occupancy.children;

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`sec-${s.id}`)).filter((e): e is HTMLElement => !!e);
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setSection(top.target.id.replace("sec-", ""));
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fittingQuotes = hotel.rooms
    .filter((r) => roomFits(r, criteria.occupancy))
    .flatMap((r) => hotel.ratePlans.map((p) => quoteRoom(hotel, r, p.id, criteria)))
    .filter((q): q is RoomQuote => !!q);
  const fromPrice = fittingQuotes.length ? Math.min(...fittingQuotes.map((q) => q.perNight)) : null;

  const update = (next: HotelCriteria) => {
    setCriteria(next);
    router.replace(hotelDetailHref(hotel.id, next), { scroll: false });
  };
  const reserve = (quote: RoomQuote) => {
    startHotel(criteria, hotel.id, quote, profile ? { email: profile.email, countryCode: profile.countryCode, mobile: profile.mobile } : undefined);
    router.push("/hotels/book/guest");
  };
  const scrollTo = (id: string) => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const topReview = [...hotel.reviews].sort((a, b) => b.score - a.score)[0];
  const o = criteria.occupancy;

  return (
    <div>
      <div className="container-page pb-2 pt-5">
        <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-slate-500">
          <Link href="/hotels" className="hover:text-brand-600">
            Hotels
          </Link>
          {" / "}
          <Link
            href={`/hotels/search?dest=${hotel.city.toLowerCase()}&in=${criteria.checkIn}&out=${criteria.checkOut}&rooms=${o.rooms}&adt=${o.adults}&chd=${o.children}`}
            className="hover:text-brand-600"
          >
            {hotel.city}
          </Link>
          {" / "}
          <span className="text-slate-700">{hotel.name}</span>
        </nav>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Stars count={hotel.stars} />
              {hotel.badge && <Badge tone="navy">{hotel.badge}</Badge>}
              <Badge tone="outline" className="capitalize">
                {hotel.propertyType}
              </Badge>
            </div>
            <h1 className="mt-1.5 text-[28px] font-extrabold leading-tight sm:text-[34px]">{hotel.name}</h1>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {hotel.address} · <span className="font-semibold text-brand-700">{hotel.distanceLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={hotel.rating} label={hotel.ratingLabel} reviews={hotel.reviewCount} />
            <Button
              variant="outline"
              size="icon"
              aria-label={saved ? "Remove from saved" : "Save hotel"}
              aria-pressed={saved}
              onClick={() => {
                setSaved((v) => !v);
                toast.success(saved ? "Removed from saved" : "Saved to your shortlist");
              }}
            >
              <Heart className={cn("h-5 w-5", saved && "fill-red-500 text-red-500")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Share"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Link copied");
              }}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <Gallery hotel={hotel} />
      </div>
      <div className="sticky top-16 z-30 mt-6 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav aria-label="Hotel sections" className="container-page scrollbar-none flex gap-6 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              aria-current={section === s.id}
              className={cn(
                "-mb-px shrink-0 border-b-2 py-3.5 text-sm font-semibold transition-colors",
                section === s.id ? "border-brand-500 text-brand-600" : "border-transparent text-slate-600 hover:text-navy-900",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-14">
          <section id="sec-overview" className="scroll-mt-36" aria-labelledby="ov-h">
            <h2 id="ov-h" className="mb-3 text-xl font-bold">
              About this property
            </h2>
            <p className="text-[15px] leading-relaxed text-slate-700">{hotel.description}</p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {hotel.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {h}
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-4">
              <Fact label="Check-in">from {hotel.checkIn}</Fact>
              <Fact label="Check-out">until {hotel.checkOut}</Fact>
              <Fact label="Rooms">{hotel.rooms.length} room types</Fact>
              <Fact label="Guest score">
                {hotel.rating.toFixed(1)} · {hotel.ratingLabel}
              </Fact>
            </dl>
            {topReview && (
              <figure className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <blockquote className="text-[15px] italic text-slate-700">“{topReview.text}”</blockquote>
                <figcaption className="mt-2 text-xs text-slate-500">
                  {topReview.author} · {topReview.country} · {topReview.stayType}
                </figcaption>
              </figure>
            )}
          </section>
          <section id="sec-rooms" className="scroll-mt-36" aria-labelledby="rm-h">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="rm-h" className="text-xl font-bold">
                  Choose your room
                </h2>
                <p className="text-sm text-slate-600">
                  {formatDayShort(criteria.checkIn)} – {formatDayShort(criteria.checkOut)} · {plural(nights, "night")} · {plural(guests, "guest")}, {plural(o.rooms, "room")}
                </p>
              </div>
              <Button variant={changing ? "subtle" : "outline"} size="sm" onClick={() => setChanging((v) => !v)} aria-expanded={changing}>
                Change dates or guests
              </Button>
            </div>
            {changing && (
              <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1.4fr_1fr]">
                <DualDateField
                  labelFrom="Check-in"
                  labelTo="Check-out"
                  from={criteria.checkIn}
                  to={criteria.checkOut}
                  minNights={1}
                  onChange={(v) => {
                    if (v.from && v.to) update({ ...criteria, checkIn: v.from, checkOut: v.to });
                    else if (v.from) setCriteria({ ...criteria, checkIn: v.from });
                  }}
                />
                <OccupancyPicker value={o} onChange={(occupancy) => update({ ...criteria, occupancy })} />
              </div>
            )}
            <div className="space-y-5">
              {hotel.rooms.map((room) => (
                <RoomCard key={room.id} room={room} hotel={hotel} criteria={criteria} onReserve={reserve} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">{hotel.taxNote}</p>
          </section>
          <section id="sec-facilities" className="scroll-mt-36" aria-labelledby="fc-h">
            <h2 id="fc-h" className="mb-4 text-xl font-bold">
              Facilities &amp; services
            </h2>
            <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {hotel.amenities.map((a) => (
                <li key={a} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <AmenityIcon id={a} className="h-[18px] w-[18px] text-brand-600" /> {amenityLabel(a)}
                </li>
              ))}
            </ul>
          </section>
          <section id="sec-location" className="scroll-mt-36" aria-labelledby="lc-h">
            <h2 id="lc-h" className="mb-4 text-xl font-bold">
              Location
            </h2>
            <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
              <HotelMap
                destinationId={hotel.city.toLowerCase()}
                className="h-72"
                activeId={hotel.id}
                pins={[{ id: hotel.id, x: hotel.map.x, y: hotel.map.y, label: hotel.name }]}
                ariaLabel={`Map showing ${hotel.name}`}
              />
              <div>
                <p className="text-sm font-semibold text-navy-900">{hotel.address}</p>
                <p className="mb-4 mt-1 text-sm text-slate-600">{hotel.distanceLabel}</p>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">What’s nearby</h3>
                <ul className="divide-y divide-slate-100 text-sm">
                  {hotel.nearby.map((n) => (
                    <li key={n.name} className="flex justify-between py-2">
                      <span className="text-slate-700">{n.name}</span>
                      <span className="font-semibold text-navy-900">{n.distance}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
          <section id="sec-policies" className="scroll-mt-36" aria-labelledby="pl-h">
            <h2 id="pl-h" className="mb-2 text-xl font-bold">
              Policies &amp; property rules
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white px-6">
              {hotel.policies.map((p, i) => (
                <Accordion key={p.title} title={p.title} defaultOpen={i === 0}>
                  {p.body}
                </Accordion>
              ))}
            </div>
          </section>
          <section id="sec-reviews" className="scroll-mt-36" aria-labelledby="rv-h">
            <h2 id="rv-h" className="mb-4 text-xl font-bold">
              Guest reviews
            </h2>
            <div className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[220px_1fr]">
              <div className="text-center md:border-r md:border-slate-100 md:pr-6">
                <p className="text-5xl font-extrabold text-navy-900 tnum">{hotel.rating.toFixed(1)}</p>
                <p className="mt-1 font-bold text-navy-900">{hotel.ratingLabel}</p>
                <p className="text-xs text-slate-500">{hotel.reviewCount.toLocaleString("en-GB")} verified reviews</p>
              </div>
              <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {hotel.reviewBreakdown.map((r) => (
                  <li key={r.label}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="text-slate-700">{r.label}</span>
                      <span className="font-bold text-navy-900 tnum">{r.score.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${10 * r.score}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-4 space-y-4">
              {hotel.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-navy-900">{r.title}</p>
                      <p className="text-xs text-slate-500">
                        {r.author} · {r.country} · {r.stayType} · {formatDateMed(r.date)}
                      </p>
                    </div>
                    <span className="flex h-8 min-w-9 items-center justify-center rounded-md rounded-bl-none bg-navy-900 px-1.5 text-sm font-bold text-white tnum">{r.score.toFixed(1)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{r.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="hidden lg:block" aria-label="Your stay">
          <div className="sticky top-32 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            {fromPrice !== null ? (
              <>
                <p className="text-xs font-semibold text-slate-500">From</p>
                <p className="text-[32px] font-extrabold leading-none text-navy-900 tnum">{fmtGbp(fromPrice)}</p>
                <p className="text-xs text-slate-500">per night · taxes &amp; fees at checkout</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-amber-700">No rooms fit your group. Try adding a room.</p>
            )}
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-slate-500">Check-in</dt>
                <dd className="font-semibold text-navy-900">{formatDayShort(criteria.checkIn)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Check-out</dt>
                <dd className="font-semibold text-navy-900">{formatDayShort(criteria.checkOut)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Guests</dt>
                <dd className="font-semibold text-navy-900">
                  {plural(guests, "guest")}, {plural(o.rooms, "room")}
                </dd>
              </div>
            </dl>
            <Button block size="lg" className="mt-4" onClick={() => scrollTo("rooms")}>
              Choose a room
            </Button>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
              {["Free cancellation on flexible rates", "No booking fee on room price", "24/7 support"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

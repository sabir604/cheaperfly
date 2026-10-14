"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BedDouble, CalendarRange, ChevronRight, Moon, Plane, Search, Users } from "lucide-react";
import { StatusBadge } from "@/components/bookings/panels";
import { Photo } from "@/components/photo";
import { ButtonLink } from "@/components/ui/button";
import { TabList } from "@/components/ui/disclosure";
import { StateView } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { bookingBucket, bookingImage, PRODUCT_LABEL, userOwnsBooking, type BookingBucket } from "@/lib/engine/bookings/status";
import { formatCurrency } from "@/lib/engine/currency";
import { dayDiff, formatDateMed, todayISO } from "@/lib/engine/dates";
import { useBookingsStore } from "@/lib/stores/bookings";
import { useSessionStore } from "@/lib/stores/session";
import type { Booking } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { PageTitle } from "./account-shell";

/** The signed-in user's bookings, split into upcoming (soonest first), past and cancelled (latest first). */
export function useMyBookings() {
  const user = useSessionStore((s) => s.user);
  const bookings = useBookingsStore((s) => s.bookings);
  return useMemo(() => {
    const all = bookings.filter((b) => userOwnsBooking(b, user));
    const of = (bucket: BookingBucket) => all.filter((b) => bookingBucket(b) === bucket);
    const upcoming = of("upcoming").sort((a, b) => a.startDate.localeCompare(b.startDate));
    const past = of("past").sort((a, b) => b.startDate.localeCompare(a.startDate));
    const cancelled = of("cancelled").sort((a, b) => b.startDate.localeCompare(a.startDate));
    return { all, upcoming, past, cancelled, byBucket: { upcoming, past, cancelled } };
  }, [bookings, user]);
}

const PRODUCT_ICON = { flight: Plane, hotel: BedDouble, umrah: Moon };

export function BookingRow({ booking, className }: { booking: Booking; className?: string }) {
  const Icon = PRODUCT_ICON[booking.product];
  return (
    <Link
      href={`/account/bookings/${booking.id}`}
      className={cn(
        "group grid gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-card sm:grid-cols-[132px_1fr_auto] sm:items-center",
        className,
      )}
    >
      <Photo src={bookingImage(booking)} alt="" ratio="4/3" className="hidden rounded-lg sm:block" sizes="132px" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold",
              booking.product === "umrah" ? "bg-umrah-50 text-umrah-800" : "bg-brand-50 text-brand-700",
            )}
          >
            <Icon className="h-3 w-3" aria-hidden /> {PRODUCT_LABEL[booking.product]}
          </span>
          <StatusBadge status={booking.status} />
          <span className="font-mono text-xs font-bold text-slate-500">{booking.id}</span>
        </div>
        <h3 className="mt-1.5 truncate text-[17px] font-bold text-navy-900">{booking.title}</h3>
        <p className="mt-0.5 truncate text-[13px] text-slate-600">{booking.subtitle}</p>
        <p className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
          <span>
            {formatDateMed(booking.startDate)} – {formatDateMed(booking.endDate)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden /> {booking.travellerCount}
          </span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
        <p className="text-lg font-extrabold text-navy-900 tnum">{formatCurrency(booking.pricing.total, booking.currency, { decimals: 2 })}</p>
        <span className="flex items-center gap-1 text-[13px] font-bold text-brand-600 group-hover:underline">
          View booking <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** Everything a customer might type to find a booking: references, places and traveller names. */
function searchText(b: Booking) {
  const parts = [b.id, b.title, b.subtitle, b.customerEmail, b.leadLastName];
  if (b.product === "flight") parts.push(b.pnr, ...b.passengers.map((p) => `${p.firstName} ${p.lastName}`));
  if (b.product === "hotel") parts.push(b.confirmationNumber, b.hotel.city, ...b.guests.map((g) => `${g.firstName} ${g.lastName}`));
  if (b.product === "umrah") parts.push(b.confirmationNumber, ...b.travellers.map((t) => `${t.firstName} ${t.lastName}`));
  return parts.join(" ").toLowerCase();
}

const EMPTY = {
  upcoming: { title: "No upcoming bookings", body: "When you book a flight, hotel or Umrah package it will appear here." },
  past: { title: "No past bookings", body: "Completed trips will be listed here so you can download invoices any time." },
  cancelled: { title: "No cancelled bookings", body: "Cancelled and refunded bookings appear here." },
};

export function BookingsList() {
  const mine = useMyBookings();
  const [tab, setTab] = useState<BookingBucket>("upcoming");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = mine.byBucket[tab].filter((b) => !q || searchText(b).includes(q));
  return (
    <div>
      <PageTitle title="My Bookings" subtitle="Every flight, hotel and Umrah booking in one place." />
      <TabList
        label="Booking status"
        value={tab}
        onChange={(id) => setTab(id as BookingBucket)}
        className="mb-5"
        tabs={[
          { id: "upcoming", label: "Upcoming", count: mine.upcoming.length },
          { id: "past", label: "Past", count: mine.past.length },
          { id: "cancelled", label: "Cancelled", count: mine.cancelled.length },
        ]}
      />
      <div className="relative mb-5 max-w-md">
        <label htmlFor="bk-search" className="sr-only">
          Search bookings
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          id="bk-search"
          type="search"
          placeholder="Search by reference, destination or traveller"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {shown.length === 0 ? (
          <StateView
            compact
            title={query ? "No bookings match your search" : EMPTY[tab].title}
            description={query ? "Try a different reference, destination or name." : EMPTY[tab].body}
            actions={
              query ? undefined : (
                <>
                  <ButtonLink href="/flights">Search flights</ButtonLink>
                  <ButtonLink href="/hotels" variant="outline">
                    Find hotels
                  </ButtonLink>
                </>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {shown.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

function TripCard({ booking }: { booking: Booking }) {
  const days = dayDiff(todayISO(), booking.startDate);
  return (
    <Link
      href={`/account/bookings/${booking.id}`}
      className="group grid gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-card sm:grid-cols-[180px_1fr]"
    >
      <Photo src={bookingImage(booking)} alt="" className="h-36 sm:h-full" sizes="180px" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={booking.product === "umrah" ? "umrah" : "brand"}>{PRODUCT_LABEL[booking.product]}</Badge>
          <StatusBadge status={booking.status} />
          {days >= 0 && <span className="text-xs font-bold text-brand-600">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}</span>}
        </div>
        <h3 className="mt-2 text-lg font-bold text-navy-900">{booking.title}</h3>
        <p className="text-sm text-slate-600">{booking.subtitle}</p>
        <p className="mt-2 text-xs text-slate-500">
          {formatDateMed(booking.startDate)} → {formatDateMed(booking.endDate)} · {booking.travellerCount} traveller{booking.travellerCount > 1 ? "s" : ""} ·{" "}
          <span className="font-mono">{booking.id}</span>
        </p>
      </div>
    </Link>
  );
}

export function TripsTimeline() {
  const mine = useMyBookings();
  const [showPast, setShowPast] = useState(false);
  const months = useMemo(() => {
    const byMonth = new Map<string, Booking[]>();
    for (const b of mine.upcoming) {
      const ym = b.startDate.slice(0, 7);
      byMonth.set(ym, [...(byMonth.get(ym) ?? []), b]);
    }
    return [...byMonth.entries()];
  }, [mine.upcoming]);

  return (
    <div>
      <PageTitle title="My Trips" subtitle="Your journeys in date order." />
      {months.length === 0 ? (
        <StateView
          icon={<CalendarRange className="h-7 w-7" />}
          title="No upcoming trips"
          description="Book a flight, hotel or Umrah package and it will be planned here."
          actions={<ButtonLink href="/flights">Plan a trip</ButtonLink>}
        />
      ) : (
        <div className="space-y-10">
          {months.map(([ym, trips]) => (
            <section key={ym} aria-label={monthLabel(ym)}>
              <h2 className="mb-4 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                <span className="h-px w-8 bg-slate-300" aria-hidden /> {monthLabel(ym)}
              </h2>
              <div className="space-y-4 border-l-2 border-slate-200 pl-5 sm:pl-8">
                {trips.map((b) => (
                  <TripCard key={b.id} booking={b} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {mine.past.length > 0 && (
        <div className="mt-12">
          <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} className="text-sm font-bold text-brand-600 hover:underline">
            {showPast ? "Hide" : "Show"} past trips ({mine.past.length})
          </button>
          {showPast && (
            <div className="mt-4 space-y-4">
              {mine.past.map((b) => (
                <TripCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

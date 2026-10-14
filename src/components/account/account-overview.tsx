"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BedDouble, Bell, CalendarClock, FileText, Moon, Plane, Search, Users, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/bookings/panels";
import { Photo } from "@/components/photo";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { bookingImage } from "@/lib/engine/bookings/status";
import { dayDiff, formatDateMed, formatDateTimeMed, todayISO } from "@/lib/engine/dates";
import { useAccountStore } from "@/lib/stores/bookings";
import { useSessionStore } from "@/lib/stores/session";
import type { Booking } from "@/lib/types/booking";
import { cn, initials, plural } from "@/lib/utils";
import { PageTitle } from "./account-shell";
import { BookingRow, useMyBookings } from "./my-bookings";

const PRODUCT_ICON = { flight: Plane, hotel: BedDouble, umrah: Moon };

const QUICK_LINKS = [
  { href: "/flights", label: "Search flights", icon: Plane, tone: "bg-brand-50 text-brand-600" },
  { href: "/hotels", label: "Find a hotel", icon: BedDouble, tone: "bg-amber-50 text-amber-700" },
  { href: "/umrah", label: "Umrah packages", icon: Moon, tone: "bg-umrah-50 text-umrah-800" },
  { href: "/manage-booking", label: "Find a booking", icon: Search, tone: "bg-slate-100 text-slate-700" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function countdown(b: Booking) {
  const d = dayDiff(todayISO(), b.startDate);
  return d < 0 ? "In progress" : d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`;
}

function Fact({ term, children, className }: { term: string; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{term}</dt>
      <dd className={cn("mt-0.5 text-sm font-bold text-navy-900", className)}>{children}</dd>
    </div>
  );
}

function NextJourney({ booking }: { booking: Booking }) {
  const isFlight = booking.product === "flight";
  return (
    <section aria-labelledby="next-h" className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid md:grid-cols-[minmax(0,320px)_1fr]">
        <Photo src={bookingImage(booking)} alt="" className="min-h-[200px]" sizes="320px" scrim>
          <Badge tone="navy" className="absolute left-4 top-4 z-10 !px-2.5 !py-1 !text-xs">
            {countdown(booking)}
          </Badge>
        </Photo>
        <div className="flex flex-col p-6 sm:p-7">
          <p id="next-h" className="eyebrow text-brand-600">
            Your next journey
          </p>
          <h2 className="mt-1 text-2xl font-extrabold">{booking.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{booking.subtitle}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact term="Starts">{formatDateMed(booking.startDate)}</Fact>
            <Fact term="Reference" className="font-mono">
              {booking.id}
            </Fact>
            <Fact term="Travellers">{booking.travellerCount}</Fact>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={booking.status} />
              </dd>
            </div>
          </dl>
          <div className="mt-auto flex flex-wrap gap-3 pt-6">
            <ButtonLink href={`/account/bookings/${booking.id}`} rightIcon={<ArrowRight className="h-4 w-4" />}>
              View booking
            </ButtonLink>
            <ButtonLink href={`/account/bookings/${booking.id}/manage`} variant="outline">
              Manage
            </ButtonLink>
            <ButtonLink
              href={isFlight ? `/documents/eticket/${booking.id}` : `/documents/voucher/${booking.id}`}
              target="_blank"
              variant="ghost"
              leftIcon={<FileText className="h-4 w-4" />}
            >
              {isFlight ? "E-ticket" : "Voucher"}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function SideCard({ id, title, icon, href, linkLabel, children }: { id: string; title: React.ReactNode; icon?: React.ReactNode; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 id={id} className={cn("text-[15px] font-bold", icon && "flex items-center gap-2")}>
          {icon}
          {title}
        </h2>
        <Link href={href} className="text-[13px] font-bold text-brand-600 hover:underline">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

interface Activity {
  id: string;
  at: string;
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}

export function AccountOverview() {
  const user = useSessionStore((s) => s.user)!;
  const { all, upcoming } = useMyBookings();
  const travellers = useAccountStore((s) => s.travellers);
  const notifications = useAccountStore((s) => s.notifications);
  const requests = useAccountStore((s) => s.requests);
  const next = upcoming[0];
  const unread = notifications.filter((n) => !n.read);

  // The latest completed step of each booking and request, newest first.
  const activity = useMemo(() => {
    const items: Activity[] = [];
    for (const b of all) {
      const last = [...b.timeline].reverse().find((e) => e.done);
      if (last) items.push({ id: `b-${b.id}`, at: last.at, title: last.label, detail: `${b.title} · ${b.id}`, href: `/account/bookings/${b.id}`, icon: PRODUCT_ICON[b.product] });
    }
    for (const r of requests) {
      const last = [...r.timeline].reverse().find((e) => e.done);
      if (last) items.push({ id: `r-${r.id}`, at: last.at, title: `${r.id} · ${last.label}`, detail: r.bookingTitle, href: "/account/refunds", icon: CalendarClock });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  }, [all, requests]);

  return (
    <div>
      <PageTitle
        title={`${greeting()}, ${user.firstName}`}
        subtitle={
          all.length
            ? `You have ${plural(upcoming.length, "upcoming trip")} and ${plural(unread.length, "unread notification")}.`
            : "Welcome to your Cheaperfly account."
        }
      />
      {next ? (
        <NextJourney booking={next} />
      ) : (
        <section className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-extrabold">No upcoming trips yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-slate-600">
            Your next adventure starts here. Search flights, hotels or Umrah packages — your bookings will appear in this space.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/flights">Search flights</ButtonLink>
            <ButtonLink href="/hotels" variant="outline">
              Find hotels
            </ButtonLink>
          </div>
        </section>
      )}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUICK_LINKS.map((q) => (
          <Link key={q.href} href={q.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-card">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", q.tone)}>
              <q.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-bold text-navy-900">{q.label}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="bk-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="bk-h" className="text-lg font-bold">
                Booking status
              </h2>
              <Link href="/account/bookings" className="text-sm font-bold text-brand-600 hover:underline">
                All bookings
              </Link>
            </div>
            {all.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {[...upcoming, ...all.filter((b) => !upcoming.includes(b))].slice(0, 3).map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            )}
          </section>
          <section aria-labelledby="act-h">
            <h2 id="act-h" className="mb-3 text-lg font-bold">
              Recent activity
            </h2>
            {activity.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Nothing yet — activity from your bookings will show here.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {activity.map((a) => (
                  <li key={a.id}>
                    <Link href={a.href} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <a.icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-navy-900">{a.title}</span>
                        <span className="block truncate text-xs text-slate-500">{a.detail}</span>
                      </span>
                      <span className="hidden text-xs text-slate-400 tnum sm:block">{formatDateTimeMed(a.at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="min-w-0 space-y-8">
          <SideCard
            id="nt-h"
            title={
              <>
                {" Notifications"}
                {unread.length > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread.length}</span>}
              </>
            }
            icon={<Bell className="h-4 w-4 text-slate-400" aria-hidden />}
            href="/account/notifications"
            linkLabel="View all"
          >
            {notifications.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">You’re all caught up.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.slice(0, 3).map((n) => (
                  <li key={n.id} className="px-5 py-3">
                    <Link href={n.href ?? "/account/notifications"} className="block">
                      <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                        {n.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-500">{n.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>
          <SideCard id="tv-h" title=" Saved travellers" icon={<Users className="h-4 w-4 text-slate-400" aria-hidden />} href="/account/travellers" linkLabel="Manage">
            {travellers.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">Save travellers to book faster next time.</p>
            ) : (
              <ul className="flex flex-wrap gap-4 p-5">
                {travellers.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">{initials(`${t.firstName} ${t.lastName}`)}</span>
                    <span className="leading-tight">
                      <span className="block text-[13px] font-bold text-navy-900">{t.firstName}</span>
                      <span className="block text-[11px] text-slate-500">{t.relationship ?? t.type}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>
          {requests.length > 0 && (
            <SideCard id="rq-h" title="Your requests" href="/account/refunds" linkLabel="View">
              <ul className="divide-y divide-slate-100">
                {requests.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-navy-900">
                        {r.id} · {r.bookingTitle}
                      </span>
                      <span className="text-xs capitalize text-slate-500">{r.kind}</span>
                    </span>
                    <Badge tone={r.status === "processed" || r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            </SideCard>
          )}
        </div>
      </div>
    </div>
  );
}

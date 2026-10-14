"use client";

import type { ReactNode } from "react";
import { BedDouble, Bus, CalendarDays, CheckCircle2, Circle, MapPin, MapPinned, Moon, Phone, Plane, Users } from "lucide-react";
import { Stars } from "@/components/brand";
import { Photo } from "@/components/photo";
import { Accordion } from "@/components/ui/disclosure";
import { Badge } from "@/components/ui/primitives";
import { countryName } from "@/data/countries";
import { getHotel } from "@/data/hotels";
import { addDaysISO, formatDateMed, formatDayLong } from "@/lib/engine/dates";
import { MEAL_LABEL } from "@/lib/engine/hotels";
import type { HotelBooking, UmrahBooking } from "@/lib/types/booking";
import type { UmrahHotel } from "@/lib/types/umrah";
import { cn, plural } from "@/lib/utils";
import { Panel } from "./panels";

function Fact({ label, children, sub, className }: { label: string; children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      {children}
      {sub && <dd className="text-xs text-slate-500">{sub}</dd>}
    </div>
  );
}

/** Stay, room & rate, guests and hotel policies of a hotel booking. */
export function HotelBookingSummary({ booking: b }: { booking: HotelBooking }) {
  const h = b.hotel;
  const room = getHotel(h.id)?.rooms.find((r) => r.id === b.quote.roomId);
  const occ = b.criteria.occupancy;
  const policies = h.policies as { title: string; body: string }[];
  return (
    <>
      <Panel title="Your stay" icon={<BedDouble className="h-5 w-5" />} id="stay-h">
        <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
          <Photo src={h.image} alt={h.name} ratio="16/9" className="rounded-lg xl:aspect-[4/3]" sizes="(min-width:1280px) 240px, 100vw" />
          <div>
            <Stars count={h.stars} />
            <h3 className="mt-1 text-xl font-extrabold text-navy-900">{h.name}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {h.address}, {h.city}, {h.country}
            </p>
            <p className="mt-1 text-xs text-slate-500">{h.distanceLabel}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" aria-hidden /> {h.phone}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Check-in" sub={`From ${h.checkIn}`}>
            <dd className="mt-0.5 text-sm font-bold text-navy-900">{formatDayLong(b.criteria.checkIn)}</dd>
          </Fact>
          <Fact label="Check-out" sub={`Until ${h.checkOut}`}>
            <dd className="mt-0.5 text-sm font-bold text-navy-900">{formatDayLong(b.criteria.checkOut)}</dd>
          </Fact>
          <Fact label="Length of stay" sub={plural(b.quote.rooms, "room")}>
            <dd className="mt-0.5 text-sm font-bold text-navy-900">{plural(b.quote.nights, "night")}</dd>
          </Fact>
          <Fact
            label="Guests"
            sub={`${occ.adults} adult${occ.adults > 1 ? "s" : ""}${occ.children ? `, ${occ.children} child${occ.children > 1 ? "ren" : ""}` : ""}`}
          >
            <dd className="mt-0.5 text-sm font-bold text-navy-900">{plural(occ.adults + occ.children, "guest")}</dd>
          </Fact>
        </dl>
      </Panel>
      <Panel title="Room & rate" icon={<CalendarDays className="h-5 w-5" />} id="room-h">
        <p className="text-[16px] font-bold text-navy-900">{b.quote.roomName}</p>
        {room && (
          <p className="mt-0.5 text-sm text-slate-600">
            {room.bed} · {room.sizeSqm} m² · sleeps {room.sleeps.adults + room.sleeps.children} · {room.view}
          </p>
        )}
        <ul className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
          <li className="rounded-md bg-slate-50 px-3 py-2">
            <b className="text-navy-900">{b.quote.ratePlanName}</b>
            {b.quote.ratePlanName !== MEAL_LABEL[b.meal] && ` · ${MEAL_LABEL[b.meal]}`}
          </li>
          <li className={`rounded-md px-3 py-2 ${b.quote.refundable ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {b.quote.refundable ? `Free cancellation until ${formatDateMed(b.quote.freeCancelUntil!)}` : "Non-refundable"}
          </li>
          <li className="rounded-md bg-slate-50 px-3 py-2">{b.quote.payLater ? "Payment: pay at the hotel (card guarantees booking)" : "Payment: paid in full online"}</li>
          <li className="rounded-md bg-slate-50 px-3 py-2">
            Hotel confirmation no. <b className="font-mono text-navy-900">{b.confirmationNumber}</b>
          </li>
        </ul>
        {room && <p className="mt-4 text-xs text-slate-500">Room features: {room.amenities.join(" · ")}</p>}
      </Panel>
      <Panel title="Guests & requests" icon={<Users className="h-5 w-5" />} id="guest-h">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Fact label="Lead guest">
            <dd className="mt-0.5 font-semibold text-navy-900">
              {b.guests[0]?.title} {b.guests[0]?.firstName} {b.guests[0]?.lastName}
            </dd>
          </Fact>
          <Fact label="Expected arrival">
            <dd className="mt-0.5 font-semibold text-navy-900">{b.arrivalTime}</dd>
          </Fact>
          {b.guests.length > 1 && (
            <Fact label="Other guests" className="sm:col-span-2">
              <dd className="mt-0.5 font-semibold text-navy-900">
                {b.guests
                  .slice(1)
                  .map((g) => `${g.firstName} ${g.lastName}`)
                  .join(", ")}
              </dd>
            </Fact>
          )}
          <Fact label="Special requests" className="sm:col-span-2">
            <dd className="mt-0.5 text-slate-700">
              {b.specialRequests.length ? b.specialRequests.join(", ") : "None"}
              {b.requestNotes && <span className="mt-1 block italic text-slate-600">“{b.requestNotes}”</span>}
              <span className="mt-1 block text-xs text-slate-500">Requests are passed to the hotel but are subject to availability and not guaranteed.</span>
            </dd>
          </Fact>
        </dl>
      </Panel>
      <Panel title="Hotel policies" id="pol-h">
        <div className="-my-2">
          {policies.map((p, i) => (
            <Accordion key={p.title} title={p.title} defaultOpen={i === 0}>
              {p.body}
            </Accordion>
          ))}
        </div>
      </Panel>
    </>
  );
}

const VISA_STEPS = [
  { id: "not_started", label: "Booking confirmed", detail: "Package secured" },
  { id: "documents_requested", label: "Documents requested", detail: "Send passport scans & photo" },
  { id: "in_progress", label: "Visa in progress", detail: "Submitted to the Saudi authorities" },
  { id: "issued", label: "Visas issued", detail: "E-visas emailed to you" },
];

/** Package, visa progress, hotels, flights & transfers, travellers and itinerary of an Umrah booking. */
export function UmrahBookingSummary({ booking: b }: { booking: UmrahBooking }) {
  const current = VISA_STEPS.findIndex((s) => s.id === b.visaStatus);
  const returns = addDaysISO(b.config.departureDate, b.package.nights);
  const hotelCard = (h: UmrahHotel, nights: number, city: "Makkah" | "Madinah") => (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <Photo src={h.image} alt={h.name} ratio="16/9" sizes="360px" />
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-umrah-700">
          {city} · {nights} nights
        </p>
        <p className="mt-0.5 text-[15px] font-bold text-navy-900">{h.name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <Stars count={h.stars} size={11} /> {h.distanceM} m to {city === "Makkah" ? "Masjid al-Haram" : "Al-Masjid an-Nabawi"}
        </div>
        <p className="mt-2 text-xs capitalize text-slate-500">
          {b.config.roomType} room · {b.package.mealLabel}
        </p>
      </div>
    </div>
  );
  return (
    <>
      <Panel title="Umrah package" icon={<Moon className="h-5 w-5" />} id="pk-h" action={<Badge tone="umrah">{b.package.category}</Badge>}>
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <Photo src={b.package.images[0]} alt={b.package.name} ratio="16/9" className="rounded-lg xl:aspect-[4/3]" sizes="(min-width:1280px) 260px, 100vw" />
          <div>
            <h3 className="text-xl font-extrabold text-navy-900">{b.package.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{b.package.tagline}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Fact label="Departs" sub={`from ${b.config.departureCity}`}>
                <dd className="mt-0.5 font-bold text-navy-900">{formatDayLong(b.config.departureDate)}</dd>
              </Fact>
              <Fact label="Returns" sub={`${b.package.nights} nights in total`}>
                <dd className="mt-0.5 font-bold text-navy-900">{formatDayLong(returns)}</dd>
              </Fact>
              <Fact label="Package reference">
                <dd className="mt-0.5 font-mono font-bold text-navy-900">{b.confirmationNumber}</dd>
              </Fact>
              <Fact label="Group & guide" sub={b.package.guide}>
                <dd className="mt-0.5 font-semibold text-navy-900">{b.package.groupSize}</dd>
              </Fact>
            </dl>
          </div>
        </div>
      </Panel>
      <Panel title="Visa progress" icon={<MapPinned className="h-5 w-5" />} id="visa-h">
        <ol className="grid gap-4 sm:grid-cols-4">
          {VISA_STEPS.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s.id} className="flex items-start gap-2.5 sm:flex-col sm:gap-2">
                {done ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" aria-hidden /> : <Circle className="h-6 w-6 shrink-0 text-slate-300" aria-hidden />}
                <div>
                  <p className={cn("text-sm font-bold", done ? "text-navy-900" : "text-slate-400")}>{s.label}</p>
                  <p className="text-xs text-slate-500">{s.detail}</p>
                  {i === current && s.id !== "issued" && (
                    <Badge tone="warning" className="mt-1.5">
                      Current step
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {b.visaStatus === "documents_requested" && (
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <b>Action needed:</b> reply to your confirmation email with clear scans of each traveller’s passport bio page and a passport-style photo. Visa processing takes 3–5 working days.
          </p>
        )}
      </Panel>
      <Panel title="Hotels" id="ht-h">
        <div className="grid gap-4 sm:grid-cols-2">
          {hotelCard(b.makkahHotel, b.package.makkahNights, "Makkah")}
          {hotelCard(b.madinahHotel, b.package.madinahNights, "Madinah")}
        </div>
      </Panel>
      <Panel title="Flights & transfers" icon={<Plane className="h-5 w-5" />} id="fl-h">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Flights</p>
            <p className="mt-1 text-[15px] font-bold text-navy-900">{b.flight.label}</p>
            <p className="text-sm text-slate-600">
              {b.config.departureCity} ⇄ Jeddah / Madinah · {b.flight.route}
            </p>
            <p className="mt-1 text-xs text-slate-500">{b.flight.baggage}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Bus className="h-3.5 w-3.5" aria-hidden /> Transfers
            </p>
            <p className="mt-1 text-[15px] font-bold text-navy-900">{b.transfer.label}</p>
            <p className="text-sm text-slate-600">{b.transfer.vehicle}</p>
            <ul className="mt-1 text-xs text-slate-500">
              {b.transfer.includes.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          </div>
        </div>
        {b.extras.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Extras added</p>
            <ul className="flex flex-wrap gap-2">
              {b.extras.map((x) => (
                <li key={x.id}>
                  <Badge tone="umrah">{x.label}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <Panel title={`Travellers (${b.travellers.length})`} icon={<Users className="h-5 w-5" />} id="tv-h">
        <ul className="divide-y divide-slate-100">
          {b.travellers.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-[15px] font-bold text-navy-900">
                  {t.title} {t.firstName} {t.lastName}{" "}
                  <span className="ml-1 text-xs font-medium capitalize text-slate-500">
                    {t.type} {i + 1}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Born {formatDateMed(t.dob)} · {countryName(t.nationality)} · Passport {t.passportNo.replace(/.(?=.{3})/g, "•")} exp. {formatDateMed(t.passportExpiry)}
                </p>
                {t.mahram && <p className="text-xs text-slate-500">Travelling with: {t.mahram}</p>}
              </div>
              <Badge tone={b.visaStatus === "issued" ? "success" : "warning"}>{b.visaStatus === "issued" ? "Visa issued" : "Visa pending"}</Badge>
            </li>
          ))}
        </ul>
        {b.notes && <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-[13px] italic text-slate-600">“{b.notes}”</p>}
      </Panel>
      <Panel title="Day-by-day itinerary" id="iti-h">
        <div className="-my-2">
          {b.package.itinerary.map((d, i) => (
            <Accordion key={d.day} title={`Day ${d.day}: ${d.title}`} defaultOpen={i === 0} meta={<span className="hidden text-xs font-medium text-slate-400 sm:block">{d.location}</span>}>
              <p>{d.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {d.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Meals: {d.meals}</p>
            </Accordion>
          ))}
        </div>
      </Panel>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/engine/currency";
import { addDaysISO, formatDateMed, formatDateTimeMed, formatDayLong } from "@/lib/engine/dates";
import type { Booking, HotelBooking, UmrahBooking } from "@/lib/types/booking";
import { plural } from "@/lib/utils";
import { DocumentShell, Paper, PaperHeader } from "./document-shell";

function Item({ label, children, wide }: { label: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      {children}
    </div>
  );
}

function HotelVoucher({ b }: { b: HotelBooking }) {
  const total = formatCurrency(b.pricing.total, b.currency, { decimals: 2 });
  const lead = b.guests[0];
  const occ = b.criteria.occupancy;
  const meal = b.meal.replace("_", " ");
  const policies = (b.hotel.policies as { title: string; body: string }[]).slice(0, 3);
  return (
    <Paper>
      <PaperHeader
        title="Hotel booking voucher"
        subtitle={`Issued ${formatDateTimeMed(b.createdAt)}`}
        right={
          <>
            <p>
              Booking ref <b className="font-mono text-sm text-navy-900">{b.id}</b>
            </p>
            <p>
              Hotel confirmation <b className="font-mono text-sm text-navy-900">{b.confirmationNumber}</b>
            </p>
          </>
        }
      />
      <h2 className="mt-6 text-2xl font-extrabold text-navy-900">{b.hotel.name}</h2>
      <p className="text-sm text-slate-600">
        {b.hotel.address}, {b.hotel.city}, {b.hotel.country} · {b.hotel.phone}
      </p>
      <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <Item label="Lead guest">
          <dd className="font-bold text-navy-900">
            {lead.title} {lead.firstName} {lead.lastName}
          </dd>
        </Item>
        <Item label="Guests">
          <dd className="font-bold text-navy-900">
            {occ.adults} adults{occ.children ? `, ${occ.children} children` : ""} · {plural(b.quote.rooms, "room")}
          </dd>
        </Item>
        <Item label="Check-in">
          <dd className="font-bold text-navy-900">
            {formatDayLong(b.criteria.checkIn)} from {b.hotel.checkIn}
          </dd>
        </Item>
        <Item label="Check-out">
          <dd className="font-bold text-navy-900">
            {formatDayLong(b.criteria.checkOut)} until {b.hotel.checkOut}
          </dd>
        </Item>
        <Item label="Room">
          <dd className="font-bold text-navy-900">{b.quote.roomName}</dd>
        </Item>
        <Item label="Rate & meals">
          <dd className="font-bold text-navy-900">{b.quote.ratePlanName.toLowerCase() === meal ? b.quote.ratePlanName : `${b.quote.ratePlanName} · ${meal}`}</dd>
        </Item>
        <Item label="Payment" wide>
          <dd className="font-bold text-navy-900">{b.quote.payLater ? `${total} payable at the hotel` : `Prepaid ${total} — nothing to pay at the hotel except local taxes`}</dd>
        </Item>
        {b.specialRequests.length > 0 && (
          <Item label="Special requests" wide>
            <dd className="text-slate-700">
              {b.specialRequests.join(", ")}
              {b.requestNotes ? ` — “${b.requestNotes}”` : ""}
            </dd>
          </Item>
        )}
      </dl>
      <div className="mt-6 rounded-lg bg-slate-50 p-4 text-[13px] text-slate-700">
        <p className="font-bold text-navy-900">Cancellation</p>
        <p>{b.quote.refundable ? `Free cancellation until ${formatDateMed(b.quote.freeCancelUntil!)}. After this date the full stay is charged.` : "This rate is non-refundable."}</p>
      </div>
      <ul className="mt-5 list-disc space-y-1 pl-5 text-xs text-slate-600">
        {policies.map((p) => (
          <li key={p.title}>
            <b>{p.title}:</b> {p.body}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[10px] text-slate-400">Prototype voucher generated from demo data. Present a photo ID at check-in.</p>
    </Paper>
  );
}

function UmrahVoucher({ b }: { b: UmrahBooking }) {
  return (
    <Paper>
      <PaperHeader
        title="Umrah booking voucher"
        subtitle={`Issued ${formatDateTimeMed(b.createdAt)}`}
        right={
          <>
            <p>
              Booking ref <b className="font-mono text-sm text-navy-900">{b.id}</b>
            </p>
            <p>
              Package ref <b className="font-mono text-sm text-navy-900">{b.confirmationNumber}</b>
            </p>
          </>
        }
      />
      <h2 className="mt-6 text-2xl font-extrabold text-navy-900">{b.package.name}</h2>
      <p className="text-sm text-slate-600">
        {formatDayLong(b.config.departureDate)} → {formatDayLong(addDaysISO(b.config.departureDate, b.package.nights))} · {b.package.nights} nights · from {b.config.departureCity}
      </p>
      <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <Item label={`Makkah (${b.package.makkahNights} nights)`}>
          <dd className="font-bold text-navy-900">{b.makkahHotel.name}</dd>
          <dd className="text-xs text-slate-500">{b.makkahHotel.distanceM} m to Masjid al-Haram</dd>
        </Item>
        <Item label={`Madinah (${b.package.madinahNights} nights)`}>
          <dd className="font-bold text-navy-900">{b.madinahHotel.name}</dd>
          <dd className="text-xs text-slate-500">{b.madinahHotel.distanceM} m to Al-Masjid an-Nabawi</dd>
        </Item>
        <Item label="Room & meals">
          <dd className="font-bold capitalize text-navy-900">
            {b.config.roomType} · {b.package.mealLabel}
          </dd>
        </Item>
        <Item label="Flights">
          <dd className="font-bold text-navy-900">{b.flight.label}</dd>
          <dd className="text-xs text-slate-500">{b.flight.baggage}</dd>
        </Item>
        <Item label="Transfers">
          <dd className="font-bold text-navy-900">{b.transfer.label}</dd>
        </Item>
        <Item label="Visa">
          <dd className="font-bold text-navy-900">{b.providerMode === "simulated" ? "Simulated — no visa submitted" : b.visaStatus.replace("_", " ")}</dd>
        </Item>
      </dl>
      <h3 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Travellers</h3>
      <ul className="text-sm">
        {b.travellers.map((t) => (
          <li key={t.id} className="border-b border-slate-100 py-1.5 font-semibold text-navy-900">
            {t.title} {t.firstName} {t.lastName}{" "}
            <span className="font-normal capitalize text-slate-500">
              · {t.type} · Passport {t.passportNo.replace(/.(?=.{3})/g, "•")}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Itinerary</h3>
      <ol className="space-y-1.5 text-[13px]">
        {b.package.itinerary.map((d) => (
          <li key={d.day}>
            <b className="text-navy-900">Day {d.day}</b> — {d.title}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[10px] text-slate-400">Prototype voucher generated from demo data. 24/7 helpline: +44 20 4577 0142.</p>
    </Paper>
  );
}

function Voucher({ b }: { b: Booking }) {
  if (b.product === "hotel") return <HotelVoucher b={b} />;
  if (b.product === "umrah") return <UmrahVoucher b={b} />;
  return null;
}

export function VoucherDocument({ reference }: { reference: string }) {
  return <DocumentShell reference={reference} documentKind="voucher">{(b) => <Voucher b={b} />}</DocumentShell>;
}

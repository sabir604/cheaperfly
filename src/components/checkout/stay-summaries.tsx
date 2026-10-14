import type { ReactNode } from "react";
import { Stars } from "@/components/brand";
import { Photo } from "@/components/photo";
import { getUmrahHotel } from "@/data/umrah";
import { getHotel } from "@/data/hotels";
import { addDaysISO, formatDateMed, formatDayShort } from "@/lib/engine/dates";
import type { MealPlan } from "@/lib/engine/hotels";
import { getUmrahPackage } from "@/lib/engine/umrah";
import type { HotelDraft, UmrahDraft } from "@/lib/types/booking";
import { plural } from "@/lib/utils";

const MEAL_TEXT: Record<MealPlan, string> = {
  room_only: "Room only",
  breakfast: "Breakfast included",
  half_board: "Half board",
  full_board: "Full board",
};

function Row({ label, children, right }: { label: string; children: ReactNode; right?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={right ? "text-right font-semibold text-navy-900" : "font-semibold text-navy-900"}>{children}</dd>
    </div>
  );
}

/** Hotel checkout summary header: photo, dates, guests, room and rate. */
export function HotelStaySummary({ draft }: { draft: HotelDraft }) {
  const hotel = getHotel(draft.hotelId);
  if (!hotel) return null;
  const q = draft.quote;
  const c = draft.criteria;
  return (
    <div>
      <Photo src={hotel.images[0]} alt={hotel.name} ratio="16/9" className="mb-3 rounded-lg" sizes="360px" />
      <Stars count={hotel.stars} size={12} />
      <p className="mt-1 text-[15px] font-bold leading-snug text-navy-900">{hotel.name}</p>
      <p className="text-xs text-slate-500">
        {hotel.area}, {hotel.city}
      </p>
      <dl className="mt-3 space-y-1.5 text-[13px]">
        <Row label="Check-in">
          {formatDayShort(c.checkIn)} · from {hotel.checkIn}
        </Row>
        <Row label="Check-out">
          {formatDayShort(c.checkOut)} · until {hotel.checkOut}
        </Row>
        <Row label="Guests">
          {plural(c.occupancy.adults + c.occupancy.children, "guest")}, {plural(c.occupancy.rooms, "room")}
        </Row>
        <Row label="Room" right>
          {q.roomName}
        </Row>
        <Row label="Rate" right>
          {q.ratePlanName === MEAL_TEXT[q.meal] ? q.ratePlanName : `${q.ratePlanName} · ${MEAL_TEXT[q.meal]}`}
        </Row>
      </dl>
      <p className={`mt-3 rounded-md px-2.5 py-1.5 text-xs font-semibold ${q.refundable ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        {q.refundable ? `Free cancellation until ${formatDateMed(q.freeCancelUntil!)}` : "Non-refundable rate"}
        {q.payLater ? " · Pay at the hotel" : ""}
      </p>
    </div>
  );
}

/** Umrah checkout summary header: package, dates, hotels, room and party. */
export function UmrahTripSummary({ draft }: { draft: UmrahDraft }) {
  const pkg = getUmrahPackage(draft.packageId);
  if (!pkg) return null;
  const c = draft.config;
  return (
    <div>
      <Photo src={pkg.images[0]} alt={pkg.name} ratio="16/9" className="mb-3 rounded-lg" sizes="360px" />
      <p className="text-[15px] font-bold leading-snug text-navy-900">{pkg.name}</p>
      <p className="text-xs text-slate-500">
        {pkg.nights} nights · {pkg.makkahNights} Makkah + {pkg.madinahNights} Madinah
      </p>
      <dl className="mt-3 space-y-1.5 text-[13px]">
        <Row label="Departs" right>
          {formatDayShort(c.departureDate)} from {c.departureCity}
        </Row>
        <Row label="Returns">{formatDayShort(addDaysISO(c.departureDate, pkg.nights))}</Row>
        <Row label="Makkah" right>
          {getUmrahHotel(c.makkahHotelId)?.name}
        </Row>
        <Row label="Madinah" right>
          {getUmrahHotel(c.madinahHotelId)?.name}
        </Row>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Room</dt>
          <dd className="font-semibold capitalize text-navy-900">{c.roomType}</dd>
        </div>
        <Row label="Travellers">
          {c.adults} adult{c.adults > 1 ? "s" : ""}
          {c.children ? `, ${c.children} child${c.children > 1 ? "ren" : ""}` : ""}
          {c.infants ? `, ${c.infants} infant${c.infants > 1 ? "s" : ""}` : ""}
        </Row>
      </dl>
    </div>
  );
}

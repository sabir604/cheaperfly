"use client";

import { countryName } from "@/data/countries";
import { baggageOptionById } from "@/data/extras";
import { formatCurrency } from "@/lib/engine/currency";
import { formatDateMed, formatDateTimeMed, formatDayShort, formatDuration, formatTime } from "@/lib/engine/dates";
import type { FlightBooking } from "@/lib/types/booking";
import { Barcode, DocumentShell, Paper, PaperHeader } from "./document-shell";

const LABEL = "text-[11px] font-bold uppercase tracking-wider text-slate-400";

function TicketPage({ b, index }: { b: FlightBooking; index: number }) {
  const p = b.passengers[index];
  const legs = b.offer.legs;
  const extraBags = Object.values(b.extras.baggage[p.id] ?? {})
    .map((id) => baggageOptionById(id)?.label)
    .filter(Boolean);
  const money = (n: number) => formatCurrency(n, b.currency, { decimals: 2 });
  return (
    <Paper>
      <PaperHeader
        title="Electronic ticket · itinerary / receipt"
        subtitle={`Issued ${formatDateTimeMed(b.createdAt)}`}
        right={
          <>
            <p>
              Booking reference <b className="font-mono text-sm text-navy-900">{b.id}</b>
            </p>
            <p>
              Airline PNR <b className="font-mono text-sm text-navy-900">{b.pnr}</b>
            </p>
          </>
        }
      />
      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <p className={LABEL}>Passenger</p>
          <p className="text-2xl font-extrabold uppercase tracking-tight text-navy-900">
            {p.lastName} / {p.firstName} {p.middleName} {p.title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {p.type} · {countryName(p.nationality)} · Passport {p.passportNo.replace(/.(?=.{3})/g, "•")}
          </p>
        </div>
        <div className="sm:text-right">
          <p className={LABEL}>E-ticket number</p>
          <p className="font-mono text-xl font-extrabold text-navy-900">{b.refundedPassengerIds?.includes(p.id) ? "CANCELLED — SIMULATED" : p.ticketNumber || "SIMULATED"}</p>
          <p className="text-xs text-slate-500">
            {b.offer.airlineName} · {b.fare.name}
          </p>
        </div>
      </div>
      <table className="mt-7 w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-y border-slate-300 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">Flight</th>
            <th className="px-2 py-2">Departure</th>
            <th className="px-2 py-2">Arrival</th>
            <th className="px-2 py-2">Class / Seat</th>
          </tr>
        </thead>
        <tbody>
          {legs.flatMap((leg, li) =>
            leg.segments.map((s) => (
              <tr key={s.id} className="border-b border-slate-200 align-top">
                <td className="px-2 py-3">
                  <p className="font-bold text-navy-900">{s.flightNumber}</p>
                  <p className="text-xs text-slate-500">{s.airlineName}</p>
                  <p className="text-xs text-slate-500">{s.aircraft}</p>
                  <p className="text-xs text-slate-400">
                    {legs.length === 2 ? (li === 0 ? "Outbound" : "Return") : `Flight ${li + 1}`} · {formatDuration(s.durationMin)}
                  </p>
                </td>
                <td className="px-2 py-3">
                  <p className="text-lg font-extrabold text-navy-900 tnum">{formatTime(s.departLocal)}</p>
                  <p className="text-xs text-slate-600">{formatDayShort(s.departLocal)}</p>
                  <p className="font-semibold text-navy-900">
                    {s.fromCity} ({s.from})
                  </p>
                  <p className="text-xs text-slate-500">Terminal {s.terminalFrom}</p>
                </td>
                <td className="px-2 py-3">
                  <p className="text-lg font-extrabold text-navy-900 tnum">{formatTime(s.arriveLocal)}</p>
                  <p className="text-xs text-slate-600">{formatDayShort(s.arriveLocal)}</p>
                  <p className="font-semibold text-navy-900">
                    {s.toCity} ({s.to})
                  </p>
                  <p className="text-xs text-slate-500">Terminal {s.terminalTo}</p>
                </td>
                <td className="px-2 py-3">
                  <p className="font-semibold capitalize text-navy-900">{s.cabin.replace("_", " ")}</p>
                  <p className="text-xs text-slate-500">Seat {b.extras.seats[s.id]?.[p.id]?.seat ?? "at check-in"}</p>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="text-[13px]">
          <p className={`mb-1 ${LABEL}`}>Baggage allowance</p>
          <p>Cabin: {b.fare.cabinBag}</p>
          <p>
            Checked: {b.fare.checkedBag.pieces > 0 ? `${b.fare.checkedBag.pieces} × ${b.fare.checkedBag.kg} kg` : "not included"}
            {extraBags.length ? ` + ${extraBags.join(", ")} extra` : ""}
          </p>
          <p className={`mt-3 mb-1 ${LABEL}`}>Fare rules</p>
          <p>
            {b.fare.changeFee === null ? "Changes not permitted." : b.fare.changeFee === 0 ? "Changes free of charge." : "Changes permitted with a fee."}{" "}
            {b.fare.refundFee === null ? "Non-refundable." : b.fare.refundFee === 0 ? "Fully refundable." : "Refundable with a fee."}
          </p>
        </div>
        <div className="text-[13px]">
          <p className={`mb-1 ${LABEL}`}>Fare details (whole booking)</p>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt>Fare</dt>
              <dd className="tnum">{money(b.pricing.base)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxes &amp; carrier charges</dt>
              <dd className="tnum">{money(b.pricing.taxes)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Extras</dt>
              <dd className="tnum">{money(b.pricing.extras)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-navy-900">
              <dt>Total paid</dt>
              <dd className="tnum">{money(b.pricing.total)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="mt-7 flex items-center justify-between gap-6 border-t border-slate-200 pt-5">
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>Carry this document and a valid passport to the airport.</li>
          <li>Check-in closes 60 minutes before international departures.</li>
          <li>Departure and arrival times are local to each airport.</li>
        </ul>
        <div className="shrink-0 text-center">
          <Barcode value={`${p.ticketNumber || "SIMULATED"}${b.pnr}`} className="h-11 w-56" />
          <p className="mt-1 text-[10px] text-slate-400">Illustrative barcode · prototype document</p>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-slate-400">
        Issued for {b.customerEmail} on {formatDateMed(b.createdAt)}. This is a prototype document generated from demo data and is not valid for travel.
      </p>
    </Paper>
  );
}

/** One e-ticket page per passenger. */
export function ETicketDocument({ reference }: { reference: string }) {
  return (
    <DocumentShell reference={reference} documentKind="eticket">
      {(b) =>
        b.product !== "flight" ? (
          <Paper>
            <p className="text-sm text-slate-600">E-tickets are only issued for flight bookings.</p>
          </Paper>
        ) : (
          <>
            {b.passengers.map((p, i) => (
              <TicketPage key={p.id} b={b} index={i} />
            ))}
          </>
        )
      }
    </DocumentShell>
  );
}

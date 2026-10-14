"use client";

import type { ReactNode } from "react";
import { Copy, Plane, Users } from "lucide-react";
import { TYPE_LABEL } from "@/components/checkout/traveller-fields";
import { BaggageChips, LegTimeline } from "@/components/flights/leg";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { countryName } from "@/data/countries";
import { ASSISTANCE_OPTIONS, baggageOptionById, mealOptionById } from "@/data/extras";
import { formatDateMed } from "@/lib/engine/dates";
import type { FlightBooking } from "@/lib/types/booking";
import { Panel } from "./panels";

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-navy-900">{children}</dd>
    </div>
  );
}

/** Itinerary, passengers with ticket numbers and extras, and the fare rules of a flight booking. */
export function FlightBookingSummary({ booking }: { booking: FlightBooking }) {
  const legs = booking.offer.legs;
  const legLabel = (i: number) => (legs.length === 2 ? (i === 0 ? "Outbound" : "Return") : `Flight ${i + 1}`);
  const fare = booking.fare;
  return (
    <>
      <Panel title="Itinerary" icon={<Plane className="h-5 w-5" />} id="it-h" action={<Badge tone="outline">{booking.offer.airlineName}</Badge>}>
        <div className="space-y-8">
          {legs.map((leg, i) => (
            <div key={leg.id} className={i > 0 ? "border-t border-dashed border-slate-200 pt-8" : ""}>
              <LegTimeline leg={leg} title={legLabel(i)} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={`Passengers & tickets (${booking.passengers.length})`} icon={<Users className="h-5 w-5" />} id="px-h">
        <ul className="space-y-5">
          {booking.passengers.map((p, i) => {
            const seats = legs.flatMap((l) => l.segments.map((s) => ({ s, sel: booking.extras.seats[s.id]?.[p.id] }))).filter((x) => x.sel);
            const bags = Object.entries(booking.extras.baggage[p.id] ?? {})
              .map(([li, id]) => ({ li: Number(li), opt: baggageOptionById(id) }))
              .filter((b) => b.opt);
            const assist = booking.extras.assistance[p.id];
            return (
              <li key={p.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-bold text-navy-900">
                      {p.title} {p.firstName} {p.middleName} {p.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {TYPE_LABEL[p.type]} {i + 1} · Born {formatDateMed(p.dob)} · {countryName(p.nationality)}
                      {p.frequentFlyer ? ` · FF ${p.frequentFlyer}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(p.ticketNumber ?? "");
                      toast.success("Ticket number copied");
                    }}
                    className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-left hover:bg-slate-100"
                    aria-label={`Copy ticket number ${p.ticketNumber}`}
                  >
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">E-ticket number</span>
                      <span className="font-mono text-[13px] font-bold text-navy-900">{p.ticketNumber}</span>
                    </span>
                    <Copy className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  </button>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                  <Item label="Seats">
                    {seats.length ? seats.map((x) => `${x.s.from}→${x.s.to} ${x.sel!.seat}`).join(" · ") : <span className="font-normal text-slate-500">To be allocated at check-in</span>}
                  </Item>
                  <Item label="Baggage">
                    {fare.checkedBag.pieces > 0 ? `${fare.checkedBag.pieces} × ${fare.checkedBag.kg} kg` : "Hand baggage only"}
                    {bags.length > 0 && <span className="font-normal text-slate-600"> + {bags.map((b) => `${b.opt!.label} (${legLabel(b.li)})`).join(", ")}</span>}
                  </Item>
                  <Item label="Meals">
                    {legs
                      .map(
                        (_, li) =>
                          mealOptionById(booking.extras.meals[p.id]?.[li] ?? (p.type === "infant" ? "infant" : p.type === "child" ? "child" : "standard"))?.label ?? "Standard meal",
                      )
                      .join(" / ")}
                  </Item>
                  {assist && assist.type !== "none" && (
                    <Item label="Special assistance">
                      {ASSISTANCE_OPTIONS.find((o) => o.id === assist.type)?.label}
                      {assist.notes && <span className="block font-normal text-slate-600">“{assist.notes}”</span>}
                    </Item>
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title={`Fare — ${fare.name}`} id="fare-h">
        <BaggageChips fare={fare} />
        <ul className="mt-3 grid gap-1.5 text-[13px] text-slate-700 sm:grid-cols-2">
          <li>{fare.changeFee === null ? "Changes not permitted" : fare.changeFee === 0 ? "Changes free of charge" : `Changes: ${fare.changeFee} GBP fee + fare difference`}</li>
          <li>{fare.refundFee === null ? "Non-refundable (unused taxes refundable)" : fare.refundFee === 0 ? "Fully refundable" : `Refundable: ${fare.refundFee} GBP airline fee`}</li>
          <li>{fare.meal ? "Meal included" : "Meals available to buy onboard"}</li>
          <li>{fare.seatSelection === "paid" ? "Seat selection: paid" : fare.seatSelection === "standard_free" ? "Free standard seat selection" : "Free preferred seat selection"}</li>
          {fare.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Armchair, CalendarClock, Check, FileUp, Hotel, Luggage, Mail, Utensils } from "lucide-react";
import { BackLink, Panel } from "@/components/bookings/panels";
import { isClosed } from "@/components/bookings/booking-detail-view";
import { OptionCard } from "@/components/checkout/extras-step";
import { SeatLegend, SeatMapView } from "@/components/checkout/seat-map";
import { DateField } from "@/components/search/date-field";
import { Button, ButtonLink } from "@/components/ui/button";
import { TabList, TabPanel } from "@/components/ui/disclosure";
import { InlineNotice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { DIAL_CODES } from "@/data/countries";
import { BAGGAGE_OPTIONS, MEAL_OPTIONS } from "@/data/extras";
import { submitChangeRequest, updateBookingContact, updateFlightExtras, updateHotelPreferences, updateUmrahNotes } from "@/lib/engine/bookings/requests";
import { formatCurrency, toCurrency } from "@/lib/engine/currency";
import { addDaysISO, todayISO } from "@/lib/engine/dates";
import type { Seat, SeatMap } from "@/lib/engine/flights/seatmap";
import { flightService } from "@/lib/engine/flights/service";
import { calcFlightPricing, type FlightExtras } from "@/lib/engine/pricing";
import type { Booking, FlightBooking, HotelBooking, UmrahBooking } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { contactSchema } from "@/lib/validation";

const money = (amount: number, b: Booking) => formatCurrency(amount, b.currency, { decimals: 2 });

/** Price difference of new flight extras against what was paid. */
function extrasDelta(b: FlightBooking, extras: FlightExtras) {
  return calcFlightPricing({ offer: b.offer, fareId: b.fare.id, extras, pax: b.criteria.pax }, b.currency, !!b.userId).total - b.pricing.total;
}

function ContactTab({ booking }: { booking: Booking }) {
  const form = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema), defaultValues: booking.contact });
  const { errors, isSubmitting, isDirty } = form.formState;
  return (
    <Panel title="Contact details" id="mg-contact" icon={<Mail className="h-5 w-5" />}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await new Promise((r) => setTimeout(r, 400));
          updateBookingContact(booking.id, values);
          form.reset(values);
          toast.success("Contact details updated");
        })}
        noValidate
        className="grid gap-4 sm:grid-cols-6"
      >
        <Field label="Email address" htmlFor="mg-email" error={errors.email?.message} required className="sm:col-span-3">
          <Input id="mg-email" type="email" invalid={!!errors.email} {...form.register("email")} />
        </Field>
        <Field label="Code" htmlFor="mg-cc" className="sm:col-span-1">
          <Select id="mg-cc" {...form.register("countryCode")}>
            {DIAL_CODES.map((c) => (
              <option key={c.dial} value={c.dial}>
                {c.dial}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mobile number" htmlFor="mg-mobile" error={errors.mobile?.message} required className="sm:col-span-2">
          <Input id="mg-mobile" type="tel" invalid={!!errors.mobile} {...form.register("mobile")} />
        </Field>
        <div className="sm:col-span-6">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save contact details
          </Button>
          <p className="mt-2 text-xs text-slate-500">Confirmations and schedule change alerts are sent here.</p>
        </div>
      </form>
    </Panel>
  );
}

function MealsTab({ booking }: { booking: FlightBooking }) {
  const [meals, setMeals] = useState(booking.extras.meals);
  const legs = booking.offer.legs;
  const changed = JSON.stringify(meals) !== JSON.stringify(booking.extras.meals);
  return (
    <Panel title="Change meals" id="mg-meals" icon={<Utensils className="h-5 w-5" />}>
      <div className="space-y-6">
        {booking.passengers.map((p) => {
          const options = MEAL_OPTIONS.filter((o) => !o.for || o.for === p.type);
          return (
            <div key={p.id}>
              <p className="mb-2 text-sm font-bold text-navy-900">
                {p.firstName} {p.lastName}
              </p>
              {legs.map((leg, li) => {
                const current = meals[p.id]?.[li] ?? (p.type === "infant" ? "infant" : p.type === "child" ? "child" : "standard");
                return (
                  <div key={leg.id} className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500">
                      {leg.fromCity} → {leg.toCity}
                    </p>
                    <div role="radiogroup" aria-label={`Meal for ${p.firstName}, ${leg.fromCity} to ${leg.toCity}`} className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {options.map((o) => (
                        <OptionCard
                          key={o.id}
                          selected={current === o.id}
                          onClick={() => setMeals((m) => ({ ...m, [p.id]: { ...(m[p.id] ?? {}), [li]: o.id } }))}
                          title={o.label}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <Button
        disabled={!changed}
        onClick={() => {
          updateFlightExtras(booking.id, { ...booking.extras, meals }, "Meal preferences changed");
          toast.success("Meal preferences saved. Special meals are free of charge.");
        }}
      >
        Save meal changes
      </Button>
    </Panel>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  body,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} size="sm">
        <p className="text-sm text-slate-700">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const chargeLine = (delta: number, b: Booking) => `Charge ${money(delta, b)} to ${b.payment.brand ?? "card"} ending ${b.payment.last4}.`;

function BaggageTab({ booking }: { booking: FlightBooking }) {
  const [baggage, setBaggage] = useState(booking.extras.baggage);
  const [confirming, setConfirming] = useState(false);
  const extras = { ...booking.extras, baggage };
  const delta = extrasDelta(booking, extras);
  const bag = booking.fare.checkedBag;
  return (
    <Panel title="Add or change baggage" id="mg-bags" icon={<Luggage className="h-5 w-5" />}>
      <InlineNotice tone="info" className="mb-5">
        Included: {bag.pieces > 0 ? `${bag.pieces} × ${bag.kg} kg checked` : "hand baggage only"}. Extra baggage is charged per passenger per flight.
      </InlineNotice>
      <div className="space-y-6">
        {booking.passengers.map((p) => (
          <div key={p.id}>
            <p className="mb-2 text-sm font-bold text-navy-900">
              {p.firstName} {p.lastName}
            </p>
            {booking.offer.legs.map((leg, li) => {
              const current = baggage[p.id]?.[li] ?? null;
              return (
                <div key={leg.id} className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    {leg.fromCity} → {leg.toCity}
                  </p>
                  <div role="radiogroup" aria-label={`Extra baggage for ${p.firstName}, ${leg.fromCity} to ${leg.toCity}`} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <OptionCard
                      selected={current === null}
                      onClick={() =>
                        setBaggage((all) => {
                          const next = { ...all, [p.id]: { ...(all[p.id] ?? {}) } };
                          delete next[p.id][li];
                          return next;
                        })
                      }
                      title="No extra"
                    />
                    {BAGGAGE_OPTIONS.map((o) => (
                      <OptionCard
                        key={o.id}
                        selected={current === o.id}
                        onClick={() => setBaggage((all) => ({ ...all, [p.id]: { ...(all[p.id] ?? {}), [li]: o.id } }))}
                        title={o.label}
                        price={formatCurrency(toCurrency(o.price, booking.currency), booking.currency)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-600">
          {delta === 0 ? (
            "No change to your total"
          ) : delta > 0 ? (
            <>
              Additional charge: <b className="text-navy-900 tnum">{money(delta, booking)}</b>
            </>
          ) : (
            <>
              Refund: <b className="tnum text-navy-900">{money(Math.abs(delta), booking)}</b>
            </>
          )}
        </p>
        <Button disabled={delta === 0} onClick={() => setConfirming(true)}>
          {delta > 0 ? "Review & pay" : "Save baggage"}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm baggage update"
        description={delta > 0 ? "The difference will be charged to the card used for this booking." : "Your baggage selection will be updated."}
        body={delta > 0 ? chargeLine(delta, booking) : "No payment is needed."}
        confirmLabel={delta > 0 ? "Confirm & pay" : "Confirm"}
        onConfirm={() => {
          updateFlightExtras(booking.id, extras, "Extra baggage updated");
          setConfirming(false);
          toast.success(delta > 0 ? `${money(delta, booking)} charged. Baggage added.` : "Baggage updated");
        }}
      />
    </Panel>
  );
}

function SeatsTab({ booking }: { booking: FlightBooking }) {
  const segments = booking.offer.legs.flatMap((l) => l.segments);
  const [segIndex, setSegIndex] = useState(0);
  const segment = segments[segIndex];
  const [seats, setSeats] = useState(booking.extras.seats);
  const [maps, setMaps] = useState<Record<string, SeatMap>>({});
  const map = maps[segment.id];
  const seated = booking.passengers.filter((p) => p.type !== "infant");
  const [activePax, setActivePax] = useState(seated[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (maps[segment.id]) return;
    let cancelled = false;
    flightService.getSeatMap(segment, booking.fare).then((m) => {
      if (!cancelled) setMaps((all) => ({ ...all, [segment.id]: m }));
    });
    return () => {
      cancelled = true;
    };
  }, [segment, booking.fare, maps]);

  const extras = { ...booking.extras, seats, seatsSkipped: false };
  const delta = extrasDelta(booking, extras);
  const changed = JSON.stringify(seats) !== JSON.stringify(booking.extras.seats);
  const selections = seats[segment.id] ?? {};
  const owners = seated.map((p) => ({ paxId: p.id, initials: `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase() }));

  /** Picking a seat moves it to the active passenger; picking their own seat again clears it. */
  function pick(seat: Seat) {
    if (seat.occupied) return;
    setSeats((all) => {
      const onSeg = { ...(all[segment.id] ?? {}) };
      for (const [paxId, s] of Object.entries(onSeg)) if (s.seat === seat.id && paxId !== activePax) delete onSeg[paxId];
      if (onSeg[activePax]?.seat === seat.id) delete onSeg[activePax];
      else onSeg[activePax] = { seat: seat.id, price: seat.price, kind: seat.kind };
      return { ...all, [segment.id]: onSeg };
    });
  }

  return (
    <Panel title="Choose or change seats" id="mg-seats" icon={<Armchair className="h-5 w-5" />}>
      <div role="tablist" aria-label="Flights" className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        {segments.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={i === segIndex}
            onClick={() => setSegIndex(i)}
            className={cn(
              "shrink-0 rounded-lg border px-3.5 py-2 text-left text-[13px] font-bold",
              i === segIndex ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-700",
            )}
          >
            {s.from} → {s.to} <span className="block text-xs font-normal text-slate-500">{s.flightNumber}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {seated.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePax(p.id)}
            aria-pressed={activePax === p.id}
            className={cn("rounded-lg border-2 px-3 py-2 text-left text-[13px]", activePax === p.id ? "border-brand-500 bg-brand-50" : "border-slate-200")}
          >
            <b className="text-navy-900">{p.firstName}</b>
            <span className="block text-xs text-slate-500">{selections[p.id] ? `Seat ${selections[p.id].seat}` : "No seat"}</span>
          </button>
        ))}
      </div>
      <SeatLegend priceRange={{ standard: "", premium: "", legroom: "" }} />
      <div className="mt-3 max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4" tabIndex={0} aria-label="Seat map, scrollable">
        {map ? (
          <SeatMapView map={map} selections={selections} owners={owners} activePaxId={activePax} onPick={pick} onHover={() => {}} scale={0.9} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">Loading seat map…</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {delta === 0 ? (
            "No change to your total"
          ) : (
            <>
              Additional charge: <b className="text-navy-900 tnum">{money(Math.max(0, delta), booking)}</b>
            </>
          )}
        </p>
        <Button disabled={!changed} onClick={() => setConfirming(true)}>
          Confirm seats
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm seat changes"
        body={delta > 0 ? chargeLine(delta, booking) : "No payment is needed."}
        confirmLabel="Confirm"
        onConfirm={() => {
          updateFlightExtras(booking.id, extras, "Seats updated");
          setConfirming(false);
          toast.success("Seats updated");
        }}
      />
    </Panel>
  );
}

const STAY_REQUESTS = ["High floor", "Quiet room", "Late arrival", "Early check-in", "Extra bed / cot", "Adjoining rooms", "Non-smoking"];
const ARRIVAL_TIMES = ["12:00", "14:00", "15:00", "16:00", "18:00", "20:00", "22:00", "00:00"];

function StayTab({ booking }: { booking: HotelBooking }) {
  const [requests, setRequests] = useState(booking.specialRequests);
  const [notes, setNotes] = useState(booking.requestNotes);
  const [arrival, setArrival] = useState(booking.arrivalTime);
  return (
    <Panel title="Stay preferences" id="mg-stay" icon={<Hotel className="h-5 w-5" />}>
      <div className="grid gap-4 sm:grid-cols-2">
        {STAY_REQUESTS.map((r) => (
          <Checkbox
            key={r}
            checked={requests.includes(r)}
            onChange={(e) => setRequests((all) => (e.target.checked ? [...all, r] : all.filter((x) => x !== r)))}
            label={r}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Field label="Expected arrival" htmlFor="st-arr">
          <Select id="st-arr" value={arrival} onChange={(e) => setArrival(e.target.value)}>
            {ARRIVAL_TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notes for the hotel" htmlFor="st-notes" className="sm:col-span-2">
          <Textarea id="st-notes" rows={3} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          updateHotelPreferences(booking.id, { specialRequests: requests, requestNotes: notes, arrivalTime: arrival });
          toast.success("Preferences sent to the hotel. Requests aren't guaranteed.");
        }}
      >
        Save preferences
      </Button>
    </Panel>
  );
}

function VisaDocsTab({ booking }: { booking: UmrahBooking }) {
  const [notes, setNotes] = useState(booking.notes);
  const [received, setReceived] = useState(booking.visaStatus !== "documents_requested");
  return (
    <Panel title="Visa documents & notes" id="mg-docs" icon={<FileUp className="h-5 w-5" />}>
      <p className="mb-4 text-sm text-slate-600">
        Upload clear scans of each traveller’s passport bio page and a recent passport-style photo. In this prototype uploading is simulated.
      </p>
      <ul className="mb-4 space-y-2">
        {booking.travellers.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm">
            <span className="font-semibold text-navy-900">
              {t.firstName} {t.lastName}
            </span>
            <span className={cn("text-xs font-bold", received ? "text-emerald-700" : "text-amber-700")}>{received ? "Passport & photo received" : "Awaiting upload"}</span>
          </li>
        ))}
      </ul>
      <Checkbox
        checked={received}
        disabled={booking.visaStatus === "in_progress" || booking.visaStatus === "issued"}
        onChange={(e) => setReceived(e.target.checked)}
        label="I've uploaded documents for all travellers (simulated)"
      />
      <Field label="Notes for our Umrah team" htmlFor="um-notes" className="mt-4">
        <Textarea
          id="um-notes"
          rows={3}
          maxLength={400}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Wheelchair assistance, dietary needs, room preferences…"
        />
      </Field>
      <Button
        className="mt-4"
        onClick={() => {
          updateUmrahNotes(booking.id, notes, received);
          toast.success(received ? "Documents received — visa applications submitted" : "Notes saved");
        }}
      >
        Save
      </Button>
    </Panel>
  );
}

const changeSchema = z.object({
  reason: z.string().min(1, "Choose what you'd like to change"),
  preferredDate: z.string().optional(),
  notes: z.string().trim().min(10, "Tell us a little more (at least 10 characters)"),
});

const CHANGE_REASONS = {
  flight: ["Change travel dates", "Change route / destination", "Correct a passenger name", "Other"],
  hotel: ["Change stay dates", "Change room type", "Add or remove a guest", "Other"],
  umrah: ["Change departure date", "Change hotel", "Add or remove a traveller", "Other"],
};

function ChangeRequestTab({ booking, basePath }: { booking: Booking; basePath: string }) {
  const [caseRef, setCaseRef] = useState<string | null>(null);
  const form = useForm<z.infer<typeof changeSchema>>({ resolver: zodResolver(changeSchema), defaultValues: { reason: "", preferredDate: "", notes: "" } });
  const { errors, isSubmitting } = form.formState;
  const inAccount = basePath.startsWith("/account");
  const isFlight = booking.product === "flight";

  if (caseRef)
    return (
      <Panel title="Change request submitted" id="mg-change" icon={<Check className="h-5 w-5 text-emerald-600" />}>
        <p className="text-sm text-slate-700">
          Your case reference is <b className="font-mono text-navy-900">{caseRef}</b>. We’ll check availability with the {isFlight ? "airline" : "supplier"} and reply within 24
          hours with any fare difference. Nothing has been changed or charged yet.
        </p>
        <div className="mt-4 flex gap-2">
          <ButtonLink href={inAccount ? "/account/refunds" : basePath} variant="outline">
            {inAccount ? "View my requests" : "Back to booking"}
          </ButtonLink>
        </div>
      </Panel>
    );

  return (
    <Panel title="Request a change" id="mg-change" icon={<CalendarClock className="h-5 w-5" />}>
      <InlineNotice tone="info" className="mb-5" title="How changes work">
        {isFlight
          ? "Airline schedule and date changes depend on your fare rules and availability, so we raise a request rather than changing your ticket instantly."
          : "Date and room changes depend on availability with the supplier, so we raise a request first."}{" "}
        You’ll see the cost before anything is confirmed.
      </InlineNotice>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await new Promise((r) => setTimeout(r, 500));
          setCaseRef(submitChangeRequest(booking, values).id);
        })}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="What would you like to change?" htmlFor="ch-reason" error={errors.reason?.message} required>
          <Select id="ch-reason" invalid={!!errors.reason} {...form.register("reason")}>
            <option value="">Select</option>
            {CHANGE_REASONS[booking.product].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Preferred new date" htmlFor="ch-date" optional>
          <DateField
            label="Preferred date"
            variant="input"
            id="ch-date"
            value={form.watch("preferredDate")}
            onChange={(iso) => form.setValue("preferredDate", iso)}
            minDate={addDaysISO(todayISO(), 1)}
          />
        </Field>
        <Field label="Details" htmlFor="ch-notes" error={errors.notes?.message} required className="sm:col-span-2">
          <Textarea id="ch-notes" rows={4} maxLength={500} invalid={!!errors.notes} placeholder="Tell us exactly what you need…" {...form.register("notes")} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            Submit change request
          </Button>
        </div>
      </form>
    </Panel>
  );
}

const TABS = {
  flight: [
    { id: "contact", label: "Contact" },
    { id: "meals", label: "Meals" },
    { id: "baggage", label: "Baggage" },
    { id: "seats", label: "Seats" },
    { id: "change", label: "Change request" },
  ],
  hotel: [
    { id: "contact", label: "Contact" },
    { id: "stay", label: "Stay preferences" },
    { id: "change", label: "Change request" },
  ],
  umrah: [
    { id: "contact", label: "Contact" },
    { id: "docs", label: "Visa documents" },
    { id: "change", label: "Change request" },
  ],
};

/** Self-service changes for one booking. `?tab=change` opens straight on the change request form. */
export function ManageBookingTabs({ booking, basePath, initialTab }: { booking: Booking; basePath: string; initialTab?: string }) {
  const [tab, setTab] = useState(initialTab === "change" ? "change" : "contact");
  return (
    <div>
      <BackLink href={basePath}>Back to booking {booking.id}</BackLink>
      <h1 className="text-2xl font-extrabold sm:text-[28px]">Manage booking</h1>
      <p className="mb-6 mt-1 text-slate-600">
        {booking.title} · <span className="font-mono">{booking.id}</span>
      </p>
      {isClosed(booking) ? (
        <InlineNotice tone="warning" title="This booking can no longer be changed">
          It is {booking.status}. You can still download documents or{" "}
          <Link href="/help/contact" className="font-bold underline">
            contact support
          </Link>
          .
        </InlineNotice>
      ) : (
        <>
          <TabList label="Manage booking" value={tab} onChange={setTab} tabs={TABS[booking.product]} className="mb-6" />
          <TabPanel id={tab} active>
            {tab === "contact" && <ContactTab booking={booking} />}
            {tab === "meals" && booking.product === "flight" && <MealsTab booking={booking} />}
            {tab === "baggage" && booking.product === "flight" && <BaggageTab booking={booking} />}
            {tab === "seats" && booking.product === "flight" && <SeatsTab booking={booking} />}
            {tab === "stay" && booking.product === "hotel" && <StayTab booking={booking} />}
            {tab === "docs" && booking.product === "umrah" && <VisaDocsTab booking={booking} />}
            {tab === "change" && <ChangeRequestTab booking={booking} basePath={basePath} />}
          </TabPanel>
        </>
      )}
    </div>
  );
}

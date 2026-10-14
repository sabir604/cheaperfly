"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, MapPin, Plane, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIRPORT_GROUPS, CABIN_LABEL } from "@/data/flights";
import { airportCityOf, getAirport, searchAirports } from "@/lib/engine/airports";
import { defaultFlightDates, flightSearchHref, validateFlightCriteria, type FlightFormErrors } from "@/lib/engine/criteria";
import { addDaysISO, formatDateMed } from "@/lib/engine/dates";
import { useUiStore } from "@/lib/stores/session";
import type { AirportSuggestion, Cabin, FlightCriteria, Pax, SearchLeg, TripType } from "@/lib/types/flights";
import { cn } from "@/lib/utils";
import { DateField, DualDateField } from "./date-field";
import { CabinPicker, PassengerPicker } from "./pickers";

/** "Dubai (DXB)" / "London (LON)" + "All airports · United Kingdom" for the closed combobox. */
function describeCode(code: string) {
  if (!code) return { primary: "", secondary: "" };
  const bare = code.replace("*", "");
  const group = AIRPORT_GROUPS[bare];
  if ((code.endsWith("*") || code === "LON" || code === "PAR" || code === "NYC") && group)
    return { primary: `${group.city} (${bare})`, secondary: `All airports · ${group.country}` };
  const airport = getAirport(bare);
  return airport ? { primary: `${airport.city} (${airport.iata})`, secondary: airport.name } : { primary: code, secondary: "" };
}

function AirportCombobox({
  id,
  label,
  value,
  onChange,
  error,
  placeholder = "City or airport",
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-listbox`;
  const shown = describeCode(value);
  const groups = useMemo(() => searchAirports(typing ? query : "", 7), [query, typing]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const close = () => {
    setOpen(false);
    setTyping(false);
    setQuery("");
  };
  const pick = (item: AirportSuggestion) => {
    onChange(item.code);
    close();
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open && flat[active]) {
        e.preventDefault();
        pick(flat[active]);
      }
    } else if (e.key === "Escape") close();
    else if (e.key === "Tab") {
      if (open && typing && flat[0]) onChange(flat[active]?.code ?? flat[0].code);
      close();
    }
  };

  let optionIndex = -1;
  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex w-full flex-col justify-center rounded-lg border bg-white px-3.5 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 hover:border-brand-400",
          "h-[62px]",
          error ? "border-red-400" : "border-slate-300",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={typing ? query : shown.primary}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            setActive(0);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setTyping(true);
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="w-full truncate bg-transparent text-[15px] font-semibold text-navy-900 outline-none placeholder:font-medium placeholder:text-slate-400"
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-[360px] w-[min(92vw,380px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-pop"
        >
          {!typing && <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Popular airports</p>}
          {groups.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No airports match “{query}”.
              <br />
              Try a city, airport name or 3-letter code.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.city} role="group" aria-label={g.city}>
              <div className="flex items-center gap-2 px-4 pb-1 pt-2.5 text-[13px] font-bold text-navy-900">
                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {g.city}
                <span className="font-normal text-slate-400">· {g.country}</span>
              </div>
              {g.items.map((item) => {
                const index = ++optionIndex;
                return (
                  <div
                    key={item.code}
                    id={`${id}-opt-${index}`}
                    role="option"
                    aria-selected={item.code === value}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(item);
                    }}
                    className={cn("flex cursor-pointer items-center gap-3 py-2 pl-9 pr-4", index === active ? "bg-brand-50" : "hover:bg-slate-50")}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-11 shrink-0 items-center justify-center rounded text-[12px] font-extrabold tracking-wide",
                        item.kind === "group" ? "bg-navy-900 text-white" : "bg-slate-100 text-navy-900",
                      )}
                    >
                      {item.iata}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.name}</span>
                    {item.kind === "airport" && <Plane className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TRIP_TYPES: { id: TripType; label: string }[] = [
  { id: "return", label: "Return" },
  { id: "oneway", label: "One way" },
  { id: "multicity", label: "Multi-city" },
];

const SWAP_BTN =
  "absolute z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-brand-600 shadow-sm hover:border-brand-500 sm:left-1/2 sm:right-auto sm:-translate-x-1/2";

export function FlightSearchForm({
  initial,
  className,
  submitLabel = "Search flights",
  onSubmitted,
  idPrefix = "fs",
}: {
  initial?: FlightCriteria;
  className?: string;
  submitLabel?: string;
  onSubmitted?: () => void;
  idPrefix?: string;
}) {
  const router = useRouter();
  const addRecent = useUiStore((s) => s.addRecent);
  const start = useMemo(() => {
    const d = defaultFlightDates();
    return initial
      ? {
          trip: initial.trip,
          legs: initial.trip === "return" ? [initial.legs[0]] : initial.legs,
          returnDate: initial.trip === "return" ? initial.legs[1].date : d.ret,
          pax: initial.pax,
          cabin: initial.cabin,
        }
      : {
          trip: "return" as TripType,
          legs: [{ from: "LON", to: "DXB", date: d.dep }],
          returnDate: d.ret as string | undefined,
          pax: { adults: 1, children: 0, infants: 0 },
          cabin: "economy" as Cabin,
        };
  }, [initial]);

  const [trip, setTrip] = useState<TripType>(start.trip);
  const [legs, setLegs] = useState<SearchLeg[]>(start.legs);
  const [returnDate, setReturnDate] = useState<string | undefined>(start.returnDate);
  const [pax, setPax] = useState<Pax>(start.pax);
  const [cabin, setCabin] = useState<Cabin>(start.cabin);
  const [errors, setErrors] = useState<FlightFormErrors | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patchLeg = (i: number, patch: Partial<SearchLeg>) => setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const swap = (i: number) => patchLeg(i, { from: legs[i].to, to: legs[i].from });
  const nextLeg = (): SearchLeg => {
    const last = legs[legs.length - 1];
    return { from: last.to, to: "", date: addDaysISO(last.date || defaultFlightDates().dep, 3) };
  };

  const changeTrip = (t: TripType) => {
    setTrip(t);
    setErrors(null);
    if (t === "multicity" && legs.length < 2) setLegs([...legs, nextLeg()]);
    if (t !== "multicity" && legs.length > 1) setLegs([legs[0]]);
    if (t === "return" && !returnDate) setReturnDate(addDaysISO(legs[0].date, 7));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const criteria: FlightCriteria = {
      trip,
      pax,
      cabin,
      legs: trip === "return" ? [legs[0], { from: legs[0].to, to: legs[0].from, date: returnDate ?? "" }] : legs,
    };
    const errs = validateFlightCriteria(criteria, trip === "return" ? [legs[0]] : undefined);
    setErrors(errs);
    if (errs) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${idPrefix}-form [aria-invalid="true"]`)?.focus());
      return;
    }
    setSubmitting(true);
    const first = criteria.legs[0];
    const label =
      trip === "multicity"
        ? criteria.legs.map((l) => airportCityOf(l.from)).join(" → ") + " → " + airportCityOf(criteria.legs[criteria.legs.length - 1].to)
        : `${airportCityOf(first.from)} ${trip === "return" ? "⇄" : "→"} ${airportCityOf(first.to)}`;
    const total = pax.adults + pax.children + pax.infants;
    addRecent({
      product: "flight",
      label,
      sublabel: `${formatDateMed(first.date)}${trip === "return" ? ` – ${formatDateMed(criteria.legs[1].date)}` : ""} · ${total} ${total === 1 ? "passenger" : "passengers"} · ${CABIN_LABEL[cabin]}`,
      href: flightSearchHref(criteria),
    });
    onSubmitted?.();
    router.push(flightSearchHref(criteria));
    setTimeout(() => setSubmitting(false), 1200);
  };

  const firstErr = errors?.legs[0];
  return (
    <form id={`${idPrefix}-form`} onSubmit={onSubmit} noValidate className={cn("w-full", className)} aria-label="Flight search">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div role="radiogroup" aria-label="Trip type" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TRIP_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={trip === t.id}
              onClick={() => changeTrip(t.id)}
              className={cn("rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors", trip === t.id ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-navy-900")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <PassengerPicker value={pax} onChange={setPax} error={errors?.pax} />
          <CabinPicker value={cabin} onChange={setCabin} />
        </div>
      </div>
      {errors?.pax && (
        <p role="alert" className="mb-2 text-xs font-medium text-red-600">
          {errors.pax}
        </p>
      )}
      {trip !== "multicity" ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.35fr)_auto]">
          <div className="relative grid gap-2 sm:grid-cols-2 sm:gap-3">
            <AirportCombobox id={`${idPrefix}-from`} label="From" value={legs[0].from} onChange={(from) => patchLeg(0, { from })} error={firstErr?.from} />
            <button
              type="button"
              onClick={() => swap(0)}
              aria-label="Swap origin and destination"
              className={cn(SWAP_BTN, "right-3 top-1/2 transition-transform hover:rotate-180")}
            >
              <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" />
            </button>
            <AirportCombobox id={`${idPrefix}-to`} label="To" value={legs[0].to} onChange={(to) => patchLeg(0, { to })} error={firstErr?.to} />
          </div>
          {trip === "return" ? (
            <DualDateField
              labelFrom="Departure"
              labelTo="Return"
              from={legs[0].date}
              to={returnDate}
              idFrom={`${idPrefix}-dep`}
              idTo={`${idPrefix}-ret`}
              errorFrom={firstErr?.date}
              errorTo={errors?.ret}
              onChange={(v) => {
                if (v.from) patchLeg(0, { date: v.from });
                setReturnDate(v.to);
              }}
            />
          ) : (
            <DateField label="Departure" value={legs[0].date} onChange={(date) => patchLeg(0, { date })} error={firstErr?.date} id={`${idPrefix}-dep`} />
          )}
          <Button type="submit" size="xl" loading={submitting} leftIcon={<Search className="h-5 w-5" />} className="h-[62px] lg:w-40">
            {submitLabel === "Search flights" ? "Search" : submitLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {legs.map((leg, i) => {
            const err = errors?.legs[i];
            return (
              <div key={i} className="grid items-start gap-3 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_auto]">
                <div className="relative grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <AirportCombobox id={`${idPrefix}-from-${i}`} label={`Flight ${i + 1} · From`} value={leg.from} onChange={(from) => patchLeg(i, { from })} error={err?.from} />
                  <button type="button" onClick={() => swap(i)} aria-label={`Swap flight ${i + 1} origin and destination`} className={cn(SWAP_BTN, "right-3 top-[31px]")}>
                    <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                  </button>
                  <AirportCombobox id={`${idPrefix}-to-${i}`} label="To" value={leg.to} onChange={(to) => patchLeg(i, { to })} error={err?.to} />
                </div>
                <DateField
                  label="Departure"
                  value={leg.date}
                  onChange={(date) => patchLeg(i, { date })}
                  error={err?.date}
                  id={`${idPrefix}-dep-${i}`}
                  minDate={i > 0 ? legs[i - 1].date : undefined}
                />
                <div className="flex h-[62px] items-center lg:w-40">
                  {legs.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-600"
                      aria-label={`Remove flight ${i + 1}`}
                    >
                      <X className="h-4 w-4" aria-hidden /> Remove
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button variant="subtle" size="md" type="button" disabled={legs.length >= 5} leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLegs([...legs, nextLeg()])}>
              Add another flight
            </Button>
            <Button type="submit" size="lg" loading={submitting} leftIcon={<Search className="h-5 w-5" />} className="sm:w-48">
              Search flights
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

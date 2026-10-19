"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Photo } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { DESTINATIONS, getDestination, type Destination } from "@/data/hotels";
import { defaultHotelDates, defaultOccupancy, hotelSearchHref } from "@/lib/engine/criteria";
import { formatDateMed, nightsBetween, todayISO } from "@/lib/engine/dates";
import type { HotelCriteria, Occupancy } from "@/lib/engine/hotels";
import { useUiStore } from "@/lib/stores/session";
import { isCalendarDate, validHotelCriteria } from "@cheaperfly/api-contracts/hotels";
import { cn, plural } from "@/lib/utils";
import { DualDateField } from "./date-field";
import { OccupancyPicker } from "./pickers";

function DestinationCombobox({ id, value, onChange, error }: { id: string; value: string; onChange: (id: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = getDestination(value);
  const q = query.trim().toLowerCase();
  const options = useMemo(
    () =>
      typing && q
        ? DESTINATIONS.filter((d) => d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q) || d.center.toLowerCase().includes(q))
        : DESTINATIONS,
    [q, typing],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setTyping(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (d: Destination) => {
    onChange(d.id);
    setOpen(false);
    setTyping(false);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex h-[62px] w-full flex-col justify-center rounded-lg border bg-white px-3.5 transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 hover:border-brand-400",
          error ? "border-red-400" : "border-slate-300",
        )}
      >
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Destination
        </label>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-invalid={!!error || undefined}
          aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="City, region or landmark"
          value={typing ? query : (selected?.label ?? "")}
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
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(options.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && open && options[active]) {
              e.preventDefault();
              pick(options[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          className="w-full truncate bg-transparent text-[15px] font-semibold text-navy-900 outline-none placeholder:font-medium placeholder:text-slate-400"
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label="Destinations"
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-[360px] w-[min(92vw,400px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-pop"
        >
          {options.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              We don’t have hotels for “{query}” yet. Try Dubai, London, Istanbul, Makkah, Madinah or Jeddah.
            </p>
          )}
          {options.map((d, i) => (
            <div
              key={d.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={d.id === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(d);
              }}
              className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", i === active ? "bg-brand-50" : "hover:bg-slate-50")}
            >
              <Photo src={d.image} alt="" className="h-11 w-11 shrink-0 rounded-md" sizes="44px" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  {d.city}, {d.country}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  Near {d.center} · {plural(d.properties, "property", "properties")}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HotelSearchForm({
  initial,
  defaultDestination,
  className,
  idPrefix = "hs",
  onSubmitted,
}: {
  initial?: HotelCriteria;
  defaultDestination?: string;
  className?: string;
  idPrefix?: string;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const addRecent = useUiStore((s) => s.addRecent);
  const defaults = useMemo(() => defaultHotelDates(), []);
  const [destination, setDestination] = useState(initial?.destination ?? defaultDestination ?? "dubai");
  const [checkIn, setCheckIn] = useState<string | undefined>(initial?.checkIn ?? defaults.checkIn);
  const [checkOut, setCheckOut] = useState<string | undefined>(initial?.checkOut ?? defaults.checkOut);
  const [occupancy, setOccupancy] = useState<Occupancy>(initial?.occupancy ?? defaultOccupancy());
  const [errors, setErrors] = useState<{ dest?: string; dates?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: { dest?: string; dates?: string } = {};
    const dest = getDestination(destination);
    if (!dest) errs.dest = "Choose a destination from the list";
    if (!checkIn) errs.dates = "Choose your check-in date";
    else if (checkIn < todayISO()) errs.dates = "Check-in can't be in the past";
    else if (!checkOut) errs.dates = "Choose your check-out date";
    else if (!isCalendarDate(checkIn)||!isCalendarDate(checkOut)) errs.dates="Choose valid calendar dates";
    else if (checkOut <= checkIn) errs.dates = "Check-out must be after check-in";
    else if (dest&&!validHotelCriteria({destination:dest.id,checkIn,checkOut,occupancy})) errs.dates="Choose a stay of up to 30 nights within the next year and valid guest counts and ages";
    setErrors(errs);
    if (errs.dest || errs.dates || !dest || !checkIn || !checkOut) return;
    const criteria: HotelCriteria = { destination: dest.id, checkIn, checkOut, occupancy };
    const nights = nightsBetween(checkIn, checkOut);
    addRecent({
      product: "hotel",
      label: `Hotels in ${dest.city}`,
      sublabel: `${formatDateMed(checkIn)} – ${formatDateMed(checkOut)} · ${plural(nights, "night")} · ${plural(occupancy.adults + occupancy.children, "guest")}`,
      href: hotelSearchHref(criteria),
    });
    setSubmitting(true);
    onSubmitted?.();
    router.push(hotelSearchHref(criteria));
    setTimeout(() => setSubmitting(false), 1200);
  };

  return (
    <form onSubmit={onSubmit} noValidate className={cn("w-full", className)} aria-label="Hotel search">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
        <DestinationCombobox id={`${idPrefix}-dest`} value={destination} onChange={setDestination} error={errors.dest} />
        <div>
          <DualDateField
            labelFrom="Check-in"
            labelTo="Check-out"
            from={checkIn}
            to={checkOut}
            minNights={1}
            idFrom={`${idPrefix}-in`}
            idTo={`${idPrefix}-out`}
            errorFrom={errors.dates}
            errorTo={errors.dates ? " " : undefined}
            onChange={(v) => {
              setCheckIn(v.from);
              setCheckOut(v.to);
            }}
          />
          {errors.dates && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {errors.dates}
            </p>
          )}
        </div>
        <OccupancyPicker value={occupancy} onChange={setOccupancy} />
        <Button type="submit" size="xl" loading={submitting} leftIcon={<Search className="h-5 w-5" />} className="h-[62px] lg:w-40">
          Search
        </Button>
      </div>
      {checkIn && checkOut && checkOut > checkIn && (
        <p className="mt-2 text-xs text-slate-500">{plural(nightsBetween(checkIn, checkOut), "night")} · Free cancellation available on most rooms</p>
      )}
    </form>
  );
}

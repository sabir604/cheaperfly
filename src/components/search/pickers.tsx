"use client";

import type { ReactNode } from "react";
import { Armchair, BedDouble, Check, ChevronDown, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { CABIN_LABEL } from "@/data/flights";
import type { Occupancy } from "@/lib/engine/hotels";
import type { Cabin, Pax } from "@/lib/types/flights";
import { cn, plural } from "@/lib/utils";

const STEP_BTN =
  "flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-navy-900 transition-colors hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-slate-300 disabled:hover:text-navy-900";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9,
  label,
  description,
  disableInc,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  description?: ReactNode;
  disableInc?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-semibold text-navy-900">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`} className={STEP_BTN}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-5 text-center text-[15px] font-bold tnum" aria-live="polite">
          {value}
        </span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max || disableInc} aria-label={`Increase ${label}`} className={STEP_BTN}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CabinPicker({ value, onChange }: { value: Cabin; onChange: (c: Cabin) => void }) {
  const cabins = Object.keys(CABIN_LABEL) as Cabin[];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Cabin class: ${CABIN_LABEL[value]}`}
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-slate-100 data-[state=open]:bg-slate-100"
        >
          <Armchair className="h-4 w-4 text-slate-500" aria-hidden />
          {CABIN_LABEL[value]}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" aria-label="Cabin class">
        <div role="radiogroup" aria-label="Cabin class">
          {cabins.map((c) => (
            <PopoverClose asChild key={c}>
              <button
                type="button"
                role="radio"
                aria-checked={value === c}
                onClick={() => onChange(c)}
                className={cn("flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-slate-50", value === c && "bg-brand-50 font-semibold text-brand-700")}
              >
                {CABIN_LABEL[c]}
                {value === c && <Check className="h-4 w-4" aria-hidden />}
              </button>
            </PopoverClose>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function OccupancyPicker({ value, onChange, error }: { value: Occupancy; onChange: (o: Occupancy) => void; error?: string }) {
  const guests = value.adults + value.children;
  const update = (patch: Partial<Occupancy>) => {
    const next = { ...value, ...patch };
    if (next.adults < next.rooms) next.adults = next.rooms;
    if (next.childAges.length !== next.children) next.childAges = Array.from({ length: next.children }, (_, i) => next.childAges[i] ?? 8);
    onChange(next);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Guests and rooms: ${plural(guests, "guest")}, ${plural(value.rooms, "room")}`}
          className={cn(
            "flex h-[62px] w-full flex-col items-start justify-center rounded-lg border bg-white px-3.5 text-left transition-colors hover:border-brand-400 data-[state=open]:border-brand-500 data-[state=open]:ring-2 data-[state=open]:ring-brand-500/20",
            error ? "border-red-400" : "border-slate-300",
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Guests &amp; rooms</span>
          <span className="flex items-center gap-2 text-[15px] font-semibold text-navy-900">
            <BedDouble className="h-4 w-4 text-slate-400" aria-hidden />
            {plural(guests, "guest")}, {plural(value.rooms, "room")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[80vh] w-[min(92vw,340px)] overflow-y-auto p-4" aria-label="Guests and rooms">
        <Stepper label="Rooms" value={value.rooms} min={1} max={5} onChange={(rooms) => update({ rooms })} />
        <Stepper label="Adults" description="18 years and over" value={value.adults} min={value.rooms} max={4 * value.rooms} onChange={(adults) => update({ adults })} />
        <Stepper label="Children" description="0–17 years" value={value.children} min={0} max={6} onChange={(children) => update({ children })} />
        {value.children > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            {value.childAges.map((age, i) => (
              <label key={i} className="text-xs font-semibold text-slate-600">
                Child {i + 1} age
                <select
                  value={age}
                  onChange={(e) => {
                    const childAges = [...value.childAges];
                    childAges[i] = Number(e.target.value);
                    onChange({ ...value, childAges });
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                >
                  {Array.from({ length: 18 }, (_, a) => (
                    <option key={a} value={a}>
                      {a === 0 ? "Under 1" : `${a} years`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        <PopoverClose asChild>
          <Button block size="md" className="mt-3">
            Done
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

export function PassengerPicker({ value, onChange, error, variant = "pill" }: { value: Pax; onChange: (p: Pax) => void; error?: string; variant?: "pill" | "cell" }) {
  const seated = value.adults + value.children;
  const label = plural(seated + value.infants, "passenger");
  const update = (patch: Partial<Pax>) => {
    const next = { ...value, ...patch };
    if (next.infants > next.adults) next.infants = next.adults;
    onChange(next);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Passengers: ${label}`}
          className={cn(
            "flex items-center gap-2 text-sm font-semibold text-navy-900 transition-colors",
            variant === "pill"
              ? "h-10 rounded-lg px-3 hover:bg-slate-100 data-[state=open]:bg-slate-100"
              : "h-[62px] w-full flex-col items-start justify-center rounded-lg border border-slate-300 bg-white px-3.5 hover:border-brand-400",
            error && "text-red-600",
          )}
        >
          {variant === "cell" ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Passengers</span>
              <span className="text-[15px]">{label}</span>
            </>
          ) : (
            <>
              <Users className="h-4 w-4 text-slate-500" aria-hidden />
              {label}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,320px)] p-4" aria-label="Passengers">
        <Stepper label="Adults" description="12 years and over" value={value.adults} min={1} max={9 - value.children} onChange={(adults) => update({ adults })} />
        <Stepper label="Children" description="2–11 years" value={value.children} min={0} max={9 - value.adults} onChange={(children) => update({ children })} />
        <Stepper
          label="Infants"
          description="Under 2, on lap"
          value={value.infants}
          min={0}
          max={value.adults}
          onChange={(infants) => update({ infants })}
          disableInc={value.infants >= value.adults}
        />
        {value.infants >= value.adults && value.infants > 0 && <p className="mt-1 text-xs text-amber-700">Each infant must travel with an adult.</p>}
        {seated >= 9 && <p className="mt-1 text-xs text-amber-700">Maximum 9 seated passengers per booking.</p>}
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        <PopoverClose asChild>
          <Button block size="md" className="mt-3">
            Done
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

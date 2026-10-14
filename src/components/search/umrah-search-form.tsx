"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addMonths, format, startOfMonth } from "date-fns";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UMRAH_DEPARTURE_CITIES } from "@/data/umrah";
import { serializeUmrahCriteria } from "@/lib/engine/criteria";
import { useUiStore } from "@/lib/stores/session";
import type { Pax } from "@/lib/types/flights";
import { cn } from "@/lib/utils";
import { PassengerPicker } from "./pickers";

export interface UmrahSearchCriteria {
  departureCity?: string;
  month?: string;
  nights?: string;
  adults?: number;
  children?: number;
  infants?: number;
}

function SelectCell({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="relative flex h-[62px] flex-col justify-center rounded-lg border border-slate-300 bg-white px-3.5 transition-colors focus-within:border-umrah-700 focus-within:ring-2 focus-within:ring-umrah-700/20 hover:border-umrah-600">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-transparent pr-6 text-[15px] font-semibold text-navy-900 outline-none">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}

export function UmrahSearchForm({
  initial,
  className,
  idPrefix = "us",
  target = "/umrah/packages",
}: {
  initial?: UmrahSearchCriteria;
  className?: string;
  idPrefix?: string;
  target?: string;
}) {
  const router = useRouter();
  const addRecent = useUiStore((s) => s.addRecent);
  const [city, setCity] = useState(initial?.departureCity ?? "London");
  const [month, setMonth] = useState(initial?.month ?? "any");
  const [nights, setNights] = useState(initial?.nights ?? "any");
  const [pax, setPax] = useState<Pax>({ adults: initial?.adults ?? 2, children: initial?.children ?? 0, infants: initial?.infants ?? 0 });
  const months = useMemo(() => {
    const start = startOfMonth(new Date());
    return Array.from({ length: 10 }, (_, i) => {
      const m = addMonths(start, i + 1);
      return { value: format(m, "yyyy-MM"), label: format(m, "MMMM yyyy") };
    });
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const href = `${target}?${serializeUmrahCriteria({ departureCity: city, month, nights, ...pax })}`;
    const total = pax.adults + pax.children + pax.infants;
    addRecent({
      product: "umrah",
      label: `Umrah from ${city}`,
      sublabel: `${month === "any" ? "Any month" : (months.find((m) => m.value === month)?.label ?? month)} · ${nights === "any" ? "Any duration" : `${nights} nights`} · ${total} ${total === 1 ? "traveller" : "travellers"}`,
      href,
    });
    router.push(href);
  };

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)} aria-label="Umrah package search">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <SelectCell id={`${idPrefix}-city`} label="Departing from" value={city} onChange={setCity}>
          {UMRAH_DEPARTURE_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectCell>
        <SelectCell id={`${idPrefix}-month`} label="Travel month" value={month} onChange={setMonth}>
          <option value="any">Any month</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </SelectCell>
        <SelectCell id={`${idPrefix}-nights`} label="Duration" value={nights} onChange={setNights}>
          <option value="any">Any duration</option>
          <option value="7">7 nights</option>
          <option value="10">10 nights</option>
          <option value="14">14 nights</option>
        </SelectCell>
        <PassengerPicker value={pax} onChange={setPax} variant="cell" />
        <Button type="submit" variant="gold" size="xl" leftIcon={<Search className="h-5 w-5" />} className="h-[62px] lg:w-44">
          Find packages
        </Button>
      </div>
    </form>
  );
}

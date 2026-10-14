import { Fragment } from "react";
import { ArrowRight, Briefcase, Clock, Luggage, Moon, Plane } from "lucide-react";
import { AirlineMark } from "@/components/brand";
import { formatDayLong, formatDayShort, formatDuration, formatTime } from "@/lib/engine/dates";
import type { Fare, FlightLeg, Segment } from "@/lib/types/flights";
import { cn } from "@/lib/utils";

function SegmentBlock({ seg }: { seg: Segment }) {
  return (
    <div className="grid grid-cols-[70px_16px_1fr] gap-x-3">
      <div className="text-right">
        <p className="text-[15px] font-bold text-navy-900 tnum">{formatTime(seg.departLocal)}</p>
        <p className="text-[11px] text-slate-500">{formatDayShort(seg.departLocal)}</p>
        <div className="h-[70px]" />
        <p className="text-[15px] font-bold text-navy-900 tnum">{formatTime(seg.arriveLocal)}</p>
        <p className="text-[11px] text-slate-500">{formatDayShort(seg.arriveLocal)}</p>
      </div>
      <div className="flex flex-col items-center pt-1.5">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-500 bg-white" />
        <span className="w-px flex-1 bg-brand-200" />
        <span className="mb-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
      </div>
      <div>
        <p className="text-sm font-bold text-navy-900">
          {seg.fromCity} ({seg.from}) <span className="font-medium text-slate-500">· {seg.fromName}</span>
        </p>
        <p className="text-xs text-slate-500">Terminal {seg.terminalFrom}</p>
        <div className="my-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-semibold text-navy-900">
            <AirlineMark code={seg.airlineCode} size="sm" /> {seg.airlineName} {seg.flightNumber}
          </span>
          <span>{seg.aircraft}</span>
          <span className="capitalize">{seg.cabin.replace("_", " ")}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden /> {formatDuration(seg.durationMin)}
          </span>
        </div>
        <p className="text-sm font-bold text-navy-900">
          {seg.toCity} ({seg.to}) <span className="font-medium text-slate-500">· {seg.toName}</span>
        </p>
        <p className="text-xs text-slate-500">Terminal {seg.terminalTo}</p>
      </div>
    </div>
  );
}

export function BaggageChips({ fare, className }: { fare: Pick<Fare, "cabinBag" | "checkedBag">; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600", className)}>
      <span className="flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Cabin {fare.cabinBag}
      </span>
      <span className={cn("flex items-center gap-1.5", fare.checkedBag.pieces === 0 && "text-amber-700")}>
        <Luggage className="h-3.5 w-3.5" aria-hidden />{" "}
        {fare.checkedBag.pieces > 0 ? `${fare.checkedBag.pieces} × ${fare.checkedBag.kg} kg checked` : "No checked bag"}
      </span>
    </div>
  );
}

function stopsLabel(leg: FlightLeg): string {
  if (leg.stops === 0) return "Direct";
  return `${leg.stops} stop${leg.stops > 1 ? "s" : ""} · ${leg.layovers.map((l) => l.airport).join(", ")}`;
}

/** Compact one-line leg: airline, departure → duration/stops → arrival. */
export function LegRow({ leg, label, showAirline = true, className }: { leg: FlightLeg; label?: string; showAirline?: boolean; className?: string }) {
  const first = leg.segments[0];
  const airlines = Array.from(new Set(leg.segments.map((s) => s.airlineName)));
  return (
    <div className={cn("grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 sm:grid-cols-[150px_1fr]", className)}>
      {showAirline ? (
        <div className="col-span-2 flex items-center gap-2.5 sm:col-span-1">
          <AirlineMark code={first.airlineCode} size="md" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-navy-900">{airlines.join(" + ")}</p>
            <p className="truncate text-xs text-slate-500">
              {label ? `${label} · ` : ""}
              {leg.segments.map((s) => s.flightNumber).join(", ")}
            </p>
          </div>
        </div>
      ) : (
        <p className="col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-1">{label}</p>
      )}
      <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
        <div className="min-w-[64px] text-left">
          <p className="text-[19px] font-extrabold leading-none text-navy-900 tnum">{formatTime(leg.departLocal)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">{leg.from}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center px-1">
          <p className="text-[11px] font-medium text-slate-500 tnum">{formatDuration(leg.durationMin)}</p>
          <div className="relative my-1 flex w-full items-center">
            <span className="h-px flex-1 bg-slate-300" />
            {leg.layovers.map((_, i) => (
              <span key={i} className="mx-2 h-2 w-2 rounded-full border-2 border-slate-400 bg-white" />
            ))}
            {leg.layovers.length > 0 && <span className="h-px flex-1 bg-slate-300" />}
            <Plane className="absolute -right-1 h-3.5 w-3.5 rotate-90 text-slate-400" aria-hidden />
          </div>
          <p className={cn("truncate text-[11px] font-semibold", leg.stops === 0 ? "text-emerald-700" : "text-amber-700")}>{stopsLabel(leg)}</p>
        </div>
        <div className="min-w-[64px] text-right">
          <p className="text-[19px] font-extrabold leading-none text-navy-900 tnum">
            {formatTime(leg.arriveLocal)}
            {leg.arrivalDayOffset > 0 && <sup className="ml-0.5 text-[10px] font-bold text-red-600">+{leg.arrivalDayOffset}</sup>}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">{leg.to}</p>
        </div>
      </div>
    </div>
  );
}

/** Full itinerary for a leg: every segment with terminals, plus layover notes between them. */
export function LegTimeline({ leg, title }: { leg: FlightLeg; title?: string }) {
  return (
    <div>
      {title && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-bold text-navy-900">
          {title}
          <span className="font-medium text-slate-500">
            {formatDayLong(leg.departLocal)} · {leg.fromCity} <ArrowRight className="mx-0.5 inline h-3 w-3" aria-hidden /> {leg.toCity} ·{" "}
            {formatDuration(leg.durationMin)}
          </span>
        </div>
      )}
      <div className="space-y-3">
        {leg.segments.map((seg, i) => {
          const lay = leg.layovers[i];
          return (
            <Fragment key={seg.id}>
              <SegmentBlock seg={seg} />
              {lay && (
                <div className="ml-[86px] flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {lay.overnight ? <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                  <span>
                    <b>{formatDuration(lay.durationMin)} layover</b> in {lay.city} ({lay.airport})
                    {lay.overnight ? " · overnight connection" : ""}
                    {lay.durationMin > 300 ? " · long connection" : ""}
                  </span>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { Fragment, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Seat, SeatMap } from "@/lib/engine/flights/seatmap";
import { cn } from "@/lib/utils";

export interface SeatPriceRange {
  standard: string;
  premium: string;
  legroom: string;
}

function LegendItem({ swatch, label, mark }: { swatch: string; label: string; mark?: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-slate-600">
      <span className={cn("flex h-[22px] w-[20px] items-center justify-center rounded-t-md rounded-b-[3px] border-[1.5px] border-b-[3px] text-[9px] font-bold", swatch)}>{mark}</span>
      {label}
    </li>
  );
}

export function SeatLegend({ priceRange }: { priceRange: SeatPriceRange }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Seat map legend">
      <LegendItem swatch="border-slate-300 bg-white" label={`Standard ${priceRange.standard}`} />
      <LegendItem swatch="border-amber-300 bg-amber-50" label={`Preferred ${priceRange.premium}`} />
      <LegendItem swatch="border-brand-300 bg-brand-50 text-brand-700" label={`Extra legroom ${priceRange.legroom}`} mark="+" />
      <LegendItem swatch="border-brand-600 bg-brand-500 text-white" label="Your selection" />
      <LegendItem swatch="border-slate-200 bg-slate-200 text-slate-400" label="Occupied" mark={<X className="h-2.5 w-2.5" />} />
    </ul>
  );
}

const SEAT_W = 38;
const AISLE_W = 26;

/**
 * Fuselage-shaped seat map. `selections` maps passenger → seat on this segment; seats held by
 * another passenger are disabled until that passenger is selected. `scale` zooms the whole map.
 */
export function SeatMapView({
  map,
  selections,
  owners,
  activePaxId,
  onPick,
  onHover,
  scale = 1,
}: {
  map: SeatMap;
  selections: Record<string, { seat: string }>;
  owners: { paxId: string; initials: string }[];
  activePaxId: string | null;
  onPick: (seat: Seat) => void;
  onHover: (seat: Seat | null) => void;
  scale?: number;
}) {
  const holder = new Map<string, string>();
  for (const [paxId, s] of Object.entries(selections)) holder.set(s.seat, paxId);
  const initialsOf = (paxId: string) => owners.find((o) => o.paxId === paxId)?.initials;
  const layout = map.layout;
  const width = SEAT_W * layout.join("").length + (layout.length - 1) * AISLE_W + 2 * SEAT_W + 24;

  return (
    <div style={{ width: width * scale }} className="mx-auto">
      <div style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div className="relative mx-auto h-24 overflow-hidden" style={{ width }}>
          <div className="absolute inset-x-0 top-0 h-48 rounded-t-[160px] border-x-2 border-t-2 border-slate-300 bg-white" />
          <p className="absolute inset-x-0 bottom-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Front of aircraft</p>
        </div>
        <div className="relative border-x-2 border-slate-300 bg-white px-3 pb-6" style={{ width }}>
          <div className="sticky top-0 z-10 -mx-3 mb-1 flex items-center justify-center gap-0 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur">
            <span className="w-[38px]" />
            {layout.map((group, gi) => (
              <Fragment key={group}>
                {gi > 0 && <span className="w-[26px]" />}
                {group.split("").map((letter) => (
                  <span key={letter} className="w-[38px] text-center text-[11px] font-bold text-slate-400">
                    {letter}
                  </span>
                ))}
              </Fragment>
            ))}
            <span className="w-[38px]" />
          </div>
          <div role="grid" aria-label={`Seat map for ${map.aircraft}`}>
            {map.rows.map((row) => (
              <div key={row.row} role="row" className="relative">
                {row.exit && (
                  <div className="my-1 flex items-center justify-between px-1 text-[10px] font-extrabold uppercase tracking-wider text-red-500" aria-hidden>
                    <span className="rounded bg-red-50 px-1.5 py-0.5">Exit</span>
                    <span className="mx-2 h-px flex-1 bg-red-100" />
                    <span className="rounded bg-red-50 px-1.5 py-0.5">Exit</span>
                  </div>
                )}
                {row.wing && <span className="absolute -left-[22px] top-1 h-9 w-3 rounded-l bg-slate-200" aria-hidden />}
                {row.wing && <span className="absolute -right-[22px] top-1 h-9 w-3 rounded-r bg-slate-200" aria-hidden />}
                <div className="flex items-center py-0.5">
                  <span className="w-[38px] text-center text-[11px] font-semibold text-slate-400 tnum">{row.row}</span>
                  {layout.map((group, gi) => (
                    <Fragment key={group}>
                      {gi > 0 && <span className="w-[26px]" />}
                      {group.split("").map((letter) => {
                        const seat = row.seats.find((s) => s.letter === letter)!;
                        const heldBy = holder.get(seat.id);
                        const state = seat.occupied ? "occupied" : heldBy ? (heldBy === activePaxId ? "mine" : "other") : "free";
                        const label = `Seat ${seat.id}, ${seat.window ? "window, " : seat.aisle ? "aisle, " : ""}${
                          seat.kind === "extra_legroom" ? "extra legroom, " : seat.kind === "premium" ? "preferred, " : ""
                        }${seat.occupied ? "occupied" : heldBy ? `selected by ${initialsOf(heldBy)}` : seat.price ? `${seat.price} pounds` : "free"}`;
                        return (
                          <span key={letter} className="flex w-[38px] justify-center">
                            <button
                              type="button"
                              role="gridcell"
                              aria-label={label}
                              aria-pressed={state === "mine" || state === "other"}
                              disabled={seat.occupied || state === "other"}
                              onClick={() => onPick(seat)}
                              onMouseEnter={() => onHover(seat)}
                              onMouseLeave={() => onHover(null)}
                              onFocus={() => onHover(seat)}
                              onBlur={() => onHover(null)}
                              className={cn(
                                "relative flex h-[34px] w-[30px] items-center justify-center rounded-t-lg rounded-b-[5px] border-[1.5px] border-b-[4px] text-[10px] font-bold transition-colors",
                                state === "occupied"
                                  ? "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400"
                                  : state === "mine"
                                    ? "border-brand-600 bg-brand-500 text-white shadow-md"
                                    : state === "other"
                                      ? "border-navy-700 bg-navy-800 text-white"
                                      : seat.kind === "extra_legroom"
                                        ? "border-brand-300 bg-brand-50 text-brand-700 hover:border-brand-500 hover:bg-brand-100"
                                        : seat.kind === "premium"
                                          ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-500 hover:bg-amber-100"
                                          : "border-slate-300 bg-white text-slate-600 hover:border-brand-500 hover:bg-brand-50",
                              )}
                            >
                              {state === "occupied" ? <X className="h-3 w-3" aria-hidden /> : heldBy ? initialsOf(heldBy) : seat.kind === "extra_legroom" ? "+" : ""}
                            </button>
                          </span>
                        );
                      })}
                    </Fragment>
                  ))}
                  <span className="w-[38px] text-center text-[11px] font-semibold text-slate-400 tnum">{row.row}</span>
                </div>
                {row.label && row.label !== "Exit row" && <p className="pb-0.5 text-center text-[10px] font-semibold text-slate-400">{row.label} — extra legroom</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="h-16 overflow-hidden" style={{ width }}>
          <div className="h-32 rounded-b-[120px] border-x-2 border-b-2 border-slate-300 bg-white" />
        </div>
      </div>
    </div>
  );
}

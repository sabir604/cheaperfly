import { Landmark } from "lucide-react";
import { getDestination } from "@/data/hotels";
import { cn } from "@/lib/utils";

export interface MapPin {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface MapStyle {
  water?: string;
  water2?: string;
  roads: string[];
  landmarks: { name: string; x: number; y: number }[];
}

/** Illustrative (not to scale) destination map with price pins positioned in percent. */
export function HotelMap({
  destinationId,
  pins,
  activeId,
  onSelect,
  className,
  compact,
  ariaLabel = "Map of hotels",
}: {
  destinationId: string;
  pins: MapPin[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const style = getDestination(destinationId)?.mapStyle as MapStyle | undefined;
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-slate-200 bg-[#eef2e8]", className)} role="group" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="100" height="100" fill="#eaeee3" />
        <circle cx="72" cy="30" r="14" fill="#dbe7d0" />
        <circle cx="26" cy="72" r="11" fill="#dbe7d0" />
        {style?.roads.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#ffffff"
            strokeWidth={i === 0 ? 2.4 : 1.6}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: i === 0 ? 7 : 4 }}
          />
        ))}
        {style?.water && <path d={style.water} fill="#b9d6ea" />}
        {style?.water2 && <path d={style.water2} fill="#b9d6ea" />}
      </svg>
      {style?.landmarks.map((l) => (
        <span key={l.name} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${l.x}%`, top: `${l.y}%` }}>
          <Landmark className="mx-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
          {!compact && <span className="mt-0.5 block whitespace-nowrap text-[10px] font-semibold text-slate-500">{l.name}</span>}
        </span>
      ))}
      {pins.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect?.(p.id)}
            aria-pressed={active}
            aria-label={`Hotel ${p.label}`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-extrabold shadow-md transition-all after:absolute after:left-1/2 after:top-full after:-mt-px after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-b after:border-r",
              active
                ? "z-20 scale-110 border-navy-900 bg-navy-900 text-white after:border-navy-900 after:bg-navy-900"
                : "z-10 border-slate-300 bg-white text-navy-900 hover:z-20 hover:scale-105 hover:border-brand-500 after:border-slate-300 after:bg-white",
            )}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.label}
          </button>
        );
      })}
      <p className="absolute bottom-2 left-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 backdrop-blur">Illustrative map · not to scale</p>
    </div>
  );
}

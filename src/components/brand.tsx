import { Star } from "lucide-react";
import { AIRLINE_MAP } from "@/data/flights";
import { cn } from "@/lib/utils";

/** Paper-plane mark + "Cheaperfly" wordmark. */
export function CheaperflyLogo({ className, light, compact }: { className?: string; light?: boolean; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="9" fill="#0B6FF4" />
        <path
          d="M9 24.5 30.5 9.5c.8-.6 1.8.4 1.2 1.2L20.5 27.5l-2.3 5.2c-.3.7-1.3.7-1.6 0l-1.8-5.2-5.4-1.8c-.7-.3-.7-1.2 0-1.5Z"
          fill="#fff"
        />
        <path d="m18.2 26.5 3.7-5.7" stroke="#0B6FF4" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className={cn("text-[21px] font-extrabold leading-none tracking-tight", light ? "text-white" : "text-navy-900")}>
          Cheaper<span className={light ? "text-brand-300" : "text-brand-500"}>fly</span>
        </span>
      )}
    </span>
  );
}

/** Two-letter airline code on the airline's brand colour. */
export function AirlineMark({ code, size = "md", className }: { code: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const airline = AIRLINE_MAP[code];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-extrabold tracking-tight text-white",
        { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-[12px]", lg: "h-12 w-12 text-sm" }[size],
        className,
      )}
      style={{ background: airline?.color ?? "#334155" }}
    >
      {code}
    </span>
  );
}

/** Review score chip, e.g. "8.6 Excellent · 1,204 reviews". */
export function ScoreBadge({ score, label, reviews, className }: { score: number; label?: string; reviews?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 min-w-9 items-center justify-center rounded-md rounded-bl-none bg-navy-900 px-1.5 text-sm font-bold text-white tnum">{score.toFixed(1)}</span>
      {(label || reviews !== undefined) && (
        <span className="leading-tight">
          {label && <span className="block text-[13px] font-semibold text-navy-900">{label}</span>}
          {reviews !== undefined && <span className="block text-xs text-slate-500">{reviews.toLocaleString("en-GB")} reviews</span>}
        </span>
      )}
    </div>
  );
}

export function Stars({ count, className, size = 14 }: { count: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-400", className)} role="img" aria-label={`${count} star hotel`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} style={{ width: size, height: size }} className="fill-current" aria-hidden />
      ))}
    </span>
  );
}

import type { CSSProperties, ElementType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_TONES = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  navy: "bg-navy-900 text-white",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  umrah: "bg-umrah-50 text-umrah-800",
  gold: "bg-gold-100 text-gold-600",
  outline: "border border-slate-200 bg-white text-slate-600",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", className, children, icon }: { tone?: BadgeTone; className?: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-4", BADGE_TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Card({ className, children, as: Tag = "div", padded = true }: { className?: string; children?: ReactNode; as?: ElementType; padded?: boolean }) {
  return <Tag className={cn("rounded-xl border border-slate-200 bg-white", padded && "p-5", className)}>{children}</Tag>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-slate-200", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{children}</kbd>;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  light,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  light?: boolean;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("eyebrow mb-1.5", light ? "text-brand-200" : "text-brand-600")}>{eyebrow}</p>}
        <h2 className={cn("text-2xl font-bold sm:text-[28px]", light ? "!text-white" : "")}>{title}</h2>
        {subtitle && <p className={cn("mt-1.5 text-[15px]", light ? "text-slate-300" : "text-slate-600")}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn("skeleton", className)} style={style} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} aria-label="Loading" />;
}

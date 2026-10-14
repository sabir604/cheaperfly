import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTICE_TONES = {
  info: "border-brand-200 bg-brand-50 text-brand-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
} as const;

export function InlineNotice({
  tone = "info",
  title,
  children,
  className,
  icon,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div role={tone === "error" ? "alert" : "note"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-[13px] leading-relaxed", NOTICE_TONES[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}

const STATE_TONES = {
  neutral: "bg-slate-100 text-slate-500",
  error: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
} as const;

/** Empty, error and success states: icon disc, title, description, actions. */
export function StateView({
  icon,
  title,
  description,
  actions,
  tone = "neutral",
  className,
  compact,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: keyof typeof STATE_TONES;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 text-center", compact ? "py-8" : "py-14", className)}
    >
      <span className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-full", STATE_TONES[tone])}>
        {icon ?? (tone === "error" || tone === "warning" ? <AlertTriangle className="h-7 w-7" /> : <SearchX className="h-7 w-7" />)}
      </span>
      <h3 className="text-lg font-bold text-navy-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-slate-600">{description}</p>}
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}

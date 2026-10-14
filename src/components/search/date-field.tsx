"use client";

import { useState, type ReactNode } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { inputClass } from "@/components/ui/form";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { parseDate, toISODate } from "@/lib/engine/dates";
import { cn } from "@/lib/utils";

type Mode = "single" | "range";

function MonthGrid({
  month,
  from,
  to,
  hover,
  setHover,
  onPick,
  minDate,
  maxDate,
  mode,
}: {
  month: Date;
  from?: Date;
  to?: Date;
  hover?: Date;
  setHover: (d: Date | undefined) => void;
  onPick: (d: Date) => void;
  minDate: Date;
  maxDate?: Date;
  mode: Mode;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  // While picking a range end, the hovered day previews the range.
  const end = to ?? (mode === "range" && from && hover && hover > from ? hover : undefined);
  return (
    <div className="w-[280px] shrink-0">
      <div className="mb-2 text-center text-sm font-bold text-navy-900">{format(month, "MMMM yyyy")}</div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" role="grid" aria-label={format(month, "MMMM yyyy")}>
        {days.map((day) => {
          if (!isSameMonth(day, month)) return <div key={day.toISOString()} className="h-10" />;
          const disabled = isBefore(day, minDate) || (!!maxDate && day > maxDate);
          const isFrom = !!from && isSameDay(day, from);
          const isEnd = !!end && isSameDay(day, end);
          const inRange = !!from && !!end && isWithinInterval(day, { start: from, end }) && !isFrom && !isEnd;
          const today = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              role="gridcell"
              className={cn("relative h-10", inRange && "bg-brand-50", isFrom && end && "rounded-l-full bg-brand-50", isEnd && "rounded-r-full bg-brand-50")}
            >
              <button
                type="button"
                disabled={disabled}
                aria-label={format(day, "EEEE d MMMM yyyy")}
                aria-pressed={isFrom || isEnd}
                onClick={() => onPick(day)}
                onMouseEnter={() => setHover(day)}
                onFocus={() => setHover(day)}
                className={cn(
                  "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-medium tnum transition-colors",
                  disabled ? "cursor-not-allowed text-slate-300 line-through decoration-slate-200" : "text-slate-800 hover:bg-brand-100",
                  today && !isFrom && !isEnd && "ring-1 ring-inset ring-slate-300",
                  (isFrom || isEnd) && "bg-brand-500 font-bold text-white hover:bg-brand-500",
                )}
              >
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One or two month grids with previous/next navigation. Range mode previews the range on hover. */
export function CalendarView({
  from,
  to,
  mode,
  onPick,
  minDate,
  maxDate,
  initialMonth,
  months = 2,
}: {
  from?: Date;
  to?: Date;
  mode: Mode;
  onPick: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  initialMonth?: Date;
  months?: 1 | 2;
}) {
  const min = startOfDay(minDate ?? new Date());
  const [month, setMonth] = useState(() => startOfMonth(initialMonth ?? from ?? min));
  const [hover, setHover] = useState<Date>();
  const canGoBack = !isBefore(subMonths(month, 1), startOfMonth(min));
  const grid = { from, to, hover, setHover, onPick, minDate: min, maxDate, mode };
  return (
    <div onMouseLeave={() => setHover(undefined)}>
      <div className="relative flex gap-8">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="absolute -left-1 -top-1 z-10 rounded-full p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="absolute -right-1 -top-1 z-10 rounded-full p-1.5 text-slate-600 hover:bg-slate-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <MonthGrid month={month} {...grid} />
        {months === 2 && (
          <div className="hidden sm:block">
            <MonthGrid month={addMonths(month, 1)} {...grid} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The trigger button: a 62px labelled "cell" (search forms) or an input-styled button. */
export function DateCell({
  label,
  variant,
  text,
  placeholder,
  error,
  id,
  icon,
  disabled,
  className,
  open,
}: {
  label: string;
  variant: "cell" | "input";
  text?: string;
  placeholder?: string;
  error?: string;
  id?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  open?: boolean;
}) {
  if (variant === "cell")
    return (
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={!!error || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "group flex h-[62px] w-full flex-col items-start justify-center rounded-lg border bg-white px-3.5 text-left transition-colors hover:border-brand-400 focus-visible:border-brand-500 disabled:opacity-50",
          error ? "border-red-400" : "border-slate-300",
          open && "border-brand-500 ring-2 ring-brand-500/20",
          className,
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={cn("mt-0.5 flex w-full items-center gap-2 truncate text-[15px] font-semibold", text ? "text-navy-900" : "text-slate-400")}>
          {icon}
          <span className="truncate">{text ?? placeholder ?? "Select date"}</span>
        </span>
      </button>
    );
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-invalid={!!error || undefined}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(inputClass, "flex items-center gap-2 text-left", !text && "text-slate-400", className)}
    >
      {icon ?? <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />}
      <span className="truncate">{text ?? placeholder ?? "Select date"}</span>
    </button>
  );
}

/** Single date in a popover. Values are `YYYY-MM-DD`. */
export function DateField({
  label,
  value,
  onChange,
  variant = "cell",
  placeholder,
  minDate,
  maxDate,
  error,
  id,
  className,
  icon,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (iso: string) => void;
  variant?: "cell" | "input";
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  error?: string;
  id?: string;
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <DateCell
            label={label}
            variant={variant}
            text={selected ? format(selected, "EEE d MMM yyyy") : undefined}
            placeholder={placeholder}
            error={error}
            id={id}
            icon={icon}
            disabled={disabled}
            className={className}
            open={open}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,340px)] p-4 sm:w-auto" aria-label={`Choose ${label}`}>
        <CalendarView
          mode="single"
          from={selected}
          months={1}
          minDate={parseDate(minDate) ?? new Date()}
          maxDate={parseDate(maxDate)}
          onPick={(d) => {
            onChange(toISODate(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Two date cells sharing one range calendar (departure/return, check-in/check-out).
 * Picking a start clears an end that is now before it, then asks for the end date.
 */
export function DualDateField({
  labelFrom,
  labelTo,
  from,
  to,
  onChange,
  errorFrom,
  errorTo,
  minNights = 0,
  idFrom,
  idTo,
  disabledTo,
}: {
  labelFrom: string;
  labelTo: string;
  from?: string;
  to?: string;
  onChange: (v: { from?: string; to?: string }) => void;
  errorFrom?: string;
  errorTo?: string;
  minNights?: number;
  idFrom?: string;
  idTo?: string;
  disabledTo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<"from" | "to">("from");
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const onPick = (d: Date) => {
    if (picking === "from" || !fromDate) {
      const keepTo = !toDate || isBefore(toDate, d) || (minNights > 0 && isSameDay(toDate, d)) ? undefined : toISODate(toDate);
      onChange({ from: toISODate(d), to: keepTo });
      if (keepTo) setOpen(false);
      else setPicking("to");
      return;
    }
    if (isBefore(d, fromDate) || (minNights > 0 && isSameDay(d, fromDate))) {
      onChange({ from: toISODate(d), to: undefined });
      setPicking("to");
      return;
    }
    onChange({ from: toISODate(fromDate), to: toISODate(d) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div
            onClick={() => {
              setPicking("from");
              setOpen(true);
            }}
          >
            <DateCell
              label={labelFrom}
              variant="cell"
              id={idFrom}
              text={fromDate ? format(fromDate, "EEE d MMM") : undefined}
              placeholder="Add date"
              error={errorFrom}
              open={open && picking === "from"}
            />
          </div>
          <div
            onClick={() => {
              if (disabledTo) return;
              setPicking("to");
              setOpen(true);
            }}
          >
            <DateCell
              label={labelTo}
              variant="cell"
              id={idTo}
              text={toDate ? format(toDate, "EEE d MMM") : undefined}
              placeholder={disabledTo ? "One way" : "Add date"}
              error={errorTo}
              disabled={disabledTo}
              open={open && picking === "to"}
            />
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[min(92vw,340px)] p-4 sm:w-auto" aria-label="Choose dates">
        <CalendarView mode="range" from={fromDate} to={toDate} onPick={onPick} minDate={new Date()} />
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {picking === "from" ? `Select your ${labelFrom.toLowerCase()} date.` : `Now select your ${labelTo.toLowerCase()} date.`}
        </p>
      </PopoverContent>
    </Popover>
  );
}

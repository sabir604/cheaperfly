"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className,
  icon,
  meta,
}: {
  title: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: ReactNode;
  meta?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn("border-b border-slate-200 last:border-b-0", className)}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-navy-900 hover:text-brand-700"
        >
          <span className="flex items-center gap-2.5">
            {icon}
            {title}
          </span>
          <span className="flex items-center gap-3">
            {meta}
            <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
          </span>
        </button>
      </h3>
      <div id={id} role="region" hidden={!open} className="pb-5 text-[14px] leading-relaxed text-slate-600">
        {children}
      </div>
    </div>
  );
}

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

/** ARIA tablist with arrow/Home/End keyboard support. "underline" or "pill" styling. */
export function TabList({
  tabs,
  value,
  onChange,
  variant = "underline",
  className,
  label,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pill";
  className?: string;
  label?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("scrollbar-none flex overflow-x-auto", variant === "underline" ? "gap-6 border-b border-slate-200" : "gap-1 rounded-lg bg-slate-100 p-1", className)}
    >
      {tabs.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors",
              variant === "underline"
                ? cn("-mb-px border-b-2 px-0.5 pb-3 pt-2", selected ? "border-brand-500 text-brand-600" : "border-transparent text-slate-600 hover:text-navy-900")
                : cn("rounded-md px-3.5 py-1.5", selected ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-navy-900"),
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn("rounded px-1.5 text-[11px] font-bold", selected ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600")}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, active, children, className }: { id: string; active: boolean; children: ReactNode; className?: string }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className={className}>
      {children}
    </div>
  );
}

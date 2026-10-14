"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BedDouble, Moon, Plane } from "lucide-react";
import { useFeatures } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { FlightSearchForm } from "./flight-search-form";
import { HotelSearchForm } from "./hotel-search-form";
import { UmrahSearchForm } from "./umrah-search-form";

type Tab = "flights" | "hotels" | "umrah";

const TABS = [
  { id: "flights" as const, label: "Flights", icon: Plane, blurb: "Compare fares across airlines" },
  { id: "hotels" as const, label: "Hotels", icon: BedDouble, blurb: "Free cancellation on most stays" },
  { id: "umrah" as const, label: "Umrah", icon: Moon, blurb: "Complete packages, visa included" },
];

/** Tabbed Flights / Hotels / Umrah search card. Tabs follow the admin feature flags. */
export function BookingEngine({
  defaultTab = "flights",
  hotelDestination,
  className,
  onDark = true,
}: {
  defaultTab?: Tab;
  hotelDestination?: string;
  className?: string;
  onDark?: boolean;
}) {
  const features = useFeatures();
  const tabs = useMemo(() => TABS.filter((t) => features[t.id]), [features]);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const current = tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (tabs.length === 0)
    return (
      <div className={className}>
        <div className="rounded-xl bg-white p-6 text-center shadow-pop">
          <p className="text-[15px] font-bold text-navy-900">Online booking is temporarily unavailable</p>
          <p className="mt-1 text-sm text-slate-600">Please contact support and we will help you book.</p>
        </div>
      </div>
    );

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(index + dir + tabs.length) % tabs.length];
    setTab(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label="What are you booking?" className="flex items-end gap-1.5">
        {tabs.map((t, i) => {
          const selected = current === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              type="button"
              id={`engine-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`engine-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-t-xl px-5 py-3 text-[15px] font-bold transition-all",
                selected
                  ? "bg-white text-navy-900 shadow-[0_-4px_14px_-6px_rgba(7,31,66,0.25)]"
                  : onDark
                    ? "bg-white/10 text-white backdrop-blur hover:bg-white/20"
                    : "bg-slate-200/70 text-slate-600 hover:bg-slate-200",
              )}
            >
              <t.icon className={cn("h-[18px] w-[18px]", selected && (t.id === "umrah" ? "text-umrah-700" : "text-brand-500"))} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="rounded-b-xl rounded-tr-xl bg-white p-4 shadow-pop sm:p-5 lg:p-6">
        <div role="tabpanel" id="engine-panel-flights" aria-labelledby="engine-tab-flights" hidden={current !== "flights"}>
          {current === "flights" && <FlightSearchForm idPrefix="home-fs" />}
        </div>
        <div role="tabpanel" id="engine-panel-hotels" aria-labelledby="engine-tab-hotels" hidden={current !== "hotels"}>
          {current === "hotels" && <HotelSearchForm idPrefix="home-hs" defaultDestination={hotelDestination} />}
        </div>
        <div role="tabpanel" id="engine-panel-umrah" aria-labelledby="engine-tab-umrah" hidden={current !== "umrah"}>
          {current === "umrah" && <UmrahSearchForm idPrefix="home-us" />}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Armchair, ArrowRight, Info, Minus, Plus, X } from "lucide-react";
import { useCurrency } from "@/components/money";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/primitives";
import { SEAT_KIND_LABEL } from "@/data/extras";
import { formatTime } from "@/lib/engine/dates";
import type { Seat, SeatKind, SeatMap } from "@/lib/engine/flights/seatmap";
import { flightService } from "@/lib/engine/flights/service";
import type { PriceBreakdown } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import type { FlightDraft, FlightPassenger } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { FlightGuard } from "./flight-guard";
import { SeatLegend, SeatMapView } from "./seat-map";
import { FlightTripSummary, MobileSummaryBar, SummaryPanel } from "./summary";

/** "AK" from the passenger's name, or "P1" before names exist. */
function paxInitials(p: Pick<FlightPassenger, "firstName" | "lastName">, index: number) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase() || `P${index + 1}`;
}

function SeatsPage({ draft, breakdown }: { draft: FlightDraft; breakdown: PriceBreakdown }) {
  const router = useRouter();
  const { gbp, fmt } = useCurrency();
  const setSeat = useDraftsStore((s) => s.setSeat);
  const setSeatsSkipped = useDraftsStore((s) => s.setSeatsSkipped);
  const fare = draft.offer.fares.find((f) => f.id === draft.fareId)!;
  const segments = useMemo(() => draft.offer.legs.flatMap((leg, legIndex) => leg.segments.map((seg) => ({ seg, legIndex }))), [draft.offer]);
  const seated = draft.passengers.filter((p) => p.type !== "infant");
  const infants = draft.passengers.filter((p) => p.type === "infant");
  const [segIndex, setSegIndex] = useState(0);
  const [activePax, setActivePax] = useState<string | null>(seated[0]?.id ?? null);
  const [maps, setMaps] = useState<Record<string, SeatMap>>({});
  const [hovered, setHovered] = useState<Seat | null>(null);
  // Small phones start zoomed out. This step only mounts client-side, after hydration.
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 480 ? 0.82 : 1));
  const segment = segments[segIndex].seg;
  const map = maps[segment.id];

  useEffect(() => {
    if (maps[segment.id]) return;
    let cancelled = false;
    flightService.getSeatMap(segment, fare).then((m) => {
      if (!cancelled) setMaps((all) => ({ ...all, [segment.id]: m }));
    });
    return () => {
      cancelled = true;
    };
  }, [segment, fare, maps]);

  const selections = draft.extras.seats[segment.id] ?? {};
  const owners = seated.map((p, i) => ({ paxId: p.id, initials: paxInitials(p, i) }));
  const priceRange = useMemo(() => {
    if (!map) return { standard: "", premium: "", legroom: "" };
    const range = (kind: SeatKind) => {
      const prices = map.rows
        .flatMap((r) => r.seats)
        .filter((s) => s.kind === kind && !s.occupied)
        .map((s) => s.price);
      if (!prices.length) return "";
      const lo = Math.min(...prices);
      const hi = Math.max(...prices);
      return lo === 0 && hi === 0 ? "· free" : lo === hi ? `· ${fmt(gbp(lo))}` : `· ${fmt(gbp(lo))}–${fmt(gbp(hi))}`;
    };
    return { standard: range("standard"), premium: range("premium"), legroom: range("extra_legroom") };
  }, [map, fmt, gbp]);
  const seatCount = Object.values(draft.extras.seats).reduce((n, perPax) => n + Object.keys(perPax).length, 0);

  const pick = (seat: Seat) => {
    if (!activePax || seat.occupied) return;
    if (selections[activePax]?.seat === seat.id) {
      setSeat(segment.id, activePax, null);
      return;
    }
    setSeat(segment.id, activePax, { seat: seat.id, price: seat.price, kind: seat.kind });
    // Move on to the next passenger without a seat on this flight.
    const next = seated.find((p) => p.id !== activePax && !selections[p.id]);
    if (next) setActivePax(next.id);
  };

  const summary = <FlightTripSummary offer={draft.offer} pax={draft.criteria.pax} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Choose your seats</h1>
        <p className="mt-1 text-slate-600">
          {fare.seatSelection === "paid"
            ? "Seats are optional and charged per flight."
            : fare.seatSelection === "standard_free"
              ? "Standard seats are included in your fare — upgrades are charged."
              : "Standard and preferred seats are included in your fare."}{" "}
          You can skip this and pick at check-in.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Flights" className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
            {segments.map(({ seg }, i) => {
              const count = Object.keys(draft.extras.seats[seg.id] ?? {}).length;
              return (
                <button
                  key={seg.id}
                  role="tab"
                  type="button"
                  aria-selected={i === segIndex}
                  onClick={() => setSegIndex(i)}
                  className={cn(
                    "shrink-0 rounded-lg border px-4 py-2.5 text-left transition-colors",
                    i === segIndex ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className="block text-[13px] font-bold text-navy-900">
                    {seg.from} → {seg.to}
                    {count > 0 && <span className="ml-2 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] text-white">{count}</span>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {seg.flightNumber} · {formatTime(seg.departLocal)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-[13px] font-bold text-navy-900">Choosing a seat for</p>
            <div role="radiogroup" aria-label="Passenger" className="flex flex-wrap gap-2">
              {seated.map((p, i) => {
                const chosen = selections[p.id];
                const active = activePax === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setActivePax(p.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-left transition-colors",
                      active ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", active ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600")}>
                      {paxInitials(p, i)}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[13px] font-bold text-navy-900">{p.firstName ? p.firstName : `Passenger ${i + 1}`}</span>
                      <span className="block text-xs text-slate-500">
                        {chosen ? `Seat ${chosen.seat}${chosen.price ? ` · ${fmt(gbp(chosen.price))}` : " · included"}` : "No seat yet"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {infants.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Info className="h-3.5 w-3.5" aria-hidden /> Infants travel on an adult’s lap and don’t need their own seat.
              </p>
            )}
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <SeatLegend priceRange={priceRange} />
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Zoom">
              <Button size="iconSm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-xs font-semibold tnum text-slate-600">{Math.round(100 * zoom)}%</span>
              <Button size="iconSm" variant="ghost" onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mb-2 min-h-6 rounded-md bg-navy-900 px-3 py-1.5 text-[13px] text-white" aria-live="polite">
            {hovered ? (
              <span>
                <b>Seat {hovered.id}</b> · {hovered.window ? "Window" : hovered.aisle ? "Aisle" : "Middle"} · {SEAT_KIND_LABEL[hovered.kind]} ·{" "}
                {hovered.occupied ? "Occupied" : hovered.price ? fmt(gbp(hovered.price)) : "Included"}
              </span>
            ) : (
              <span className="text-slate-300">
                {segment.aircraft} · {segment.fromCity} → {segment.toCity} · select a seat to see its details
              </span>
            )}
          </div>
          <div className="max-h-[72vh] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4" tabIndex={0} aria-label="Seat map, scrollable">
            {map ? (
              <SeatMapView map={map} selections={selections} owners={owners} activePaxId={activePax} onPick={pick} onHover={setHovered} scale={zoom} />
            ) : (
              <div className="mx-auto w-[360px] max-w-full space-y-2 py-6">
                <Skeleton className="mx-auto h-24 w-full rounded-t-[120px]" />
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            )}
          </div>
          {seatCount === 0 && (
            <InlineNotice className="mt-4" tone="info" icon={<Armchair className="h-4 w-4" />}>
              No seats chosen yet. Skipping is fine — airlines allocate free seats at check-in, but you may not sit together.
            </InlineNotice>
          )}
          <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/flights/book/extras" className="text-center text-sm font-semibold text-slate-600 hover:text-brand-600">
              ← Back to extras
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setSeatsSkipped(true);
                  router.push("/flights/book/review");
                }}
              >
                Skip seat selection
              </Button>
              <Button size="lg" onClick={() => router.push("/flights/book/review")} rightIcon={<ArrowRight className="h-4 w-4" />}>
                {seatCount ? "Continue to review" : "Continue without seats"}
              </Button>
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <SummaryPanel header={summary} breakdown={breakdown}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Your seats</p>
              {seatCount === 0 ? (
                <p className="text-sm text-slate-500">None selected</p>
              ) : (
                <ul className="space-y-2">
                  {segments.flatMap(({ seg }) =>
                    Object.entries(draft.extras.seats[seg.id] ?? {}).map(([paxId, s]) => {
                      const p = draft.passengers.find((x) => x.id === paxId);
                      return (
                        <li key={`${seg.id}-${paxId}`} className="flex items-center justify-between gap-2 text-[13px]">
                          <span>
                            <b className="text-navy-900">
                              {seg.from}→{seg.to}
                            </b>{" "}
                            · {p?.firstName || paxId} · Seat <b>{s.seat}</b>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="font-semibold tnum">{s.price ? fmt(gbp(s.price)) : "Free"}</span>
                            <button
                              type="button"
                              onClick={() => setSeat(seg.id, paxId, null)}
                              aria-label={`Remove seat ${s.seat}`}
                              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </li>
                      );
                    }),
                  )}
                </ul>
              )}
            </SummaryPanel>
          </div>
        </div>
      </div>
      <MobileSummaryBar breakdown={breakdown}>
        <SummaryPanel header={summary} breakdown={breakdown} className="border-0" />
      </MobileSummaryBar>
    </div>
  );
}

/** Step 4: a seat map per segment; seats are optional. */
export function SeatsStep() {
  return <FlightGuard>{(ctx) => <SeatsPage {...ctx} />}</FlightGuard>;
}

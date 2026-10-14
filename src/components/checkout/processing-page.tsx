"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock } from "lucide-react";
import { createFlightBooking, createHotelBooking, createUmrahBooking } from "@/lib/engine/bookings/service";
import { paymentService } from "@/lib/engine/payment";
import { calcFlightPricing, calcHotelPricing, calcUmrahPricing } from "@/lib/engine/pricing";
import type { ServiceError } from "@/lib/engine/service";
import { getUmrahPackage, resolveUmrahPricingInput } from "@/lib/engine/umrah";
import { useBookingsStore } from "@/lib/stores/bookings";
import { useCheckoutStore, useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore, useUiStore } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

type Product = "flight" | "hotel" | "umrah";

const STEPS: Record<Product, string[]> = {
  flight: ["Authorising payment", "Securing your fare with the airline", "Confirming booking & issuing e-tickets"],
  hotel: ["Authorising payment", "Securing your room", "Confirming booking with the hotel"],
  umrah: ["Authorising payment", "Securing hotels, flights & transfers", "Confirming your Umrah package"],
};

/**
 * Charges the pending payment, creates the booking and moves on to the confirmation.
 * Opened directly (nothing pending) it goes to the last confirmation, or home.
 */
export function ProcessingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [stage, setStage] = useState(0);
  const [product, setProduct] = useState<Product>("flight");
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated || started.current) return;
    const checkout = useCheckoutStore.getState();
    const drafts = useDraftsStore.getState();
    const pending = checkout.pending;
    if (!pending) {
      router.replace(checkout.lastRef ? `/checkout/confirmation/${checkout.lastRef}` : "/");
      return;
    }
    const p = pending.product;
    const { flight, hotel, umrah } = drafts;
    if (!((p === "flight" && flight) || (p === "hotel" && hotel) || (p === "umrah" && umrah))) {
      router.replace(checkout.lastRef ? `/checkout/confirmation/${checkout.lastRef}` : "/checkout/payment");
      return;
    }
    started.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the hand-off from the store
    setProduct(p);
    const currency = useUiStore.getState().currency;
    const user = useSessionStore.getState().user;
    const member = !!user;
    let amount = 0;
    if (p === "flight" && flight) amount = calcFlightPricing({ offer: flight.offer, fareId: flight.fareId, extras: flight.extras, pax: flight.criteria.pax }, currency, member).total;
    if (p === "hotel" && hotel) amount = calcHotelPricing(hotel.quote, currency, member).total;
    if (p === "umrah" && umrah) amount = calcUmrahPricing(resolveUmrahPricingInput(getUmrahPackage(umrah.packageId)!, umrah.config), currency, member).total;

    paymentService
      .charge({
        method: pending.method,
        amount,
        currency,
        brand: pending.brand,
        last4: pending.last4,
        cardholder: pending.cardholder,
        outcome: pending.outcome,
        onStage: setStage,
      })
      .then((payment) => {
        const opts = { currency, member, userId: user?.id, payment };
        const booking = p === "flight" && flight ? createFlightBooking(flight, opts) : p === "hotel" && hotel ? createHotelBooking(hotel, opts) : createUmrahBooking(umrah!, opts);
        useBookingsStore.getState().grantGuestAccess(booking.id);
        const d = useDraftsStore.getState();
        if (p === "flight") d.clearFlight();
        if (p === "hotel") d.clearHotel();
        if (p === "umrah") d.clearUmrah();
        const c = useCheckoutStore.getState();
        c.setLastRef(booking.id);
        c.setPending(null);
        c.setFailure(null);
        setStage(3);
        setTimeout(() => router.replace(`/checkout/confirmation/${booking.id}`), 700);
      })
      .catch((err: ServiceError) => {
        const c = useCheckoutStore.getState();
        c.setFailure({ code: err.code ?? "payment_failed", message: err.message || "We couldn't take your payment." });
        c.setPending(null);
        router.replace("/checkout/payment");
      });
  }, [hydrated, router]);

  const steps = STEPS[product];
  const done = stage >= 3;
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card sm:p-10" role="status" aria-live="polite">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-4 border-brand-100" />
          <Loader2 className={cn("h-20 w-20 text-brand-500", done ? "hidden" : "animate-spin")} strokeWidth={1.5} aria-hidden />
          {done && (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-10 w-10" strokeWidth={3} aria-hidden />
            </span>
          )}
          {!done && <Lock className="absolute h-6 w-6 text-navy-900" aria-hidden />}
        </div>
        <h1 className="text-2xl font-extrabold">{done ? "Booking confirmed" : "Processing your booking"}</h1>
        <p className="mt-2 text-sm text-slate-600">{done ? "Taking you to your confirmation…" : "This takes a few seconds. Please don't close or refresh this page."}</p>
        <ol className="mt-8 space-y-3.5 text-left">
          {steps.map((label, i) => {
            const complete = stage > i;
            const current = stage === i;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    complete ? "bg-emerald-500 text-white" : current ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {complete ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : current ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : i + 1}
                </span>
                <span className={cn("text-[14px]", complete ? "font-medium text-slate-500" : current ? "font-bold text-navy-900" : "text-slate-400")}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

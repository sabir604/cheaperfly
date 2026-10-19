"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock } from "lucide-react";
import { checkoutService,checkoutFailureMessages } from "@/lib/engine/checkout";
import { useCheckoutStore,useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

type Product = "flight" | "hotel" | "umrah";

const STEPS: Record<Product, string[]> = {
  flight: ["Processing simulated payment", "Saving your booking", "Recording your simulated confirmation"],
  hotel: ["Processing simulated payment", "Saving your room selection", "Recording your simulated confirmation"],
  umrah: ["Processing simulated payment", "Saving hotels, flights & transfers", "Recording your simulated confirmation"],
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
  const [attempt,setAttempt]=useState(0);
  const [error,setError]=useState<string|null>(null);

  useEffect(() => {
    if (!hydrated || started.current) return;
    const checkout = useCheckoutStore.getState();
    const pending = checkout.pending;
    if (!pending) {
      router.replace(checkout.lastRef ? `/checkout/confirmation/${checkout.lastRef}` : "/");
      return;
    }
    const p=pending.product;
    if(!pending.request){checkout.setPending(null);router.replace('/checkout/payment');return;}
    started.current=true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- processing begins once per persisted attempt
    setProduct(p);
    const process=async()=>{
      let result;
      try {result=await checkoutService.status(pending.request.idempotencyKey);}
      catch(error){if(!(error instanceof Error)||!('status' in error)||error.status!==404)throw error;result=await checkoutService.create(pending.request);}
      if(result.state==='pending')result=await checkoutService.resume(result.id);
      if(result.state==='declined'){
        const c=useCheckoutStore.getState();const code=result.failureCode!;c.setFailure({code,message:checkoutFailureMessages[code]});c.setPending(null);router.replace('/checkout/payment');return;
      }
      if(result.state!=='confirmed'||!result.booking)throw new Error('The checkout is still pending. Please try again.');
      const d=useDraftsStore.getState();if(p==='flight'&&d.flight?.quote?.id===pending.request.quoteId)d.clearFlight();if(p==='hotel'&&d.hotel?.serverQuote?.id===pending.request.quoteId)d.clearHotel();if(p==='umrah'&&d.umrah?.serverQuote?.id===pending.request.quoteId)d.clearUmrah();
      const c=useCheckoutStore.getState();c.setLastRef(result.booking.id);c.setPending(null);c.setFailure(null);setStage(3);router.replace('/checkout/confirmation/'+result.booking.id);
    };
    process().catch((error:Error)=>{setError(error.message||'We could not check your payment. Retry to recover the same checkout.');started.current=false;});

  }, [hydrated, router, attempt]);

  const steps = STEPS[product];
  const done = stage >= 3;
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card sm:p-10" role="status" aria-live="polite">
        {error&&<InlineNotice tone="error">{error}<Button onClick={()=>{setError(null);setAttempt(n=>n+1);}}>Try again</Button></InlineNotice>}
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

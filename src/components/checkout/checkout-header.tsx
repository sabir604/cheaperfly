"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Lock, Phone } from "lucide-react";
import { CheaperflyLogo } from "@/components/brand";
import { useDraftsStore } from "@/lib/stores/drafts";
import { cn } from "@/lib/utils";

type Product = "flight" | "hotel" | "umrah";
interface Step {
  label: string;
  /** Empty means "back to this flight's fare page". */
  href: string;
  match: string[];
}

const STEPS: Record<Product, Step[]> = {
  flight: [
    { label: "Fare", href: "", match: ["/flights/fare"] },
    { label: "Passengers", href: "/flights/book/passengers", match: ["/flights/book/passengers"] },
    { label: "Extras", href: "/flights/book/extras", match: ["/flights/book/extras"] },
    { label: "Seats", href: "/flights/book/seats", match: ["/flights/book/seats"] },
    { label: "Review", href: "/flights/book/review", match: ["/flights/book/review"] },
    { label: "Payment", href: "/checkout/payment", match: ["/checkout/payment"] },
  ],
  hotel: [
    { label: "Guest details", href: "/hotels/book/guest", match: ["/hotels/book/guest"] },
    { label: "Review", href: "/hotels/book/review", match: ["/hotels/book/review"] },
    { label: "Payment", href: "/checkout/payment", match: ["/checkout/payment"] },
  ],
  umrah: [
    { label: "Customise", href: "/umrah/book/customize", match: ["/umrah/book/customize"] },
    { label: "Travellers", href: "/umrah/book/travellers", match: ["/umrah/book/travellers"] },
    { label: "Review", href: "/umrah/book/review", match: ["/umrah/book/review"] },
    { label: "Payment", href: "/checkout/payment", match: ["/checkout/payment"] },
  ],
};

/** Checkout header: logo, the product's step indicator (or "Step n of m" on mobile), Secure and Help. */
export function CheckoutHeader() {
  const pathname = usePathname();
  const active = useDraftsStore((s) => s.active);
  const product: Product | null = pathname.startsWith("/flights") ? "flight" : pathname.startsWith("/hotels") ? "hotel" : pathname.startsWith("/umrah") ? "umrah" : active;
  const inFlow = !pathname.startsWith("/checkout/processing") && !pathname.startsWith("/checkout/confirmation");
  const steps = product ? STEPS[product] : [];
  const current = steps.findIndex((s) => s.match.some((m) => pathname.startsWith(m)));
  const fareHref = useDraftsStore((s) => (s.flight ? `/flights/fare/${s.flight.offer.id}` : "/flights"));
  const showSteps = inFlow && steps.length > 0 && current >= 0;
  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" aria-label="Cheaperfly home" className="shrink-0">
          <CheaperflyLogo />
        </Link>
        {showSteps && (
          <>
            <nav aria-label="Booking progress" className="mx-auto hidden md:block">
              <ol className="flex items-center gap-2">
                {steps.map((step, i) => {
                  const done = i < current;
                  const isCurrent = i === current;
                  const body = (
                    <>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          done ? "bg-emerald-500 text-white" : isCurrent ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-500",
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          isCurrent ? "text-navy-900" : done ? "text-slate-700" : "text-slate-400",
                          !isCurrent && "hidden xl:inline",
                        )}
                      >
                        {step.label}
                      </span>
                    </>
                  );
                  return (
                    <li key={step.label} className="flex items-center gap-2">
                      {done ? (
                        <Link href={step.href || fareHref} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-100" aria-label={`Back to ${step.label}`}>
                          {body}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2 px-1 py-1" aria-current={isCurrent ? "step" : undefined}>
                          {body}
                        </span>
                      )}
                      {i < steps.length - 1 && <span className={cn("h-px w-4 xl:w-9", done ? "bg-emerald-400" : "bg-slate-200")} aria-hidden />}
                    </li>
                  );
                })}
              </ol>
            </nav>
            <p className="ml-auto text-[13px] font-semibold text-slate-600 md:hidden">
              Step {current + 1} of {steps.length} · <span className="text-navy-900">{steps[current].label}</span>
            </p>
          </>
        )}
        <div className={cn("hidden shrink-0 items-center gap-4 text-[13px] text-slate-600 lg:flex", !showSteps && "ml-auto")}>
          <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Secure
          </span>
          <Link href="/help/contact" className="flex items-center gap-1.5 font-semibold hover:text-brand-600">
            <Phone className="h-3.5 w-3.5" aria-hidden /> Help
          </Link>
        </div>
      </div>
      {showSteps && (
        <div className="h-1 bg-slate-100 md:hidden" aria-hidden>
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
        </div>
      )}
    </header>
  );
}

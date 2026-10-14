import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { FeatureRouteGate } from "@/components/layout/feature-route-gate";

/** Checkout frame: step header and a slim footer instead of the full site navigation. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CheckoutHeader />
      <main id="main" className="min-h-[70vh]">
        <FeatureRouteGate>{children}</FeatureRouteGate>
      </main>
      <footer className="no-print mt-16 border-t border-slate-200 bg-white">
        <div className="container-page flex flex-col gap-2 py-6 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> Prototype checkout — no real payment is taken and no ticket is issued.
          </p>
          <p className="flex gap-4">
            <Link className="hover:text-brand-600" href="/legal/terms">
              Terms
            </Link>
            <Link className="hover:text-brand-600" href="/legal/privacy">
              Privacy
            </Link>
            <Link className="hover:text-brand-600" href="/help">
              Help centre
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}

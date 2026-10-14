import type { ReactNode } from "react";
import Link from "next/link";
import { CheaperflyLogo } from "@/components/brand";
import { FeatureRouteGate } from "@/components/layout/feature-route-gate";
import { Photo } from "@/components/photo";
import { IMG } from "@/data/hotels";

/** Sign-in and registration frame: the form on the left, a Dubai skyline panel on the right from `lg` up. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Cheaperfly home">
            <CheaperflyLogo />
          </Link>
          <Link href="/help" className="text-sm font-semibold text-slate-600 hover:text-brand-600">
            Need help?
          </Link>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <FeatureRouteGate>{children}</FeatureRouteGate>
        </main>
        <footer className="text-center text-xs text-slate-500">
          <Link href="/legal/terms" className="hover:text-brand-600">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="hover:text-brand-600">
            Privacy
          </Link>{" "}
          · Prototype — no real accounts are created.
        </footer>
      </div>
      <aside className="relative hidden lg:block" aria-hidden>
        <Photo src={IMG.dubaiSkyline} className="absolute inset-0" sizes="45vw" priority scrim position="62% 50%" />
        <div className="absolute inset-x-0 bottom-0 z-10 p-12 text-white">
          <p className="eyebrow mb-3 text-brand-200">Your trips, in one place</p>
          <p className="max-w-md text-3xl font-extrabold leading-tight" style={{ letterSpacing: "-0.02em" }}>
            Every ticket, voucher and refund — always at your fingertips.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-200">
            <li>✓ Save travellers and book in seconds</li>
            <li>✓ Download e-tickets and invoices any time</li>
            <li>✓ 3% member saving on every booking</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

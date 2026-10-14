"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePause } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useFeatures, type FeatureKey } from "@/lib/site-config";

const GATES: { prefix: string; feature: FeatureKey; label: string }[] = [
  { prefix: "/flights", feature: "flights", label: "Flights" },
  { prefix: "/hotels", feature: "hotels", label: "Hotels" },
  { prefix: "/umrah", feature: "umrah", label: "Umrah" },
  { prefix: "/sign-up", feature: "customerSignup", label: "Account registration" },
];

/** Replaces a section's pages with a notice while the admin has that product switched off. */
export function FeatureRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const features = useFeatures();
  const gate = GATES.find((g) => pathname === g.prefix || pathname.startsWith(g.prefix + "/"));
  if (!gate || features[gate.feature]) return <>{children}</>;
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-16 text-center" role="status">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <CirclePause className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-extrabold text-navy-900">{gate.label} is temporarily unavailable</h1>
      <p className="mt-2 max-w-md text-[15px] text-slate-600">This part of Cheaperfly is switched off at the moment. Your existing bookings and account are not affected.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="primary">
          Back to home
        </ButtonLink>
        <ButtonLink href="/manage-booking" variant="outline">
          Manage a booking
        </ButtonLink>
      </div>
      <Link href="/help/contact" className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700">
        Contact support
      </Link>
    </div>
  );
}

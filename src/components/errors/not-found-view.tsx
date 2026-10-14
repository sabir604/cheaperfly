import Link from "next/link";
import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function NotFoundView() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <p className="eyebrow text-brand-600">Error 404</p>
      <h1 className="mt-2 text-[34px] font-extrabold">We can’t find that page</h1>
      <p className="mt-2 max-w-md text-slate-600">The link may be out of date or the page may have moved. Try one of these instead.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Go to homepage</ButtonLink>
        <ButtonLink href="/flights" variant="outline">
          Search flights
        </ButtonLink>
        <ButtonLink href="/manage-booking" variant="ghost">
          Manage a booking
        </ButtonLink>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Need help?{" "}
        <Link className="font-bold text-brand-600 underline" href="/help">
          Visit the help centre
        </Link>
      </p>
    </div>
  );
}

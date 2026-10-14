"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Armchair, CalendarClock, FileText, Search, Undo2 } from "lucide-react";
import { Photo } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { IMG } from "@/data/hotels";
import { bookingService } from "@/lib/engine/bookings/service";
import { useBookingsStore } from "@/lib/stores/bookings";

const lookupSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(5, "Enter your booking reference, e.g. CF-847291")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
  lastName: z.string().trim().min(2, "Enter the last name on the booking"),
});

const CAN_DO = [
  { icon: FileText, t: "Download tickets, vouchers and invoices", d: "Print or save as PDF whenever you need." },
  { icon: Armchair, t: "Add baggage, choose meals and seats", d: "Change extras yourself and see the price before you confirm." },
  { icon: CalendarClock, t: "Request date or room changes", d: "We'll check availability and come back with options." },
  { icon: Undo2, t: "Cancel or request a refund", d: "See your estimated refund before you submit." },
];

/** Guest lookup by reference (or PNR) and last name; a match grants this browser access to the booking. */
export function LookupForm() {
  const router = useRouter();
  const grantGuestAccess = useBookingsStore((s) => s.grantGuestAccess);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof lookupSchema>>({ resolver: zodResolver(lookupSchema), defaultValues: { reference: "", lastName: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-16">
      <div>
        <h1 className="text-[34px] font-extrabold leading-tight">Manage your booking</h1>
        <p className="mt-2 text-[16px] text-slate-600">Find a flight, hotel or Umrah booking with your reference and last name — no account needed.</p>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            await new Promise((r) => setTimeout(r, 700));
            const booking = bookingService.findByReference(values.reference, values.lastName);
            if (booking) {
              grantGuestAccess(booking.id);
              router.push(`/manage-booking/${booking.id}`);
              return;
            }
            setError(
              bookingService.get(values.reference.trim())
                ? "The last name doesn't match that booking. Enter the surname of the lead traveller exactly as on the ticket or voucher."
                : "We couldn't find a booking with those details. Check the reference (it starts with CF-) and the last name. In this prototype, bookings are stored on the device where they were made.",
            );
          })}
          className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 sm:p-7"
        >
          {error && (
            <InlineNotice tone="error" title="No matching booking">
              {error}
            </InlineNotice>
          )}
          <Field label="Booking reference or PNR" htmlFor="lk-ref" error={errors.reference?.message} required hint="Found in your confirmation email, e.g. CF-847291">
            <Input id="lk-ref" autoComplete="off" placeholder="CF-000000" className="uppercase" invalid={!!errors.reference} {...form.register("reference")} />
          </Field>
          <Field label="Last name" htmlFor="lk-last" error={errors.lastName?.message} required hint="As shown on the booking">
            <Input id="lk-last" autoComplete="family-name" invalid={!!errors.lastName} {...form.register("lastName")} />
          </Field>
          <Button type="submit" size="lg" block loading={isSubmitting} leftIcon={<Search className="h-4 w-4" />}>
            Find my booking
          </Button>
          <p className="text-center text-sm text-slate-600">
            Have an account?{" "}
            <Link href="/sign-in?next=/account/bookings" className="font-bold text-brand-600 hover:underline">
              Sign in to see all your bookings
            </Link>
          </p>
        </form>
      </div>
      <div className="hidden lg:block">
        <Photo src={IMG.airLounge} alt="A traveller waiting at an airport gate" className="mb-8 h-56 rounded-2xl" sizes="600px" />
        <h2 className="mb-4 text-lg font-bold">What you can do</h2>
        <ul className="space-y-4">
          {CAN_DO.map((item) => (
            <li key={item.t} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-navy-900">{item.t}</span>
                <span className="block text-sm text-slate-600">{item.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

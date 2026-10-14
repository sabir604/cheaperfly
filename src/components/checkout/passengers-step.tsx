"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import type { PriceBreakdown } from "@/lib/engine/pricing";
import { useAccountStore } from "@/lib/stores/bookings";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useSessionStore } from "@/lib/stores/session";
import type { FlightDraft, FlightPassenger } from "@/lib/types/booking";
import { contactSchema, makePassengerSchema } from "@/lib/validation";
import { FlightGuard } from "./flight-guard";
import { FlightTripSummary, MobileSummaryBar, SummaryPanel } from "./summary";
import { ContactFields, TravellerFields, type ProfilePick } from "./traveller-fields";

function PassengersForm({ draft, breakdown }: { draft: FlightDraft; breakdown: PriceBreakdown }) {
  const router = useRouter();
  const setPassengers = useDraftsStore((s) => s.setPassengers);
  const setContact = useDraftsStore((s) => s.setContact);
  const user = useSessionStore((s) => s.user);
  const profile = useSessionStore((s) => s.profile);
  const travellers = useAccountStore((s) => s.travellers);
  const upsertTraveller = useAccountStore((s) => s.upsertTraveller);
  const [saveFlags, setSaveFlags] = useState<Record<string, boolean>>({});
  const legs = draft.offer.legs;
  const firstDate = legs[0].departLocal.slice(0, 10);
  const lastDate = legs[legs.length - 1].arriveLocal.slice(0, 10);
  const schema = useMemo(() => z.object({ passengers: z.array(makePassengerSchema(firstDate, lastDate)), contact: contactSchema }), [firstDate, lastDate]);
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      passengers: draft.passengers.map((p) => ({ ...p, middleName: p.middleName ?? "", frequentFlyer: p.frequentFlyer ?? "", savedTravellerId: p.savedTravellerId ?? "" })),
      contact: draft.contact,
    },
  });
  const profilePick: ProfilePick | null =
    profile && profile.firstName && profile.lastName
      ? {
          id: "__profile",
          type: "adult",
          title: profile.title,
          firstName: profile.firstName,
          lastName: profile.lastName,
          dob: profile.dob,
          gender: profile.gender,
          nationality: profile.nationality,
          passportNo: profile.passportNo,
          passportCountry: profile.passportCountry,
          passportExpiry: profile.passportExpiry,
        }
      : null;
  const errorCount = Object.keys(form.formState.errors).length;

  const onSubmit = form.handleSubmit((values) => {
    const passengers = values.passengers.map((p) => ({ ...p, savedTravellerId: p.savedTravellerId || undefined })) as FlightPassenger[];
    setPassengers(passengers);
    setContact(values.contact);
    if (user) {
      let saved = 0;
      for (const p of passengers) {
        if (!saveFlags[p.id]) continue;
        const match = travellers.find(
          (t) => t.id === p.savedTravellerId || (t.firstName.toLowerCase() === p.firstName.toLowerCase() && t.lastName.toLowerCase() === p.lastName.toLowerCase() && t.dob === p.dob),
        );
        upsertTraveller({
          id: match?.id,
          type: p.type,
          title: p.title,
          firstName: p.firstName,
          middleName: p.middleName,
          lastName: p.lastName,
          dob: p.dob,
          gender: p.gender,
          nationality: p.nationality,
          passportNo: p.passportNo,
          passportCountry: p.passportCountry,
          passportExpiry: p.passportExpiry,
          frequentFlyer: p.frequentFlyer,
          relationship: match?.relationship,
        });
        saved++;
      }
      if (saved) toast.success(`${saved} traveller${saved > 1 ? "s" : ""} saved to your account`);
    }
    router.push("/flights/book/extras");
  });

  const summary = <FlightTripSummary offer={draft.offer} pax={draft.criteria.pax} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Who’s travelling?</h1>
        <p className="mt-1 text-slate-600">Enter details exactly as they appear on each passenger’s passport. Names can’t be changed after ticketing.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-5">
            {!user && (
              <InlineNotice tone="info" icon={<Info className="h-4 w-4" />}>
                Have a Cheaperfly account?{" "}
                <Link href="/sign-in?next=/flights/book/passengers" className="font-bold underline">
                  Sign in
                </Link>{" "}
                to use saved travellers and get 3% off the fare.
              </InlineNotice>
            )}
            {draft.passengers.map((p, i) => {
              const nth = draft.passengers.filter((q, j) => q.type === p.type && j <= i).length;
              return (
                <TravellerFields
                  key={p.id}
                  prefix={`passengers.${i}`}
                  index={i}
                  type={p.type}
                  title={`${p.type === "adult" ? "Adult" : p.type === "child" ? "Child" : "Infant"} ${nth}`}
                  lastTravelDate={lastDate}
                  saved={user ? travellers : undefined}
                  profilePick={user ? profilePick : null}
                  saveFlag={user ? { checked: !!saveFlags[p.id], onChange: (v) => setSaveFlags((f) => ({ ...f, [p.id]: v })) } : null}
                />
              );
            })}
            <ContactFields />
            {form.formState.isSubmitted && errorCount > 0 && (
              <InlineNotice tone="error" title="Please check the highlighted fields">
                Some information is missing or doesn’t look right. Fix the errors above and continue.
              </InlineNotice>
            )}
            <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/flights/fare/${draft.offer.id}`} className="text-center text-sm font-semibold text-slate-600 hover:text-brand-600">
                ← Back to fare selection
              </Link>
              <Button type="submit" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} loading={form.formState.isSubmitting}>
                Continue to extras
              </Button>
            </div>
          </form>
        </FormProvider>
        <div className="hidden lg:block">
          <SummaryPanel className="sticky top-24" header={summary} breakdown={breakdown} />
        </div>
      </div>
      <MobileSummaryBar breakdown={breakdown}>
        <SummaryPanel header={summary} breakdown={breakdown} className="border-0" />
      </MobileSummaryBar>
    </div>
  );
}

/** Step 2: passport details for each passenger, plus booking contact. */
export function PassengersStep() {
  return <FlightGuard>{(ctx) => <PassengersForm {...ctx} />}</FlightGuard>;
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Info } from "lucide-react";
import { useCurrency } from "@/components/money";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice, StateView } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { getHotel } from "@/data/hotels";
import { formatDateMed, formatDayLong } from "@/lib/engine/dates";
import { MEAL_LABEL } from "@/lib/engine/hotels";
import { calcHotelPricing, type PriceBreakdown } from "@/lib/engine/pricing";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import type { HotelDraft } from "@/lib/types/booking";
import { plural } from "@/lib/utils";
import { contactSchema, nameField } from "@/lib/validation";
import { KeyValue, ReviewSection, TermsBox } from "./review-parts";
import { HotelStaySummary } from "./stay-summaries";
import { MobileSummaryBar, SummaryPanel } from "./summary";
import { ContactFields } from "./traveller-fields";

/** The hotel checkout draft with its live price (3% member saving when signed in). */
export function useHotelDraft() {
  const hydrated = useHydrated();
  const draft = useDraftsStore((s) => s.hotel);
  const user = useSessionStore((s) => s.user);
  const { currency } = useCurrency();
  const breakdown = useMemo(() => (draft ? calcHotelPricing(draft.quote, currency, !!user) : null), [draft, currency, user]);
  return { hydrated, draft, breakdown, user };
}

/** Loading placeholder for the hotel and Umrah booking steps. */
export function StepSkeleton() {
  return (
    <div className="container-page py-10">
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

function HotelGuard({ children }: { children: (ctx: { draft: HotelDraft; breakdown: PriceBreakdown }) => ReactNode }) {
  const { hydrated, draft, breakdown } = useHotelDraft();
  if (!hydrated) return <StepSkeleton />;
  if (!draft || !breakdown || !getHotel(draft.hotelId))
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="Your booking session has expired"
          description="We couldn't find the room you were booking. Rates are only held briefly, so please search again."
          actions={<ButtonLink href="/hotels">Search hotels</ButtonLink>}
        />
      </div>
    );
  return <>{children({ draft, breakdown })}</>;
}

const hotelHref = (d: HotelDraft) => {
  const c = d.criteria;
  return `/hotels/${d.hotelId}?dest=${c.destination}&in=${c.checkIn}&out=${c.checkOut}&rooms=${c.occupancy.rooms}&adt=${c.occupancy.adults}&chd=${c.occupancy.children}`;
};

function Layout({ title, subtitle, draft, breakdown, children }: { title: string; subtitle: ReactNode; draft: HotelDraft; breakdown: PriceBreakdown; children: ReactNode }) {
  const header = <HotelStaySummary draft={draft} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-slate-600">{subtitle}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {children}
        <div className="hidden lg:block">
          <SummaryPanel className="sticky top-24" header={header} breakdown={breakdown} />
        </div>
      </div>
      <MobileSummaryBar breakdown={breakdown}>
        <SummaryPanel header={header} breakdown={breakdown} className="border-0" />
      </MobileSummaryBar>
    </div>
  );
}

const SPECIAL_REQUESTS = ["High floor", "Quiet room", "Late arrival", "Early check-in", "Extra bed / cot", "Adjoining rooms", "Non-smoking room", "Airport transfer enquiry"];
const ARRIVAL_TIMES = ["12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "20:00", "22:00", "00:00", "After midnight"];

const guestSchema = z.object({
  guests: z.array(z.object({ title: z.string().min(1, "Select a title"), firstName: nameField("first name"), lastName: nameField("last name"), isLead: z.boolean() })),
  contact: contactSchema,
  arrivalTime: z.string().min(1),
  specialRequests: z.array(z.string()),
  requestNotes: z.string().max(400, "Keep notes under 400 characters").optional(),
});
type GuestValues = z.infer<typeof guestSchema>;

function GuestForm({ draft, breakdown }: { draft: HotelDraft; breakdown: PriceBreakdown }) {
  const router = useRouter();
  const patchHotel = useDraftsStore((s) => s.patchHotel);
  const user = useSessionStore((s) => s.user);
  const profile = useSessionStore((s) => s.profile);
  const form = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    mode: "onTouched",
    defaultValues: {
      guests: draft.guests.map((g, i) => (i === 0 && !g.firstName && profile ? { ...g, title: profile.title, firstName: profile.firstName, lastName: profile.lastName } : g)),
      contact: draft.contact,
      arrivalTime: draft.arrivalTime,
      specialRequests: draft.specialRequests,
      requestNotes: draft.requestNotes,
    },
  });
  const errors = form.formState.errors;
  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is intentionally reactive here
  const requests = form.watch("specialRequests");
  const hotel = getHotel(draft.hotelId)!;

  const onSubmit = form.handleSubmit((v) => {
    patchHotel({ guests: v.guests, contact: v.contact, arrivalTime: v.arrivalTime, specialRequests: v.specialRequests, requestNotes: v.requestNotes ?? "" });
    router.push("/hotels/book/review");
  });

  return (
    <Layout title="Guest details" subtitle={`Almost there. Tell ${hotel.name} who’s staying.`} draft={draft} breakdown={breakdown}>
      <FormProvider {...form}>
        <form noValidate onSubmit={onSubmit} className="min-w-0 space-y-5">
          {!user && (
            <InlineNotice tone="info" icon={<Info className="h-4 w-4" />}>
              <Link href="/sign-in?next=/hotels/book/guest" className="font-bold underline">
                Sign in
              </Link>{" "}
              to pre-fill your details and save 3% on this stay.
            </InlineNotice>
          )}
          <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="gd-h">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 id="gd-h" className="text-[16px] font-bold text-navy-900">
                {draft.criteria.occupancy.rooms > 1 ? "Lead guest for each room" : "Lead guest"}
              </h2>
              <p className="text-xs text-slate-500">Names must match the ID shown at check-in.</p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              {draft.guests.map((_, i) => (
                <div key={i} className="grid gap-4 sm:grid-cols-6">
                  {draft.guests.length > 1 && <p className="text-sm font-bold text-navy-900 sm:col-span-6">Room {i + 1}</p>}
                  <Field label="Title" htmlFor={`g${i}-title`} error={errors.guests?.[i]?.title?.message} required className="sm:col-span-1">
                    <Select id={`g${i}-title`} invalid={!!errors.guests?.[i]?.title} {...form.register(`guests.${i}.title`)}>
                      <option value="">Select</option>
                      {["Mr", "Mrs", "Ms", "Miss", "Dr"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="First name" htmlFor={`g${i}-first`} error={errors.guests?.[i]?.firstName?.message} required className="sm:col-span-2">
                    <Input id={`g${i}-first`} autoComplete="given-name" invalid={!!errors.guests?.[i]?.firstName} {...form.register(`guests.${i}.firstName`)} />
                  </Field>
                  <Field label="Last name" htmlFor={`g${i}-last`} error={errors.guests?.[i]?.lastName?.message} required className="sm:col-span-3">
                    <Input id={`g${i}-last`} autoComplete="family-name" invalid={!!errors.guests?.[i]?.lastName} {...form.register(`guests.${i}.lastName`)} />
                  </Field>
                </div>
              ))}
            </div>
          </section>
          <ContactFields note="Your voucher and hotel messages are sent here" />
          <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="sr-h">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 id="sr-h" className="text-[16px] font-bold text-navy-900">
                Special requests <span className="text-xs font-normal text-slate-400">Optional</span>
              </h2>
              <p className="text-xs text-slate-500">Requests are passed to the hotel but can’t be guaranteed.</p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {SPECIAL_REQUESTS.map((r) => (
                  <Checkbox
                    key={r}
                    checked={requests.includes(r)}
                    onChange={(e) =>
                      form.setValue("specialRequests", e.target.checked ? [...requests, r] : requests.filter((x) => x !== r), {
                        shouldDirty: true,
                      })
                    }
                    label={r}
                  />
                ))}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label="Expected arrival time" htmlFor="arr" hint={`Check-in from ${hotel.checkIn}`}>
                  <Select id="arr" {...form.register("arrivalTime")}>
                    {ARRIVAL_TIMES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Anything else?" htmlFor="notes" error={errors.requestNotes?.message} className="sm:col-span-2">
                  <Textarea id="notes" rows={3} maxLength={400} placeholder="e.g. Celebrating an anniversary; travelling with a toddler" {...form.register("requestNotes")} />
                </Field>
              </div>
            </div>
          </section>
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={hotelHref(draft)} className="text-center text-sm font-semibold text-slate-600 hover:text-brand-600">
              ← Change room or rate
            </Link>
            <Button type="submit" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continue to review
            </Button>
          </div>
        </form>
      </FormProvider>
    </Layout>
  );
}

function Review({ draft, breakdown }: { draft: HotelDraft; breakdown: PriceBreakdown }) {
  const router = useRouter();
  const patchHotel = useDraftsStore((s) => s.patchHotel);
  const setActive = useDraftsStore((s) => s.setActive);
  const [termsError, setTermsError] = useState(false);
  const hotel = getHotel(draft.hotelId)!;
  const q = draft.quote;
  const incomplete = draft.guests.some((g) => !g.firstName || !g.lastName) || !draft.contact.email;
  const back = hotelHref(draft);

  const proceed = () => {
    if (incomplete) return router.push("/hotels/book/guest");
    if (!draft.termsAccepted) {
      setTermsError(true);
      document.getElementById("terms")?.focus();
      return;
    }
    setActive("hotel");
    router.push("/checkout/payment");
  };

  return (
    <Layout title="Review your stay" subtitle="Check the details and cancellation terms, then continue to payment." draft={draft} breakdown={breakdown}>
      <div className="min-w-0 space-y-5">
        <ReviewSection id="rs-stay" title="Your stay" editHref={back} editLabel="Change">
          <p className="text-[17px] font-bold text-navy-900">{hotel.name}</p>
          <p className="text-sm text-slate-600">{hotel.address}</p>
          <KeyValue
            items={[
              { label: "Check-in", value: `${formatDayLong(draft.criteria.checkIn)} · from ${hotel.checkIn}` },
              { label: "Check-out", value: `${formatDayLong(draft.criteria.checkOut)} · until ${hotel.checkOut}` },
              { label: "Guests", value: `${plural(draft.criteria.occupancy.adults + draft.criteria.occupancy.children, "guest")}, ${plural(q.rooms, "room")}` },
              { label: "Nights", value: String(q.nights) },
            ]}
          />
        </ReviewSection>
        <ReviewSection id="rs-room" title="Room & rate" editHref={back} editLabel="Change">
          <p className="font-bold text-navy-900">{q.roomName}</p>
          <p className="mt-1 text-sm text-slate-700">{q.ratePlanName === MEAL_LABEL[q.meal] ? q.ratePlanName : `${q.ratePlanName} · ${MEAL_LABEL[q.meal]}`}</p>
          <div className={`mt-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold ${q.refundable ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {q.refundable
              ? `Free cancellation until ${formatDateMed(q.freeCancelUntil!)}. After that, the full stay is charged.`
              : "This rate is non-refundable. Changes and cancellations aren't possible."}
          </div>
          <p className="mt-2 text-xs text-slate-500">{q.payLater ? "You'll pay at the hotel. Your card guarantees the booking and won't be charged now." : "You pay the full amount now."}</p>
        </ReviewSection>
        <ReviewSection id="rs-guest" title="Guests & contact" editHref="/hotels/book/guest">
          <KeyValue
            items={[
              { label: "Lead guest", value: draft.guests.map((g) => `${g.title} ${g.firstName} ${g.lastName}`).join(", ") },
              { label: "Arrival time", value: draft.arrivalTime },
              { label: "Email", value: draft.contact.email },
              { label: "Mobile", value: `${draft.contact.countryCode} ${draft.contact.mobile}` },
              { label: "Special requests", value: draft.specialRequests.length ? draft.specialRequests.join(", ") : "None" },
              { label: "Notes", value: draft.requestNotes || "—" },
            ]}
          />
        </ReviewSection>
        <TermsBox
          checked={draft.termsAccepted}
          onChange={(v) => {
            patchHotel({ termsAccepted: v });
            if (v) setTermsError(false);
          }}
          error={termsError}
        >
          I accept the{" "}
          <Link href="/legal/terms" target="_blank" className="font-bold text-brand-600 underline">
            Terms &amp; Conditions
          </Link>
          , the hotel’s policies and the cancellation terms shown above.
        </TermsBox>
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/hotels/book/guest" className="text-center text-sm font-semibold text-slate-600 hover:text-brand-600">
            ← Back to guest details
          </Link>
          <Button size="xl" onClick={proceed} rightIcon={<ArrowRight className="h-4 w-4" />}>
            {q.payLater ? "Continue to guarantee" : "Continue to payment"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export function HotelGuestStep() {
  return <HotelGuard>{(ctx) => <GuestForm {...ctx} />}</HotelGuard>;
}

export function HotelReviewStep() {
  return <HotelGuard>{(ctx) => <Review {...ctx} />}</HotelGuard>;
}

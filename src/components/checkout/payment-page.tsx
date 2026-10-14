"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CreditCard, FlaskConical, Lock, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useCurrency } from "@/components/money";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice, StateView } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import { COUNTRIES } from "@/data/countries";
import { formatCurrency } from "@/lib/engine/currency";
import { QA_CARDS, detectCardBrand, luhnValid, outcomeForCard } from "@/lib/engine/payment";
import { calcFlightPricing, calcHotelPricing, calcUmrahPricing, type PriceBreakdown } from "@/lib/engine/pricing";
import { getUmrahPackage, resolveUmrahPricingInput } from "@/lib/engine/umrah";
import { useCheckoutStore, useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore, useUiStore } from "@/lib/stores/session";
import type { PaymentMethod } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { HotelStaySummary, UmrahTripSummary } from "./stay-summaries";
import { FlightTripSummary, MobileSummaryBar, SummaryPanel } from "./summary";

const cardSchema = z.object({
  cardholder: z.string().trim().min(3, "Enter the name shown on the card"),
  number: z.string().refine((v) => luhnValid(v), "Enter a valid card number"),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use the format MM/YY")
    .refine((v) => {
      const [month, year] = v.split("/").map(Number);
      // Valid through the last day of the expiry month.
      return new Date(2000 + year, month, 0, 23, 59) >= new Date();
    }, "This card has expired"),
  cvv: z.string().regex(/^\d{3,4}$/, "Enter the 3 or 4 digit security code"),
  country: z.string().min(1, "Select a country"),
  address: z.string().trim().min(3, "Enter the billing address"),
  city: z.string().trim().min(2, "Enter the city"),
  postcode: z.string().trim().min(3, "Enter the postcode"),
});
type CardValues = z.infer<typeof cardSchema>;

const METHODS: { id: PaymentMethod; label: string; sub: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Credit or debit card", sub: "Visa, Mastercard, Amex", icon: CreditCard },
  { id: "apple_pay", label: "Apple Pay", sub: "Demo wallet", icon: Smartphone },
  { id: "google_pay", label: "Google Pay", sub: "Demo wallet", icon: Wallet },
];

interface CheckoutContext {
  product: "flight" | "hotel" | "umrah";
  breakdown: PriceBreakdown;
  header: ReactNode;
  reviewHref: string;
  termsAccepted: boolean;
  payLater: boolean;
}

/** Whichever checkout is active (flight, hotel or Umrah), priced in the display currency. */
function useCheckoutContext() {
  const hydrated = useHydrated();
  const active = useDraftsStore((s) => s.active);
  const flight = useDraftsStore((s) => s.flight);
  const hotel = useDraftsStore((s) => s.hotel);
  const umrah = useDraftsStore((s) => s.umrah);
  const user = useSessionStore((s) => s.user);
  const { currency } = useCurrency();
  const ctx = useMemo((): CheckoutContext | null => {
    const product = active ?? (flight ? "flight" : hotel ? "hotel" : umrah ? "umrah" : null);
    if (product === "flight" && flight && flight.fareId)
      return {
        product,
        breakdown: calcFlightPricing({ offer: flight.offer, fareId: flight.fareId, extras: flight.extras, pax: flight.criteria.pax }, currency, !!user),
        header: <FlightTripSummary offer={flight.offer} pax={flight.criteria.pax} />,
        reviewHref: "/flights/book/review",
        termsAccepted: flight.termsAccepted,
        payLater: false,
      };
    if (product === "hotel" && hotel)
      return {
        product,
        breakdown: calcHotelPricing(hotel.quote, currency, !!user),
        header: <HotelStaySummary draft={hotel} />,
        reviewHref: "/hotels/book/review",
        termsAccepted: hotel.termsAccepted,
        payLater: hotel.quote.payLater,
      };
    if (product === "umrah" && umrah) {
      const pkg = getUmrahPackage(umrah.packageId);
      return pkg
        ? {
            product,
            breakdown: calcUmrahPricing(resolveUmrahPricingInput(pkg, umrah.config), currency, !!user),
            header: <UmrahTripSummary draft={umrah} />,
            reviewHref: "/umrah/book/review",
            termsAccepted: umrah.termsAccepted,
            payLater: false,
          }
        : null;
    }
    return null;
  }, [active, flight, hotel, umrah, currency, user]);
  return { hydrated, ctx };
}

/** Shared payment step: card (Luhn-checked) or demo wallets, plus the Demo & QA panel. */
export function PaymentPage() {
  const router = useRouter();
  const { hydrated, ctx } = useCheckoutContext();
  const profile = useSessionStore((s) => s.profile);
  const failure = useCheckoutStore((s) => s.failure);
  const setPending = useCheckoutStore((s) => s.setPending);
  const setFailure = useCheckoutStore((s) => s.setFailure);
  const failPayment = useUiStore((s) => s.failPayment);
  const setFailPayment = useUiStore((s) => s.setFailPayment);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const form = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    mode: "onTouched",
    defaultValues: {
      cardholder: profile ? `${profile.firstName} ${profile.lastName}`.trim().toUpperCase() : "",
      number: "",
      expiry: "",
      cvv: "",
      country: "GB",
      address: profile?.address.line1 ?? "",
      city: profile?.address.city ?? "",
      postcode: profile?.address.postcode ?? "",
    },
  });
  const errors = form.formState.errors;
  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is intentionally reactive here
  const brand = detectCardBrand(form.watch("number") ?? "");

  if (!hydrated)
    return (
      <div className="container-page py-10">
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  if (!ctx)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="There's nothing to pay for"
          description="Your booking session has expired or was already completed. Start a new search to book again."
          actions={
            <>
              <ButtonLink href="/flights">Search flights</ButtonLink>
              <ButtonLink href="/hotels" variant="outline">
                Search hotels
              </ButtonLink>
              <ButtonLink href="/account/bookings" variant="ghost">
                My bookings
              </ButtonLink>
            </>
          }
        />
      </div>
    );
  if (!ctx.termsAccepted)
    return (
      <div className="container-page py-16">
        <StateView
          title="Please review your booking first"
          description="You need to review the details and accept the terms before paying."
          actions={<ButtonLink href={ctx.reviewHref}>Go to review</ButtonLink>}
        />
      </div>
    );

  const total = formatCurrency(ctx.breakdown.total, ctx.breakdown.currency, { decimals: 2 });
  const payLabel = ctx.payLater ? `Confirm booking · pay ${total} at the hotel` : `Pay ${total}`;

  function pay(m: PaymentMethod, card?: CardValues) {
    if (submitted.current || !ctx) return;
    submitted.current = true;
    setSubmitting(true);
    setFailure(null);
    setPending({
      product: ctx.product,
      method: m,
      brand: card ? detectCardBrand(card.number) : m === "apple_pay" ? "Apple Pay" : "Google Pay",
      last4: card ? card.number.replace(/\s/g, "").slice(-4) : m === "apple_pay" ? "4242" : "1881",
      cardholder: card?.cardholder,
      // "Force the next payment to fail" turns any method into a decline.
      outcome: failPayment ? "declined" : card ? outcomeForCard(card.number) : "ok",
      billingCountry: card?.country,
    });
    router.push("/checkout/processing");
  }

  const summary = <SummaryPanel header={ctx.header} breakdown={ctx.breakdown} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Payment</h1>
        <p className="mt-1 flex items-center gap-1.5 text-slate-600">
          <Lock className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            Secure checkout. Your total is <b className="tnum text-navy-900">{total}</b>.
          </span>
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {failure && (
            <InlineNotice tone="error" icon={<AlertTriangle className="h-5 w-5" />} title="Payment unsuccessful">
              {failure.message}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFailure(null);
                    setFailPayment(false);
                    form.setFocus("number");
                  }}
                >
                  Try another card
                </Button>
                <ButtonLink size="sm" variant="ghost" href="/help/payments">
                  Payment help
                </ButtonLink>
              </div>
            </InlineNotice>
          )}
          <section aria-labelledby="pm-h" className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 id="pm-h" className="text-[16px] font-bold text-navy-900">
                Choose how to pay
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={method === m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors",
                      method === m.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <m.icon className={cn("h-6 w-6", method === m.id ? "text-brand-600" : "text-slate-400")} aria-hidden />
                    <span className="leading-tight">
                      <span className="block text-sm font-bold text-navy-900">{m.label}</span>
                      <span className="block text-xs text-slate-500">{m.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              {method === "card" ? (
                <form onSubmit={form.handleSubmit((v) => pay("card", v))} noValidate className="mt-6" aria-label="Card payment">
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-6">
                    <Field label="Cardholder name" htmlFor="cc-name" error={errors.cardholder?.message} required className="sm:col-span-6">
                      <Input id="cc-name" autoComplete="cc-name" placeholder="Name as shown on card" invalid={!!errors.cardholder} {...form.register("cardholder")} />
                    </Field>
                    <Field label="Card number" htmlFor="cc-number" error={errors.number?.message} required className="sm:col-span-6">
                      <Controller
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                          <div className="relative">
                            <Input
                              id="cc-number"
                              inputMode="numeric"
                              autoComplete="cc-number"
                              placeholder="1234 5678 9012 3456"
                              invalid={!!errors.number}
                              value={field.value}
                              onBlur={field.onBlur}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 19)
                                    .replace(/(.{4})/g, "$1 ")
                                    .trim(),
                                )
                              }
                              className="pr-24 tnum"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{brand !== "Card" ? brand : ""}</span>
                          </div>
                        )}
                      />
                    </Field>
                    <Field label="Expiry date" htmlFor="cc-exp" error={errors.expiry?.message} required className="sm:col-span-3">
                      <Controller
                        control={form.control}
                        name="expiry"
                        render={({ field }) => (
                          <Input
                            id="cc-exp"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/YY"
                            invalid={!!errors.expiry}
                            value={field.value}
                            onBlur={field.onBlur}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                              field.onChange(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                            }}
                            className="tnum"
                          />
                        )}
                      />
                    </Field>
                    <Field label="Security code (CVV)" htmlFor="cc-cvv" error={errors.cvv?.message} required className="sm:col-span-3">
                      <Input id="cc-cvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="•••" invalid={!!errors.cvv} {...form.register("cvv")} />
                    </Field>
                    <h3 className="pt-2 text-sm font-bold text-navy-900 sm:col-span-6">Billing address</h3>
                    <Field label="Country" htmlFor="bill-country" error={errors.country?.message} required className="sm:col-span-3">
                      <Select id="bill-country" autoComplete="country" {...form.register("country")}>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Address" htmlFor="bill-addr" error={errors.address?.message} required className="sm:col-span-3">
                      <Input id="bill-addr" autoComplete="street-address" invalid={!!errors.address} {...form.register("address")} />
                    </Field>
                    <Field label="City" htmlFor="bill-city" error={errors.city?.message} required className="sm:col-span-3">
                      <Input id="bill-city" autoComplete="address-level2" invalid={!!errors.city} {...form.register("city")} />
                    </Field>
                    <Field label="Postcode" htmlFor="bill-zip" error={errors.postcode?.message} required className="sm:col-span-3">
                      <Input id="bill-zip" autoComplete="postal-code" invalid={!!errors.postcode} {...form.register("postcode")} />
                    </Field>
                  </div>
                  <Button type="submit" size="xl" block className="mt-7" loading={submitting} leftIcon={<Lock className="h-4 w-4" />}>
                    {payLabel}
                  </Button>
                </form>
              ) : (
                <div className="mt-6">
                  <InlineNotice tone="info" icon={<FlaskConical className="h-4 w-4" />} title={`${method === "apple_pay" ? "Apple Pay" : "Google Pay"} is a demo option`}>
                    No wallet is connected in this prototype. Continuing simulates an approved wallet payment.
                  </InlineNotice>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => pay(method)}
                    className={cn(
                      "mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-lg text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60",
                      method === "apple_pay" ? "bg-black" : "bg-slate-900 ring-1 ring-slate-300",
                    )}
                  >
                    {method === "apple_pay" ? "Pay with Apple Pay" : "Pay with Google Pay"} · {total}
                  </button>
                </div>
              )}
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                Payments are encrypted and processed over a secure connection. In this prototype no card is charged and card details are never stored. By paying you agree to our{" "}
                <Link href="/legal/terms" target="_blank" className="font-semibold text-brand-600 underline">
                  Terms
                </Link>
                .
              </p>
            </div>
          </section>
          <details className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-600">
              <FlaskConical className="h-4 w-4" aria-hidden /> Demo &amp; QA controls
            </summary>
            <div className="mt-3 space-y-3 text-[13px] text-slate-600">
              <p>Use these test cards in the card form:</p>
              <ul className="grid gap-1.5 sm:grid-cols-3">
                {QA_CARDS.map((c) => (
                  <li key={c.number}>
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("card");
                        form.setValue("number", c.number, { shouldValidate: true });
                      }}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-400"
                    >
                      <span className="block font-mono text-xs font-bold text-navy-900">{c.number}</span>
                      <span className="text-xs text-slate-500">{c.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <Checkbox
                checked={failPayment}
                onChange={(e) => setFailPayment(e.target.checked)}
                label="Force the next payment to fail"
                description="Simulates a declined payment so you can test the recovery path."
              />
            </div>
          </details>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">{summary}</div>
        </div>
      </div>
      <MobileSummaryBar breakdown={ctx.breakdown}>
        <SummaryPanel header={ctx.header} breakdown={ctx.breakdown} className="border-0" />
      </MobileSummaryBar>
    </div>
  );
}

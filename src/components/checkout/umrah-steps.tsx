"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Info, MapPin } from "lucide-react";
import { Stars } from "@/components/brand";
import { useCurrency } from "@/components/money";
import { Photo } from "@/components/photo";
import { Stepper } from "@/components/search/pickers";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice, StateView } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { countryName } from "@/data/countries";
import { ROOM_LABEL } from "@/data/umrah";
import { toCurrency } from "@/lib/engine/currency";
import { addDaysISO, formatDateMed, formatDayLong, formatDayShort } from "@/lib/engine/dates";
import { type PriceBreakdown } from "@/lib/engine/pricing";
import { loadUmrahQuote, umrahQuoteKey, umrahService } from "@/lib/engine/umrah";
import { useAccountStore } from "@/lib/stores/bookings";
import { useDraftsStore } from "@/lib/stores/drafts";
import { useHydrated } from "@/lib/stores/hydration";
import { useSessionStore } from "@/lib/stores/session";
import type { UmrahDraft, UmrahTraveller } from "@/lib/types/booking";
import type { UmrahConfig, UmrahPackage, UmrahPricingInput, UmrahRoomType } from "@/lib/types/umrah";
import { cn } from "@/lib/utils";
import { contactSchema, makePassengerSchema } from "@/lib/validation";
import { StepSkeleton } from "./hotel-steps";
import { KeyValue, ReviewSection, TermsBox } from "./review-parts";
import { UmrahTripSummary } from "./stay-summaries";
import { MobileSummaryBar, SummaryPanel } from "./summary";
import { ContactFields, TravellerFields, type ProfilePick } from "./traveller-fields";

interface UmrahCtx {
  quote: import("@cheaperfly/api-contracts/umrah").UmrahQuote;
  valid: boolean;
  draft: UmrahDraft;
  pkg: UmrahPackage;
  input: UmrahPricingInput;
  breakdown: PriceBreakdown;
}

/** Renders an Umrah booking step only when there is a draft for a known package. */
function UmrahGuard({ children }: { children: (ctx: UmrahCtx) => ReactNode }) {
  const hydrated = useHydrated();
  const draft = useDraftsStore((s) => s.umrah);
  const user = useSessionStore((s) => s.user);
  const { currency } = useCurrency();
  const identity=user?.id??"guest";
  const key=draft?umrahQuoteKey(draft.packageId,draft.config,currency,identity):"";
  const [result,setResult]=useState<{key:string;identity:string;quote:import("@cheaperfly/api-contracts/umrah").UmrahQuote}|null>(null);
  const [failure,setFailure]=useState<{key:string;message:string}|null>(null);
  const [attempt,setAttempt]=useState(0);
  const [expired,setExpired]=useState<string|null>(null);
  useEffect(()=>{
    if(!hydrated||!draft)return;
    let cancelled=false;
    loadUmrahQuote(draft.packageId,draft.config,currency,identity).then(quote=>{if(!cancelled){setResult({key,identity,quote});useDraftsStore.getState().patchUmrah({serverQuote:quote});setFailure(null);}}).catch((error:Error)=>{if(!cancelled)setFailure({key,message:error.message});});
    return ()=>{cancelled=true;};
    // The key covers every package option, currency and current identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[hydrated,key,attempt]);
  useEffect(()=>{if(!result)return;const timer=setTimeout(()=>setExpired(result.quote.id),Math.max(0,Date.parse(result.quote.expiresAt)-Date.now()));return ()=>clearTimeout(timer);},[result]);
  const quote=result?.identity===identity&&result.quote.pkg.id===draft?.packageId&&result.quote.total.currency===currency?result.quote:null;
  const error=failure?.key===key?failure.message:quote?.id===expired?"This quote has expired. Please refresh the package.":null;
  const ctx:UmrahCtx|null=draft&&quote?{draft,pkg:quote.pkg,input:quote.input,breakdown:quote.breakdown,quote,valid:result?.key===key&&!error}:null;
  if (!hydrated) return <StepSkeleton />;
  if(draft&&!ctx&&!error)return <StepSkeleton />;
  if(error&&!ctx)return <div className="container-page py-16"><StateView tone="warning" title="We couldn’t quote this package" description={error} actions={<><Button onClick={()=>setAttempt(n=>n+1)}>Try again</Button><ButtonLink href="/umrah/packages">Browse packages</ButtonLink></>} /></div>;
  if (!ctx)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="Your booking session has expired"
          description="We couldn't find the package you were customising. Choose a package to start again."
          actions={
            <ButtonLink href="/umrah/packages" variant="umrah">
              Browse Umrah packages
            </ButtonLink>
          }
        />
      </div>
    );
  return <>{error&&<InlineNotice tone="error">{error}<Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}>Try again</Button></InlineNotice>}{children(ctx)}</>;
}

function Layout({ title, subtitle, ctx, aside, children }: { title: string; subtitle: ReactNode; ctx: UmrahCtx; aside?: ReactNode; children: ReactNode }) {
  const header = <UmrahTripSummary draft={ctx.draft} />;
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-slate-600">{subtitle}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {children}
        <div className="hidden lg:block">
          {aside ?? <SummaryPanel className="sticky top-24" header={header} breakdown={ctx.breakdown} />}
        </div>
      </div>
      <MobileSummaryBar breakdown={ctx.breakdown}>
        <SummaryPanel header={header} breakdown={ctx.breakdown} className="border-0" />
      </MobileSummaryBar>
    </div>
  );
}

function Card({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 id={id} className="text-[16px] font-bold text-navy-900">
          {title}
        </h2>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Choice({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn("relative rounded-lg border-2 p-3.5 text-left transition-colors", selected ? "border-umrah-700 bg-umrah-50" : "border-slate-200 bg-white hover:border-slate-300", className)}
    >
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-umrah-700 text-white">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      )}
      {children}
    </button>
  );
}

function Customize({ ctx }: { ctx: UmrahCtx }) {
  const router = useRouter();
  const { currency, fmt } = useCurrency();
  const update = useDraftsStore((s) => s.updateUmrahConfig);
  const { draft, pkg, breakdown } = ctx;
  const c = draft.config;
  // Supplements are per person in GBP; shown in the display currency.
  const delta = (gbp: number) => (gbp === 0 ? "Included" : `${gbp > 0 ? "+" : "−"}${fmt(Math.abs(toCurrency(gbp, currency)))} pp`);
  const defMakkah = pkg.options!.hotels.find(x=>x.id===pkg.makkahHotelId)!;
  const defMadinah = pkg.options!.hotels.find(x=>x.id===pkg.madinahHotelId)!;
  const defTransfer = pkg.options!.transfers.find(x=>x.id===pkg.defaultTransferId)!;
  const adultPrice = (patch: Partial<UmrahConfig>) => patch.departureDate?ctx.quote.departurePrices[patch.departureDate]:ctx.quote.adultPrice;
  const perAdult = adultPrice({});

  const aside = (
    <div className="sticky top-24">
      <SummaryPanel header={<UmrahTripSummary draft={draft} />} breakdown={breakdown}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Per adult</p>
        <p className="text-2xl font-extrabold text-navy-900 tnum">{fmt(perAdult)}</p>
        <p className="text-xs text-slate-500">package price before extras, taxes and fees</p>
      </SummaryPanel>
    </div>
  );

  const hotelGroups = [
    { key: "makkahHotelId" as const, title: "Makkah hotel", nights: pkg.makkahNights, options: pkg.makkahHotelOptions, def: defMakkah, target: "the Haram" },
    { key: "madinahHotelId" as const, title: "Madinah hotel", nights: pkg.madinahNights, options: pkg.madinahHotelOptions, def: defMadinah, target: "the Masjid" },
  ];

  return (
    <Layout title="Customise your Umrah" subtitle={`${pkg.name} · every change updates your price instantly.`} ctx={ctx} aside={aside}>
      <div className="min-w-0 space-y-5">
        <Card id="cz-trav" title="Travellers" sub="Children (2–11) pay 75%. Infants under 2 travel for a flat fee.">
          <div className="grid gap-x-8 sm:grid-cols-3">
            <Stepper label="Adults" description="12+" value={c.adults} min={1} max={9} onChange={(v) => update({ adults: v, infants: Math.min(c.infants, v) })} />
            <Stepper label="Children" description="2–11" value={c.children} min={0} max={8} onChange={(v) => update({ children: v })} />
            <Stepper label="Infants" description="Under 2" value={c.infants} min={0} max={c.adults} onChange={(v) => update({ infants: v })} />
          </div>
        </Card>
        <Card id="cz-date" title="Departure" sub="Prices vary by season; school-holiday and Ramadan dates cost more.">
          <div className="mb-4 max-w-xs">
            <label htmlFor="cz-city" className="mb-1 block text-[13px] font-semibold text-slate-700">
              Departing from
            </label>
            <Select id="cz-city" value={c.departureCity} onChange={(e) => update({ departureCity: e.target.value })}>
              {pkg.departureCities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </Select>
          </div>
          <div role="radiogroup" aria-label="Departure date" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {pkg.departures.map((d) => (
              <Choice key={d.date} selected={c.departureDate === d.date} onClick={() => update({ departureDate: d.date })}>
                <p className="pr-6 text-sm font-bold text-navy-900">{formatDayShort(d.date)}</p>
                {d.label && (
                  <Badge tone="gold" className="mt-1">
                    {d.label}
                  </Badge>
                )}
                <p className="mt-1.5 text-sm font-extrabold text-navy-900 tnum">
                  {fmt(adultPrice({ departureDate: d.date }))} <span className="text-xs font-normal text-slate-500">pp</span>
                </p>
                <p className={cn("text-xs font-semibold", d.seatsLeft <= 8 ? "text-red-600" : "text-slate-500")}>{d.seatsLeft} seats left</p>
              </Choice>
            ))}
          </div>
        </Card>
        <Card id="cz-room" title="Room type" sub="Applies to both Makkah and Madinah.">
          <div role="radiogroup" aria-label="Room type" className="grid gap-2.5 sm:grid-cols-3">
            {(["quad", "triple", "double"] as UmrahRoomType[]).map((r) => (
              <Choice key={r} selected={c.roomType === r} onClick={() => update({ roomType: r })}>
                <p className="pr-6 text-sm font-bold text-navy-900">{ROOM_LABEL[r].label}</p>
                <p className="text-xs text-slate-500">{ROOM_LABEL[r].sub}</p>
                <p className="mt-2 text-sm font-extrabold text-navy-900 tnum">{delta(pkg.roomDelta[r])}</p>
              </Choice>
            ))}
          </div>
        </Card>
        {hotelGroups.map((g) => (
          <Card key={g.key} id={`cz-${g.key}`} title={`${g.title} · ${g.nights} nights`} sub={`Distances are walking distance to ${g.target}.`}>
            <div role="radiogroup" aria-label={g.title} className="grid gap-3 sm:grid-cols-2">
              {g.options.map((id) => {
                const h = pkg.options!.hotels.find(x=>x.id===id)!;
                return (
                  <Choice key={id} selected={c[g.key] === id} onClick={() => update({ [g.key]: id })} className="overflow-hidden !p-0">
                    <Photo src={h.image} alt="" ratio="16/8" sizes="320px" />
                    <div className="p-3.5">
                      <p className="pr-6 text-[15px] font-bold text-navy-900">{h.name}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <Stars count={h.stars} size={11} /> <MapPin className="h-3 w-3" aria-hidden /> {h.distanceM} m
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-navy-900 tnum">{delta((h.perNightPerPerson - g.def.perNightPerPerson) * g.nights)}</p>
                    </div>
                  </Choice>
                );
              })}
            </div>
          </Card>
        ))}
        <Card id="cz-flight" title="Flights" sub="Economy return flights from your departure city.">
          <div role="radiogroup" aria-label="Flight" className="grid gap-2.5 sm:grid-cols-2">
            {pkg.flightOptionIds.map((id) => {
              const f = pkg.options!.flights.find(x=>x.id===id)!;
              return (
                <Choice key={id} selected={c.flightId === id} onClick={() => update({ flightId: id })}>
                  <p className="pr-6 text-sm font-bold text-navy-900">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.route}</p>
                  <p className="text-xs text-slate-500">{f.baggage}</p>
                  <p className="mt-2 text-sm font-extrabold text-navy-900 tnum">{delta(f.priceDelta)}</p>
                </Choice>
              );
            })}
          </div>
        </Card>
        <Card id="cz-transfer" title="Transfers" sub="Between the airport, Makkah and Madinah.">
          <div role="radiogroup" aria-label="Transfers" className="grid gap-2.5 sm:grid-cols-2">
            {pkg.transferOptionIds.map((id) => {
              const t = pkg.options!.transfers.find(x=>x.id===id)!;
              return (
                <Choice key={id} selected={c.transferId === id} onClick={() => update({ transferId: id })}>
                  <p className="pr-6 text-sm font-bold text-navy-900">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.vehicle}</p>
                  <p className="mt-2 text-sm font-extrabold text-navy-900 tnum">{delta(t.priceDelta - defTransfer.priceDelta)}</p>
                </Choice>
              );
            })}
          </div>
        </Card>
        <Card id="cz-extras" title="Optional extras" sub="Add anything you'd like — you can remove it later before you pay.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {pkg.options!.extras.map((x) => {
              const on = c.extraIds.includes(x.id);
              return (
                <li key={x.id}>
                  <label
                    className={cn(
                      "flex h-full cursor-pointer items-start gap-3 rounded-lg border-2 p-3.5 transition-colors",
                      on ? "border-umrah-700 bg-umrah-50" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => update({ extraIds: e.target.checked ? [...c.extraIds, x.id] : c.extraIds.filter((id) => id !== x.id) })}
                      className="mt-1 h-4 w-4 accent-umrah-700"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-navy-900">{x.label}</span>
                      <span className="block text-xs text-slate-500">{x.description}</span>
                      <span className="mt-1 block text-sm font-extrabold text-navy-900 tnum">
                        {fmt(toCurrency(x.price, currency))} {x.perGroup ? "per booking" : "pp"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/umrah/packages/${pkg.slug}`} className="text-center text-sm font-semibold text-slate-600 hover:text-umrah-700">
            ← Back to package
          </Link>
          <Button variant="umrah" size="xl" disabled={!ctx.valid} onClick={() => router.push("/umrah/book/travellers")} rightIcon={<ArrowRight className="h-4 w-4" />}>
            Continue to traveller details
          </Button>
        </div>
      </div>
    </Layout>
  );
}

function Travellers({ ctx }: { ctx: UmrahCtx }) {
  const router = useRouter();
  const {currency}=useCurrency();
  const patchUmrah = useDraftsStore((s) => s.patchUmrah);
  const user = useSessionStore((s) => s.user);
  const profile = useSessionStore((s) => s.profile);
  const saved = useAccountStore((s) => s.travellers);
  const { draft, pkg } = ctx;
  const departs = draft.config.departureDate;
  const returns = addDaysISO(departs, pkg.nights);
  const schema = useMemo(
    () =>
      z.object({
        travellers: z.array(makePassengerSchema(departs, returns)),
        contact: contactSchema,
        notes: z.string().max(400).optional(),
      }),
    [departs, returns],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      travellers: draft.travellers.map((t) => ({ ...t, middleName: "", frequentFlyer: "", passportCountry: t.passportCountry ?? "", savedTravellerId: "" })),
      contact: draft.contact,
      notes: draft.notes,
    },
  });
  const errors = form.formState.errors;
  const profilePick: ProfilePick | null = profile?.firstName
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

  const onSubmit = form.handleSubmit(async (v) => {
    // "Travelling with" isn't part of the passenger schema, so it is read from the raw form values.
    const raw = form.getValues() as unknown as { travellers: { mahram?: string }[] };
    const travellers: UmrahTraveller[] = v.travellers.map((t, i) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      firstName: t.firstName,
      lastName: t.lastName,
      dob: t.dob,
      gender: t.gender,
      nationality: t.nationality,
      passportNo: t.passportNo ?? "",
      passportCountry: t.passportCountry,
      passportExpiry: t.passportExpiry ?? "",
      mahram: raw.travellers[i]?.mahram ?? "",
    }));
    try {
      const quote=await loadUmrahQuote(draft.packageId,draft.config,currency,user?.id??"guest");
      const documents=await umrahService.travellers(quote.id,travellers,v.contact,v.notes??"");
      patchUmrah({travellers,contact:v.contact,notes:v.notes??"",serverQuote:quote,documents});router.push("/umrah/book/review");
    }catch(error){form.setError("root",{message:error instanceof Error?error.message:"Could not validate traveller details."});}

  });

  return (
    <Layout title="Traveller details" subtitle="Enter details exactly as shown on each passport for this simulated booking. No visa application is submitted." ctx={ctx}>
      <FormProvider {...form}>
        <form noValidate onSubmit={onSubmit} className="min-w-0 space-y-5">
          {!user && (
            <InlineNotice tone="info" icon={<Info className="h-4 w-4" />}>
              <Link href="/sign-in?next=/umrah/book/travellers" className="font-bold underline">
                Sign in
              </Link>{" "}
              to use saved travellers and save 3% on this package.
            </InlineNotice>
          )}
          {draft.travellers.map((t, i) => (
            <TravellerFields
              key={t.id}
              prefix={`travellers.${i}`}
              index={i}
              type={t.type}
              lastTravelDate={returns}
              saved={user ? saved : undefined}
              profilePick={user ? profilePick : null}
              showFrequentFlyer={false}
              extraFields={
                <Field
                  label="Travelling with (family / group leader)"
                  htmlFor={`um-with-${i}`}
                  optional
                  className="sm:col-span-6"
                  hint="Adult women may travel without a mahram under current Saudi rules; tell us if you're joining a family or group."
                >
                  <Input id={`um-with-${i}`} placeholder="e.g. Husband: Yusuf Khan" {...form.register(`travellers.${i}.mahram` as `travellers.${number}.firstName`)} />
                </Field>
              }
            />
          ))}
          <ContactFields note="Contact details for this simulated booking. No email or visa application is sent." />
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="un-h">
            <h2 id="un-h" className="mb-3 text-[16px] font-bold text-navy-900">
              Notes for our Umrah team <span className="text-xs font-normal text-slate-400">Optional</span>
            </h2>
            <Field label="Special requirements" htmlFor="um-notes" error={errors.notes?.message} hint="Mobility assistance, dietary needs, room preferences…">
              <Textarea id="um-notes" rows={3} maxLength={400} {...form.register("notes")} />
            </Field>
          </section>
          {errors.root?.message&&<InlineNotice tone="error">{errors.root.message}</InlineNotice>}
          {form.formState.isSubmitted && Object.keys(errors).length > 0 && (
            <InlineNotice tone="error" title="Please check the highlighted fields">
              Some traveller details are missing or don’t look right.
            </InlineNotice>
          )}
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/umrah/book/customize" className="text-center text-sm font-semibold text-slate-600 hover:text-umrah-700">
              ← Back to customise
            </Link>
            <Button type="submit" variant="umrah" size="lg" loading={form.formState.isSubmitting} disabled={!ctx.valid} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continue to review
            </Button>
          </div>
        </form>
      </FormProvider>
    </Layout>
  );
}

const maskPassport = (n: string) => n.replace(/.(?=.{3})/g, "•");

function Review({ ctx }: { ctx: UmrahCtx }) {
  const router = useRouter();
  const {currency}=useCurrency();
  const user=useSessionStore(s=>s.user);
  const [checking,setChecking]=useState(false);
  const [quoteError,setQuoteError]=useState<string|null>(null);
  const patchUmrah = useDraftsStore((s) => s.patchUmrah);
  const setActive = useDraftsStore((s) => s.setActive);
  const [termsError, setTermsError] = useState(false);
  const { draft, pkg, input } = ctx;
  const c = draft.config;
  const incomplete = draft.travellers.some((t) => !t.firstName || !t.lastName) || !draft.contact.email;

  const proceed = async () => {
    if (incomplete) return router.push("/umrah/book/travellers");
    if (!draft.termsAccepted) {
      setTermsError(true);
      document.getElementById("terms")?.focus();
      return;
    }
    setChecking(true);setQuoteError(null);
    try {const quote=await loadUmrahQuote(draft.packageId,draft.config,currency,user?.id??"guest");const documents=await umrahService.travellers(quote.id,draft.travellers,draft.contact,draft.notes);patchUmrah({serverQuote:quote,documents});setActive("umrah");router.push("/checkout/payment");}catch(error){setQuoteError(error instanceof Error?error.message:"Could not refresh this package.");}finally{setChecking(false);}

  };

  return (
    <Layout title="Review your Umrah booking" subtitle="Use Edit on any section to make changes. Your other choices are kept." ctx={ctx}>
      <div className="min-w-0 space-y-5">
        {quoteError&&<InlineNotice tone="error">{quoteError}</InlineNotice>}
        <ReviewSection id="ur-pkg" title="Package & dates" editHref="/umrah/book/customize">
          <p className="text-[17px] font-bold text-navy-900">{pkg.name}</p>
          <KeyValue
            items={[
              { label: "Departs", value: `${formatDayLong(c.departureDate)} from ${c.departureCity}` },
              { label: "Returns", value: formatDayLong(addDaysISO(c.departureDate, pkg.nights)) },
              { label: "Duration", value: `${pkg.nights} nights (${pkg.makkahNights} Makkah + ${pkg.madinahNights} Madinah)` },
              { label: "Room type", value: ROOM_LABEL[c.roomType].label },
            ]}
          />
        </ReviewSection>
        <ReviewSection id="ur-hotels" title="Hotels" editHref="/umrah/book/customize">
          <ul className="grid gap-4 text-sm sm:grid-cols-2">
            <li>
              <p className="text-xs font-bold uppercase tracking-wide text-umrah-700">Makkah · {pkg.makkahNights} nights</p>
              <p className="font-bold text-navy-900">{input.makkahHotel.name}</p>
              <p className="text-slate-600">{input.makkahHotel.distanceM} m to Masjid al-Haram</p>
            </li>
            <li>
              <p className="text-xs font-bold uppercase tracking-wide text-umrah-700">Madinah · {pkg.madinahNights} nights</p>
              <p className="font-bold text-navy-900">{input.madinahHotel.name}</p>
              <p className="text-slate-600">{input.madinahHotel.distanceM} m to Al-Masjid an-Nabawi</p>
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">Meals: {pkg.mealLabel}</p>
        </ReviewSection>
        <ReviewSection id="ur-fl" title="Flights, transfers & extras" editHref="/umrah/book/customize">
          <KeyValue
            cols={2}
            items={[
              { label: "Flights", value: `${input.flight.label} — ${input.flight.baggage}` },
              { label: "Transfers", value: input.transfer.label },
              { label: "Extras", value: input.extras.length ? input.extras.map((x) => x.label).join(", ") : "None" },
              { label: "Visa", value: "Included in package · not submitted (simulation)" },
            ]}
          />
        </ReviewSection>
        <ReviewSection id="ur-trav" title={`Travellers (${draft.travellers.length})`} editHref="/umrah/book/travellers">
          <ul className="divide-y divide-slate-100">
            {draft.travellers.map((t, i) => (
              <li key={t.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-[15px] font-bold text-navy-900">
                  {t.title} {t.firstName} {t.lastName}{" "}
                  <span className="ml-1 text-xs font-medium capitalize text-slate-500">
                    {t.type} {i + 1}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Born {formatDateMed(t.dob)} · {countryName(t.nationality)} · Passport {maskPassport(t.passportNo)} exp. {formatDateMed(t.passportExpiry)}
                  {t.mahram ? ` · with ${t.mahram}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </ReviewSection>
        <ReviewSection id="ur-contact" title="Contact & notes" editHref="/umrah/book/travellers">
          <KeyValue
            cols={3}
            items={[
              { label: "Email", value: draft.contact.email },
              { label: "Mobile", value: `${draft.contact.countryCode} ${draft.contact.mobile}` },
              { label: "Notes", value: draft.notes || "—" },
            ]}
          />
        </ReviewSection>
        <TermsBox
          checked={draft.termsAccepted}
          onChange={(v) => {
            patchUmrah({ termsAccepted: v });
            if (v) setTermsError(false);
          }}
          error={termsError}
        >
          I confirm passport details are correct and accept the{" "}
          <Link href="/legal/terms" target="_blank" className="font-bold text-brand-600 underline">
            Terms &amp; Conditions
          </Link>{" "}
          and the{" "}
          <Link href="/legal/refund-policy" target="_blank" className="font-bold text-brand-600 underline">
            Umrah cancellation policy
          </Link>
          .
        </TermsBox>
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/umrah/book/travellers" className="text-center text-sm font-semibold text-slate-600 hover:text-umrah-700">
            ← Back to travellers
          </Link>
          <Button variant="umrah" size="xl" onClick={proceed} loading={checking} disabled={!ctx.valid} rightIcon={<ArrowRight className="h-4 w-4" />}>
            Continue to payment
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export function UmrahCustomize() {
  return <UmrahGuard>{(ctx) => <Customize ctx={ctx} />}</UmrahGuard>;
}

export function UmrahTravellersStep() {
  return <UmrahGuard>{(ctx) => <Travellers ctx={ctx} />}</UmrahGuard>;
}

export function UmrahReviewStep() {
  return <UmrahGuard>{(ctx) => <Review ctx={ctx} />}</UmrahGuard>;
}

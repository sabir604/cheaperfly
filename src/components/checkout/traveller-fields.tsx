"use client";

import type { ReactNode } from "react";
import { useFormContext, type FieldErrors, type FieldValues } from "react-hook-form";
import { AlertTriangle, Bookmark, UserRound } from "lucide-react";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { COUNTRIES, DIAL_CODES } from "@/data/countries";
import { toISODate } from "@/lib/engine/dates";
import type { PaxType, SavedTraveller } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { TITLES, passportWarning } from "@/lib/validation";

export const TYPE_LABEL: Record<PaxType, string> = { adult: "Adult", child: "Child", infant: "Infant" };

const TYPE_HINT: Record<PaxType, string> = {
  adult: "12 years or older",
  child: "Aged 2–11 at time of travel",
  infant: "Under 2 years, travels on an adult's lap",
};

/** Error message at a dotted path such as `passengers.0.dob`. */
function errorAt(errors: FieldErrors, path: string): string | undefined {
  let node: unknown = errors;
  for (const key of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return (node as { message?: string } | undefined)?.message;
}

export function ContactFields({ prefix = "contact", note }: { prefix?: string; note?: string }) {
  const { register, formState } = useFormContext();
  const err = (f: string) => errorAt(formState.errors, `${prefix}.${f}`);
  return (
    <section aria-labelledby="contact-h" className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UserRound className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="contact-h" className="text-[16px] font-bold text-navy-900">
            Contact details
          </h2>
          <p className="text-xs text-slate-500">{note ?? "We'll send your confirmation and any schedule changes here"}</p>
        </div>
      </div>
      <div className="grid gap-x-4 gap-y-5 p-5 sm:grid-cols-6 sm:p-6">
        <Field label="Email address" htmlFor="contact-email" error={err("email")} required className="sm:col-span-3">
          <Input id="contact-email" type="email" autoComplete="email" placeholder="you@example.com" invalid={!!err("email")} {...register(`${prefix}.email`)} />
        </Field>
        <Field label="Country code" htmlFor="contact-cc" error={err("countryCode")} required className="sm:col-span-1">
          <Select id="contact-cc" invalid={!!err("countryCode")} {...register(`${prefix}.countryCode`)}>
            {DIAL_CODES.map((d) => (
              <option key={d.dial} value={d.dial}>
                {d.dial} ({d.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mobile number" htmlFor="contact-mobile" error={err("mobile")} required className="sm:col-span-2">
          <Input
            id="contact-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="7700 900123"
            invalid={!!err("mobile")}
            {...register(`${prefix}.mobile`)}
          />
        </Field>
      </div>
    </section>
  );
}

/** The signed-in user's own profile, offered as "My profile — …" on the lead traveller. */
export type ProfilePick = Omit<SavedTraveller, "id"> & { id: "__profile" };

const COUNTRY_OPTIONS = COUNTRIES.map((c) => (
  <option key={c.code} value={c.code}>
    {c.name}
  </option>
));

/** One traveller card: name, birth date, gender, nationality, passport and frequent flyer, plus saved-traveller fill. */
export function TravellerFields({
  prefix,
  index,
  type,
  lastTravelDate,
  saved,
  profilePick,
  showFrequentFlyer = true,
  showPassport = true,
  extraFields,
  saveFlag,
  title,
}: {
  prefix: string;
  index: number;
  type: PaxType;
  lastTravelDate: string;
  saved?: SavedTraveller[];
  profilePick?: ProfilePick | null;
  showFrequentFlyer?: boolean;
  showPassport?: boolean;
  extraFields?: ReactNode;
  saveFlag?: { checked: boolean; onChange: (v: boolean) => void } | null;
  title?: string;
}) {
  const { register, formState, watch, setValue } = useFormContext<FieldValues>();
  const id = (f: string) => `${prefix.replace(".", "-")}-${f}`;
  const err = (f: string) => errorAt(formState.errors, `${prefix}.${f}`);
  const expiry = watch(`${prefix}.passportExpiry`) as string | undefined;
  const warning = showPassport && expiry && !err("passportExpiry") ? passportWarning(expiry, lastTravelDate) : null;
  const today = toISODate(new Date());
  const options = (saved ?? []).filter((t) => t.type === type);
  const titles = TITLES[type];

  const fill = (choice: string) => {
    const t = choice === "__profile" ? profilePick : options.find((o) => o.id === choice);
    if (!t) return;
    const values: Record<string, string | undefined> = {
      title: t.title,
      firstName: t.firstName,
      middleName: t.middleName ?? "",
      lastName: t.lastName,
      dob: t.dob,
      gender: t.gender,
      nationality: t.nationality,
      passportNo: t.passportNo,
      passportCountry: t.passportCountry,
      passportExpiry: t.passportExpiry,
      frequentFlyer: t.frequentFlyer ?? "",
      savedTravellerId: choice === "__profile" ? undefined : t.id,
    };
    for (const [key, value] of Object.entries(values)) setValue(`${prefix}.${key}`, value ?? "", { shouldValidate: formState.isSubmitted, shouldDirty: true });
  };

  return (
    <section aria-labelledby={id("h")} className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{index + 1}</span>
          <div>
            <h2 id={id("h")} className="text-[16px] font-bold text-navy-900">
              {title ?? `${TYPE_LABEL[type]} ${index + 1}`}
              {index === 0 && type === "adult" && <span className="ml-2 text-xs font-medium text-slate-500">Lead traveller</span>}
            </h2>
            <p className="text-xs text-slate-500">{TYPE_HINT[type]}</p>
          </div>
        </div>
        {(options.length > 0 || profilePick) && (
          <div className="w-full sm:w-64">
            <label htmlFor={id("saved")} className="sr-only">
              Choose a saved traveller
            </label>
            <div className="relative">
              <Bookmark className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-brand-500" aria-hidden />
              <Select id={id("saved")} defaultValue="" onChange={(e) => e.target.value && fill(e.target.value)} className="h-10 pl-9 text-[13px]">
                <option value="">Use a saved traveller…</option>
                {profilePick && index === 0 && type === "adult" && (
                  <option value="__profile">
                    My profile — {profilePick.firstName} {profilePick.lastName}
                  </option>
                )}
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                    {t.relationship ? ` (${t.relationship})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-x-4 gap-y-5 p-5 sm:grid-cols-6 sm:p-6">
        <input type="hidden" {...register(`${prefix}.id`)} />
        <input type="hidden" {...register(`${prefix}.type`)} />
        <input type="hidden" {...register(`${prefix}.savedTravellerId`)} />
        <Field label="Title" htmlFor={id("title")} error={err("title")} required className="sm:col-span-1">
          <Select id={id("title")} invalid={!!err("title")} {...register(`${prefix}.title`)}>
            <option value="">Select</option>
            {titles.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="First name" htmlFor={id("first")} error={err("firstName")} required className="sm:col-span-2">
          <Input id={id("first")} autoComplete="given-name" placeholder="As on passport" invalid={!!err("firstName")} {...register(`${prefix}.firstName`)} />
        </Field>
        <Field label="Middle name" htmlFor={id("middle")} optional className="sm:col-span-1">
          <Input id={id("middle")} {...register(`${prefix}.middleName`)} />
        </Field>
        <Field label="Last name" htmlFor={id("last")} error={err("lastName")} required className="sm:col-span-2">
          <Input id={id("last")} autoComplete="family-name" placeholder="As on passport" invalid={!!err("lastName")} {...register(`${prefix}.lastName`)} />
        </Field>
        <Field label="Date of birth" htmlFor={id("dob")} error={err("dob")} required className="sm:col-span-2">
          <Input id={id("dob")} type="date" max={today} invalid={!!err("dob")} {...register(`${prefix}.dob`)} />
        </Field>
        <Field label="Gender (as on passport)" htmlFor={id("gender")} error={err("gender")} required className="sm:col-span-2">
          <Select id={id("gender")} invalid={!!err("gender")} {...register(`${prefix}.gender`)}>
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </Select>
        </Field>
        <Field label="Nationality" htmlFor={id("nat")} error={err("nationality")} required className="sm:col-span-2">
          <Select id={id("nat")} invalid={!!err("nationality")} {...register(`${prefix}.nationality`)}>
            <option value="">Select</option>
            {COUNTRY_OPTIONS}
          </Select>
        </Field>
        {showPassport && (
          <>
            <Field label="Passport number" htmlFor={id("pp")} error={err("passportNo")} required className="sm:col-span-2">
              <Input id={id("pp")} autoComplete="off" placeholder="e.g. 533871204" className="uppercase" invalid={!!err("passportNo")} {...register(`${prefix}.passportNo`)} />
            </Field>
            <Field label="Issuing country" htmlFor={id("ppc")} error={err("passportCountry")} required className="sm:col-span-2">
              <Select id={id("ppc")} invalid={!!err("passportCountry")} {...register(`${prefix}.passportCountry`)}>
                <option value="">Select</option>
                {COUNTRY_OPTIONS}
              </Select>
            </Field>
            <Field label="Passport expiry" htmlFor={id("ppe")} error={err("passportExpiry")} required className="sm:col-span-2">
              <Input id={id("ppe")} type="date" min={today} invalid={!!err("passportExpiry")} {...register(`${prefix}.passportExpiry`)} />
            </Field>
            {warning && (
              <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 sm:col-span-6" role="note">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {warning}
              </div>
            )}
          </>
        )}
        {showFrequentFlyer && (
          <Field label="Frequent flyer number" htmlFor={id("ff")} optional className="sm:col-span-3" hint="Earn miles with your airline programme">
            <Input id={id("ff")} placeholder="e.g. EK 1234 5678" {...register(`${prefix}.frequentFlyer`)} />
          </Field>
        )}
        {extraFields}
        {saveFlag && (
          <div className={cn("sm:col-span-6", showFrequentFlyer && "sm:col-span-3 sm:self-end")}>
            <Checkbox
              checked={saveFlag.checked}
              onChange={(e) => saveFlag.onChange(e.target.checked)}
              label="Save this traveller for future bookings"
              description="Stored securely in your Cheaperfly account"
            />
          </div>
        )}
      </div>
    </section>
  );
}

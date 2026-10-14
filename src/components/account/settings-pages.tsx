"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TabList } from "@/components/ui/disclosure";
import { StateView } from "@/components/ui/feedback";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { COUNTRIES, DIAL_CODES } from "@/data/countries";
import { MEAL_OPTIONS } from "@/data/extras";
import { CURRENCIES, type CurrencyCode } from "@/lib/engine/currency";
import { formatDateTimeMed, parseDate, toISODate } from "@/lib/engine/dates";
import { useAccountStore } from "@/lib/stores/bookings";
import { useSessionStore, useUiStore, type Preferences } from "@/lib/stores/session";
import type { NotificationKind } from "@/lib/types/booking";
import { cn } from "@/lib/utils";
import { emailField, nameField } from "@/lib/validation";
import { PageTitle } from "./account-shell";

const KIND_LABEL: Record<NotificationKind, string> = {
  booking: "Booking",
  payment: "Payment",
  ticket: "Ticket",
  trip: "Trip",
  refund: "Refund",
  support: "Support",
  promo: "Offer",
};

export function NotificationsPage() {
  const notifications = useAccountStore((s) => s.notifications);
  const markRead = useAccountStore((s) => s.markRead);
  const markAllRead = useAccountStore((s) => s.markAllRead);
  const remove = useAccountStore((s) => s.deleteNotification);
  const [tab, setTab] = useState("all");
  const unread = notifications.filter((n) => !n.read).length;
  const shown = notifications.filter((n) => tab === "all" || !n.read).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div>
      <PageTitle
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up."}
        action={
          <Button
            variant="outline"
            disabled={unread === 0}
            onClick={() => {
              markAllRead();
              toast.success("All notifications marked as read");
            }}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Mark all read
          </Button>
        }
      />
      <TabList
        label="Notification filter"
        variant="pill"
        value={tab}
        onChange={setTab}
        className="mb-5"
        tabs={[
          { id: "all", label: "All", count: notifications.length },
          { id: "unread", label: "Unread", count: unread },
        ]}
      />
      {shown.length === 0 ? (
        <StateView
          icon={<BellOff className="h-7 w-7" />}
          title={tab === "unread" ? "No unread notifications" : "No notifications yet"}
          description="Booking, payment, ticket and refund updates appear here."
          actions={<ButtonLink href="/flights">Search flights</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {shown.map((n) => (
            <li key={n.id} className={cn("flex items-start gap-4 px-5 py-4", !n.read && "bg-brand-50/40")}>
              <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.read ? "bg-slate-100 text-slate-400" : "bg-brand-500 text-white")}>
                <Bell className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-navy-900">{n.title}</p>
                  <Badge tone="outline">{KIND_LABEL[n.kind]}</Badge>
                  {!n.read && <Badge tone="brand">New</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-400 tnum">{formatDateTimeMed(n.at)}</span>
                  {n.href && (
                    <Link href={n.href} onClick={() => markRead(n.id)} className="font-bold text-brand-600 hover:underline">
                      Open
                    </Link>
                  )}
                  <button type="button" onClick={() => markRead(n.id, !n.read)} className="font-semibold text-slate-500 hover:text-navy-900">
                    Mark as {n.read ? "unread" : "read"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label={`Delete notification: ${n.title}`}
                className="rounded-md p-2 text-slate-300 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LANGUAGES = ["English (UK)", "English (US)", "العربية", "اردو", "Türkçe"];

function SettingsSection({ id, title, className, children }: { id: string; title: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 id={id} className={cn("text-[16px] font-bold", className)}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PreferencesPage() {
  const prefs = useSessionStore((s) => s.preferences);
  const updatePreferences = useSessionStore((s) => s.updatePreferences);
  const setCurrency = useUiStore((s) => s.setCurrency);
  const save = (patch: Partial<Preferences>) => {
    updatePreferences(patch);
    toast.success("Preferences saved");
  };

  return (
    <div>
      <PageTitle title="Preferences" subtitle="Changes are saved automatically." />
      <div className="space-y-6">
        <SettingsSection id="pr-reg" title="Currency & language" className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display currency" htmlFor="pr-cur" hint="Prices across the site are shown in this currency.">
              <Select
                id="pr-cur"
                value={prefs.currency}
                onChange={(e) => {
                  const currency = e.target.value as CurrencyCode;
                  setCurrency(currency);
                  save({ currency });
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language" htmlFor="pr-lang" hint="Interface translations are not part of this prototype.">
              <Select id="pr-lang" value={prefs.language} onChange={(e) => save({ language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection id="pr-notif" title="Notifications">
          <div className="mt-2 divide-y divide-slate-100">
            <Switch
              checked={prefs.emailNotifications}
              onChange={(v) => save({ emailNotifications: v })}
              label="Email notifications"
              description="Booking confirmations, tickets, schedule changes and refund updates."
            />
            <Switch
              checked={prefs.smsNotifications}
              onChange={(v) => save({ smsNotifications: v })}
              label="SMS notifications"
              description="Time-critical trip alerts such as gate changes and delays."
            />
            <Switch
              checked={prefs.whatsappNotifications}
              onChange={(v) => save({ whatsappNotifications: v })}
              label="WhatsApp notifications"
              description="Trip updates and support replies on WhatsApp."
            />
            <Switch
              checked={prefs.marketing}
              onChange={(v) => save({ marketing: v })}
              label="Marketing emails"
              description="Fare drops, hotel offers and Umrah season announcements."
            />
          </div>
        </SettingsSection>
        <SettingsSection id="pr-trip" title="Travel preferences" className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default meal" htmlFor="pr-meal">
              <Select id="pr-meal" value={prefs.defaultMeal} onChange={(e) => save({ defaultMeal: e.target.value })}>
                {MEAL_OPTIONS.filter((m) => !m.for).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seat preference" htmlFor="pr-seat">
              <Select id="pr-seat" value={prefs.seatPreference} onChange={(e) => save({ seatPreference: e.target.value })}>
                <option value="any">No preference</option>
                <option value="window">Window</option>
                <option value="aisle">Aisle</option>
              </Select>
            </Field>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

const profileSchema = z.object({
  title: z.string().min(1, "Select a title"),
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  dob: z
    .string()
    .refine((v) => {
      const d = parseDate(v);
      return !v || (d && d < new Date());
    }, "Date of birth must be in the past")
    .optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  email: emailField,
  countryCode: z.string().min(1),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9\s-]{6,14}$/, "Enter a valid mobile number"),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  passportNo: z
    .string()
    .trim()
    .refine((v) => !v || /^[A-Za-z0-9]{6,9}$/.test(v), "Passport numbers have 6–9 letters/numbers")
    .optional(),
  passportCountry: z.string().optional(),
  passportExpiry: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const CountryOptions = ({ by }: { by: "code" | "name" }) => (
  <>
    <option value="">Select</option>
    {COUNTRIES.map((c) => (
      <option key={c.code} value={c[by]}>
        {c.name}
      </option>
    ))}
  </>
);

export function ProfilePage() {
  const profile = useSessionStore((s) => s.profile)!;
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      title: profile.title,
      firstName: profile.firstName,
      lastName: profile.lastName,
      dob: profile.dob,
      gender: profile.gender,
      nationality: profile.nationality,
      email: profile.email,
      countryCode: profile.countryCode,
      mobile: profile.mobile,
      line1: profile.address.line1,
      line2: profile.address.line2 ?? "",
      city: profile.address.city,
      postcode: profile.address.postcode,
      country: profile.address.country,
      passportNo: profile.passportNo,
      passportCountry: profile.passportCountry,
      passportExpiry: profile.passportExpiry,
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const today = toISODate(new Date());

  return (
    <div>
      <PageTitle title="Profile" subtitle="Your personal details, used to pre-fill bookings." />
      <form
        noValidate
        onSubmit={form.handleSubmit(async (v) => {
          await new Promise((r) => setTimeout(r, 500));
          updateProfile({
            title: v.title,
            firstName: v.firstName,
            lastName: v.lastName,
            dob: v.dob ?? "",
            gender: v.gender ?? "",
            nationality: v.nationality ?? "",
            email: v.email,
            countryCode: v.countryCode,
            mobile: v.mobile,
            address: { line1: v.line1 ?? "", line2: v.line2, city: v.city ?? "", postcode: v.postcode ?? "", country: v.country ?? "" },
            passportNo: v.passportNo ?? "",
            passportCountry: v.passportCountry ?? "",
            passportExpiry: v.passportExpiry ?? "",
          });
          form.reset(v);
          toast.success("Profile saved");
        })}
        className="space-y-6"
      >
        <SettingsSection id="pf-personal" title="Personal details" className="mb-4">
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Title" htmlFor="pf-title" error={errors.title?.message} required className="sm:col-span-1">
              <Select id="pf-title" invalid={!!errors.title} {...form.register("title")}>
                <option value="">Select</option>
                {["Mr", "Mrs", "Ms", "Miss", "Dr"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="First name" htmlFor="pf-first" error={errors.firstName?.message} required className="sm:col-span-2">
              <Input id="pf-first" invalid={!!errors.firstName} {...form.register("firstName")} />
            </Field>
            <Field label="Last name" htmlFor="pf-last" error={errors.lastName?.message} required className="sm:col-span-3">
              <Input id="pf-last" invalid={!!errors.lastName} {...form.register("lastName")} />
            </Field>
            <Field label="Date of birth" htmlFor="pf-dob" error={errors.dob?.message} className="sm:col-span-2">
              <Input id="pf-dob" type="date" max={today} {...form.register("dob")} />
            </Field>
            <Field label="Gender" htmlFor="pf-gender" className="sm:col-span-2">
              <Select id="pf-gender" {...form.register("gender")}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            </Field>
            <Field label="Nationality" htmlFor="pf-nat" className="sm:col-span-2">
              <Select id="pf-nat" {...form.register("nationality")}>
                <CountryOptions by="code" />
              </Select>
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection id="pf-contact" title="Contact information" className="mb-4">
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Email address" htmlFor="pf-email" error={errors.email?.message} required className="sm:col-span-3">
              <Input id="pf-email" type="email" invalid={!!errors.email} {...form.register("email")} />
            </Field>
            <Field label="Code" htmlFor="pf-cc" className="sm:col-span-1">
              <Select id="pf-cc" {...form.register("countryCode")}>
                {DIAL_CODES.map((c) => (
                  <option key={c.dial} value={c.dial}>
                    {c.dial}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mobile number" htmlFor="pf-mobile" error={errors.mobile?.message} required className="sm:col-span-2">
              <Input id="pf-mobile" type="tel" invalid={!!errors.mobile} {...form.register("mobile")} />
            </Field>
          </div>
        </SettingsSection>
        <SettingsSection id="pf-address" title="Address" className="mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" htmlFor="pf-l1">
              <Input id="pf-l1" autoComplete="address-line1" {...form.register("line1")} />
            </Field>
            <Field label="Address line 2" htmlFor="pf-l2" optional>
              <Input id="pf-l2" autoComplete="address-line2" {...form.register("line2")} />
            </Field>
            <Field label="City" htmlFor="pf-city">
              <Input id="pf-city" autoComplete="address-level2" {...form.register("city")} />
            </Field>
            <Field label="Postcode" htmlFor="pf-zip">
              <Input id="pf-zip" autoComplete="postal-code" {...form.register("postcode")} />
            </Field>
            <Field label="Country" htmlFor="pf-country" className="sm:col-span-2">
              <Select id="pf-country" {...form.register("country")}>
                <CountryOptions by="name" />
              </Select>
            </Field>
          </div>
        </SettingsSection>
        <section aria-labelledby="pf-pass" className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="pf-pass" className="mb-1 text-[16px] font-bold">
            Travel document <span className="text-xs font-normal text-slate-400">Optional</span>
          </h2>
          <p className="mb-4 text-[13px] text-slate-500">Used to pre-fill your passenger details. Stored on this device only in the prototype.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Passport number" htmlFor="pf-pp" error={errors.passportNo?.message}>
              <Input id="pf-pp" className="uppercase" invalid={!!errors.passportNo} {...form.register("passportNo")} />
            </Field>
            <Field label="Issuing country" htmlFor="pf-ppc">
              <Select id="pf-ppc" {...form.register("passportCountry")}>
                <CountryOptions by="code" />
              </Select>
            </Field>
            <Field label="Expiry date" htmlFor="pf-ppe">
              <Input id="pf-ppe" type="date" min={today} {...form.register("passportExpiry")} />
            </Field>
          </div>
        </section>
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
          {!isDirty && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Check className="h-4 w-4 text-emerald-600" aria-hidden /> All changes saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInMonths, isBefore } from "date-fns";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { COUNTRIES, countryName } from "@/data/countries";
import { formatDateMed, parseDate, toISODate } from "@/lib/engine/dates";
import { useAccountStore } from "@/lib/stores/bookings";
import type { SavedTraveller } from "@/lib/types/booking";
import { initials } from "@/lib/utils";
import { nameField } from "@/lib/validation";
import { saveTraveller,deleteTraveller } from "@/lib/engine/account";
import { ApiClientError } from "@/lib/api/client";
import { PageTitle } from "./account-shell";

const travellerSchema = z.object({
  type: z.enum(["adult", "child", "infant"]),
  title: z.string().min(1, "Select a title"),
  firstName: nameField("first name"),
  middleName: z.string().trim().optional(),
  lastName: nameField("last name"),
  dob: z
    .string()
    .min(1, "Enter date of birth")
    .refine((v) => {
      const d = parseDate(v);
      return !!d && !isBefore(new Date(), d);
    }, "Date of birth can't be in the future"),
  gender: z.string().min(1, "Select gender"),
  nationality: z.string().min(1, "Select nationality"),
  passportNo: z
    .string()
    .trim()
    .min(6, "Passport numbers have 6–9 characters")
    .max(9, "Passport numbers have 6–9 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  passportCountry: z.string().min(1, "Select issuing country"),
  passportExpiry: z
    .string()
    .min(1, "Enter expiry date")
    .refine((v) => {
      const d = parseDate(v);
      return !!d && isBefore(new Date(), d);
    }, "This passport has expired"),
  frequentFlyer: z.string().trim().optional(),
  relationship: z.string().trim().optional(),
});
type TravellerValues = z.infer<typeof travellerSchema>;

const EMPTY: TravellerValues = {
  type: "adult",
  title: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",
  nationality: "",
  passportNo: "",
  passportCountry: "",
  passportExpiry: "",
  frequentFlyer: "",
  relationship: "",
};

const CountryOptions = () => (
  <>
    <option value="">Select</option>
    {COUNTRIES.map((c) => (
      <option key={c.code} value={c.code}>
        {c.name}
      </option>
    ))}
  </>
);

function TravellerDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (open: boolean) => void; editing: SavedTraveller | null }) {
  const form = useForm<TravellerValues>({ resolver: zodResolver(travellerSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;
  const { reset } = form;

  useEffect(() => {
    if (open)
      reset(editing ? { ...EMPTY, ...editing, middleName: editing.middleName ?? "", frequentFlyer: editing.frequentFlyer ?? "", relationship: editing.relationship ?? "" } : EMPTY);
  }, [open, editing, reset]);

  const today = toISODate(new Date());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Edit traveller" : "Add a traveller"} description="Saved securely to your account so you can book faster." size="lg">
        <form
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await saveTraveller({ ...values, id: editing?.id });
              toast.success(editing ? "Traveller updated" : "Traveller saved");
              onOpenChange(false);
            } catch(error) {
              if(error instanceof ApiClientError && error.fields) for(const [field,messages] of Object.entries(error.fields)) if(field in EMPTY) form.setError(field as keyof TravellerValues,{type:"server",message:messages[0]});
              toast.error(error instanceof Error ? error.message : "Please try again.");
            }
          })}
          className="grid gap-4 sm:grid-cols-6"
        >
          <Field label="Traveller type" htmlFor="tv-type" className="sm:col-span-2">
            <Select id="tv-type" {...form.register("type")}>
              <option value="adult">Adult (12+)</option>
              <option value="child">Child (2–11)</option>
              <option value="infant">Infant (under 2)</option>
            </Select>
          </Field>
          <Field label="Title" htmlFor="tv-title" error={errors.title?.message} required className="sm:col-span-1">
            <Select id="tv-title" invalid={!!errors.title} {...form.register("title")}>
              <option value="">Select</option>
              {["Mr", "Mrs", "Ms", "Miss", "Dr", "Master"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Relationship" htmlFor="tv-rel" optional className="sm:col-span-3">
            <Input id="tv-rel" placeholder="e.g. Spouse, Son, Mother" {...form.register("relationship")} />
          </Field>
          <Field label="First name" htmlFor="tv-first" error={errors.firstName?.message} required className="sm:col-span-2">
            <Input id="tv-first" invalid={!!errors.firstName} {...form.register("firstName")} />
          </Field>
          <Field label="Middle name" htmlFor="tv-mid" optional className="sm:col-span-2">
            <Input id="tv-mid" {...form.register("middleName")} />
          </Field>
          <Field label="Last name" htmlFor="tv-last" error={errors.lastName?.message} required className="sm:col-span-2">
            <Input id="tv-last" invalid={!!errors.lastName} {...form.register("lastName")} />
          </Field>
          <Field label="Date of birth" htmlFor="tv-dob" error={errors.dob?.message} required className="sm:col-span-2">
            <Input id="tv-dob" type="date" max={today} invalid={!!errors.dob} {...form.register("dob")} />
          </Field>
          <Field label="Gender" htmlFor="tv-gender" error={errors.gender?.message} required className="sm:col-span-2">
            <Select id="tv-gender" invalid={!!errors.gender} {...form.register("gender")}>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </Select>
          </Field>
          <Field label="Nationality" htmlFor="tv-nat" error={errors.nationality?.message} required className="sm:col-span-2">
            <Select id="tv-nat" invalid={!!errors.nationality} {...form.register("nationality")}>
              <CountryOptions />
            </Select>
          </Field>
          <Field label="Passport number" htmlFor="tv-pp" error={errors.passportNo?.message} required className="sm:col-span-2">
            <Input id="tv-pp" className="uppercase" invalid={!!errors.passportNo} {...form.register("passportNo")} />
          </Field>
          <Field label="Issuing country" htmlFor="tv-ppc" error={errors.passportCountry?.message} required className="sm:col-span-2">
            <Select id="tv-ppc" invalid={!!errors.passportCountry} {...form.register("passportCountry")}>
              <CountryOptions />
            </Select>
          </Field>
          <Field label="Passport expiry" htmlFor="tv-ppe" error={errors.passportExpiry?.message} required className="sm:col-span-2">
            <Input id="tv-ppe" type="date" min={today} invalid={!!errors.passportExpiry} {...form.register("passportExpiry")} />
          </Field>
          <Field label="Frequent flyer number" htmlFor="tv-ff" optional className="sm:col-span-3">
            <Input id="tv-ff" {...form.register("frequentFlyer")} />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save changes" : "Save traveller"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const Term = ({ children }: { children: string }) => <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</dt>;

export function TravellersPage() {
  const travellers = useAccountStore((s) => s.travellers);
  const [dialog, setDialog] = useState<{ open: boolean; editing: SavedTraveller | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<SavedTraveller | null>(null);
  const [removing, setRemoving] = useState(false);
  const add = () => setDialog({ open: true, editing: null });

  return (
    <div>
      <PageTitle
        title="Saved Travellers"
        subtitle="Book faster by saving the people you travel with."
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={add}>
            Add traveller
          </Button>
        }
      />
      {travellers.length === 0 ? (
        <StateView
          icon={<UserRound className="h-7 w-7" />}
          title="No saved travellers"
          description="Add family members or colleagues and select them in one tap when booking."
          actions={<Button onClick={add}>Add your first traveller</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {travellers.map((t) => {
            const expiry = parseDate(t.passportExpiry);
            const monthsLeft = expiry ? differenceInMonths(expiry, new Date()) : 99;
            return (
              <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                    {initials(`${t.firstName} ${t.lastName}`)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold text-navy-900">
                      {t.title} {t.firstName} {t.middleName} {t.lastName}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {t.type}
                      {t.relationship ? ` · ${t.relationship}` : ""}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                      <div>
                        <Term>Born</Term>
                        <dd className="font-semibold text-navy-900">{formatDateMed(t.dob)}</dd>
                      </div>
                      <div>
                        <Term>Nationality</Term>
                        <dd className="font-semibold text-navy-900">{countryName(t.nationality)}</dd>
                      </div>
                      <div>
                        <Term>Passport</Term>
                        <dd className="font-mono font-semibold text-navy-900">{t.passportNo.replace(/.(?=.{3})/g, "•")}</dd>
                      </div>
                      <div>
                        <Term>Expires</Term>
                        <dd className="font-semibold text-navy-900">
                          {formatDateMed(t.passportExpiry)}
                          {monthsLeft < 6 && (
                            <Badge tone="warning" className="ml-1.5">
                              {monthsLeft < 0 ? "Expired" : "Expiring soon"}
                            </Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDialog({ open: true, editing: t })}>
                    Edit
                  </Button>
                  <Button size="sm" variant="dangerOutline" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleting(t)}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <TravellerDialog open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} editing={dialog.editing} />
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title="Delete this traveller?" description="This removes their details from your account. Existing bookings aren't affected." size="sm">
          <p className="text-sm text-slate-700">
            <b>
              {deleting?.firstName} {deleting?.lastName}
            </b>{" "}
            will be permanently deleted from your saved travellers.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep traveller
            </Button>
            <Button
              variant="danger"
              loading={removing}
              onClick={async () => {
                if (removing) return;
                setRemoving(true);
                try {
                  if (deleting) await deleteTraveller(deleting.id);
                  toast.success("Traveller deleted");
                  setDeleting(null);
                } catch(error) {
                  toast.error(error instanceof Error ? error.message : "Please try again.");
                } finally { setRemoving(false); }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

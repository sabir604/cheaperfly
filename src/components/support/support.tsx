"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Mail, MessageCircle, MessagesSquare, Phone } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import {submitWebsiteInquiry} from "@/lib/engine/inquiries";
import { createSupportCase } from "@/lib/engine/bookings/requests";
import { userOwnsBooking } from "@/lib/engine/bookings/status";
import { useFeatures, useSiteConfig } from "@/lib/site-config";
import { useServerBookings } from "@/lib/engine/server-bookings";
import { useSessionStore } from "@/lib/stores/session";
import { emailField } from "@/lib/validation";
import type { SupportCase } from "@/lib/types/booking";

export const SUPPORT_TOPICS = ["Flights", "Hotels", "Umrah", "Bookings", "Payments", "Changes", "Refunds", "Baggage", "Account", "Something else"];

const supportSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: emailField,
  booking: z.string().optional(),
  topic: z.string().min(1, "Choose a topic"),
  message: z.string().trim().min(15, "Please give us a little more detail (at least 15 characters)").max(1500),
});
type SupportValues = z.infer<typeof supportSchema>;

/** WhatsApp is simulated: it opens a local support case and says so. */
export async function openWhatsAppCase(suffix = "") {
 try {
  const c = await createSupportCase({ topic: "Something else", subject: "WhatsApp chat request", message: "I'd like to chat on WhatsApp.", channel: "whatsapp" });
  toast.info(`WhatsApp is simulated in this prototype. Case ${c.id} saved${suffix}.`);
 } catch {toast.error("Could not save the support case. Please try again.");}
}

/** WhatsApp / phone / email cards. Phone depends on the `telephony` feature flag. */
export function SupportContactOptions({ onWhatsApp, stacked }: { onWhatsApp: () => void; stacked?: boolean }) {
  const { contact } = useSiteConfig();
  const features = useFeatures();
  const showPhone = features.telephony && !!contact.phone;
  const showEmail = !!contact.email;
  const count = 1 + Number(showPhone) + Number(showEmail);
  return (
    <div className={stacked ? "grid gap-3" : count >= 3 ? "grid gap-3 sm:grid-cols-3" : count === 2 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
      <button
        type="button"
        onClick={onWhatsApp}
        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-400"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <MessageCircle className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-bold text-navy-900">{features.whatsappSupport ? "WhatsApp" : "Message us"}</span>
          <span className="block text-xs text-slate-500">
            {features.whatsappSupport ? "Chat with the team (demo — opens a local case)" : "Send a message (demo — opens a local case)"}
          </span>
        </span>
      </button>
      {showPhone && (
        <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-400">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Phone className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-bold text-navy-900">Call us</span>
            <span className="block text-xs text-slate-500">
              {contact.phone}
              {contact.phoneHours ? ` · ${contact.phoneHours}` : ""}
            </span>
          </span>
        </a>
      )}
      {showEmail && (
        <a href={`mailto:${contact.email}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-400">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-bold text-navy-900">Email</span>
            <span className="block text-xs text-slate-500">{contact.email}</span>
          </span>
        </a>
      )}
    </div>
  );
}

/** Message form. Signed-in users skip name/email and pick from their bookings. Creates a persisted server case. */
export function SupportForm({ defaultBooking, compact, inquiry=false }: { defaultBooking?: string; compact?: boolean; inquiry?:boolean }) {
  const user = useSessionStore((s) => s.user);
  const profile = useSessionStore((s) => s.profile);
  const bookings = useServerBookings((s) => s.bookings).filter((b) => userOwnsBooking(b, user));
  const [created, setCreated] = useState<Pick<SupportCase,"id"> | null>(null);
  const retry=useRef<{body:string;key:string}|null>(null);
  const form = useForm<SupportValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: profile ? `${profile.firstName} ${profile.lastName}` : "", email: user?.email ?? "", booking: defaultBooking ?? "", topic: "", message: "" },
  });
  const { errors, isSubmitting } = form.formState;

  // Session loads after first render; fill identity fields once it arrives.
  useEffect(() => {
    if (user && !form.getValues("email")) {
      form.setValue("email", user.email);
      form.setValue("name", `${user.firstName} ${user.lastName}`);
    }
  }, [user, form]);

  if (created)
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
        </span>
        <h3 className="text-xl font-extrabold">{inquiry?"Inquiry received":"Support case created"}</h3>
        <p className="mt-1 text-sm text-slate-700">
          Your reference is <b className="font-mono text-navy-900">{created.id}</b>. It is saved securely for staff review. No external chat, email or automatic agent reply was sent.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {user && !inquiry && <ButtonLink href="/account/support">View my cases</ButtonLink>}
          <Button
            variant="outline"
            onClick={() => {
              setCreated(null);
              form.reset({ ...form.getValues(), message: "", topic: "" });
            }}
          >
            Send another message
          </Button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      onSubmit={(event)=>{void form.handleSubmit(async (v) => {
        await new Promise((r) => setTimeout(r, 600));
        try {
        if(inquiry){
          const body={name:v.name,email:v.email,topic:v.topic,message:v.message,...(v.booking?{bookingRef:v.booking}:{})};
          const serialized=JSON.stringify(body);
          if(retry.current?.body!==serialized)retry.current={body:serialized,key:crypto.randomUUID()};
          const receipt=await submitWebsiteInquiry(body,retry.current!.key);
          setCreated({id:receipt.reference});toast.success('Inquiry saved for staff review. No email was sent.');
        }else{
          const c = await createSupportCase({ topic: v.topic, subject: `${v.topic}${v.booking ? ` — ${v.booking}` : ""}`, message: v.message, bookingRef: v.booking || undefined });
          setCreated(c);toast.success(`Case ${c.id} saved`);
        }
        } catch {toast.error("Could not save your message. Please try again.");}
      })(event);}}
      className="grid gap-4 sm:grid-cols-2"
      aria-label="Message support"
    >
      {!compact && (
        <InlineNotice tone="info" className="sm:col-span-2">
          Your message is saved securely for staff review. No external message or email is delivered in this simulation.
        </InlineNotice>
      )}
      {!user && (
        <>
          <Field label="Your name" htmlFor="sp-name" error={errors.name?.message} required>
            <Input id="sp-name" autoComplete="name" invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <Field label="Email address" htmlFor="sp-email" error={errors.email?.message} required>
            <Input id="sp-email" type="email" autoComplete="email" invalid={!!errors.email} {...form.register("email")} />
          </Field>
        </>
      )}
      <Field label="Booking" htmlFor="sp-booking" hint={user ? undefined : "Enter your booking reference, e.g. CF-847291"}>
        {user && bookings.length > 0 ? (
          <Select id="sp-booking" {...form.register("booking")}>
            <option value="">Not about a specific booking</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.title}
              </option>
            ))}
          </Select>
        ) : (
          <Input id="sp-booking" placeholder="CF-000000 (optional)" {...form.register("booking")} />
        )}
      </Field>
      <Field label="Topic" htmlFor="sp-topic" error={errors.topic?.message} required>
        <Select id="sp-topic" invalid={!!errors.topic} {...form.register("topic")}>
          <option value="">Choose a topic</option>
          {SUPPORT_TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <Field label="Message" htmlFor="sp-msg" error={errors.message?.message} required className="sm:col-span-2">
        <Textarea
          id="sp-msg"
          rows={6}
          maxLength={1500}
          invalid={!!errors.message}
          placeholder="How can we help? Include dates, names and anything that will help us find the booking."
          {...form.register("message")}
        />
      </Field>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs text-slate-500">
          By contacting us you agree to our{" "}
          <Link href="/legal/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
        <Button type="submit" size="lg" loading={isSubmitting} leftIcon={<MessagesSquare className="h-4 w-4" />}>
          Send message
        </Button>
      </div>
    </form>
  );
}

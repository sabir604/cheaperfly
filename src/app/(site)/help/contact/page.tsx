import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ShieldCheck } from "lucide-react";
import { ContactOptions, ContactForm } from "./contact-client";

export const metadata: Metadata = { title: "Contact support" };

export default async function ContactPage({ searchParams }: PageProps<"/help/contact">) {
  const { booking } = await searchParams;
  return (
    <div className="container-page py-12">
      <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-500">
        <Link className="hover:text-brand-600" href="/help">
          Help centre
        </Link>{" "}
        / <span className="text-slate-700">Contact support</span>
      </nav>
      <h1 className="text-[32px] font-extrabold">Contact support</h1>
      <p className="mt-1 max-w-2xl text-slate-600">Choose the channel that suits you. For anything about an existing booking, include the reference so we can help faster.</p>
      <div className="mt-8">
        <ContactOptions />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="msg-h" className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 id="msg-h" className="mb-4 text-lg font-bold">
            Message support
          </h2>
          <ContactForm defaultBooking={typeof booking === "string" ? booking : undefined} />
        </section>
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
              <Clock className="h-4 w-4 text-brand-600" aria-hidden /> Opening hours
            </p>
            <p className="mt-1 text-sm text-slate-600">Phone, WhatsApp and messages: 24 hours a day, 7 days a week. Typical first reply under 5 minutes on chat.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> Prototype notice
            </p>
            <p className="mt-1 text-sm text-slate-600">Messages create an inquiry saved securely for staff review. No email or external message is delivered in this simulation.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

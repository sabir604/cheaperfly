"use client";

import { SupportContactOptions, SupportForm, openWhatsAppCase } from "@/components/support/support";

export function ContactOptions() {
  return <SupportContactOptions onWhatsApp={() => openWhatsAppCase()} />;
}

export function ContactForm({ defaultBooking }: { defaultBooking?: string }) {
  return <SupportForm defaultBooking={defaultBooking} />;
}

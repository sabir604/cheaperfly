import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { BadgeCheck, Bus, Check, FileCheck2, Headset, Hotel, MessageCircle, Plane, Users } from "lucide-react";
import { Photo } from "@/components/photo";
import { UmrahSearchForm } from "@/components/search/umrah-search-form";
import { ButtonLink } from "@/components/ui/button";
import { Accordion } from "@/components/ui/disclosure";
import { FeaturedPackages, HolyHotels } from "@/components/umrah/featured";

export const metadata: Metadata = {
  title: "Umrah packages",
  description: "Umrah packages with visa, flights, hotels near the Haramain and transfers included.",
};

const WHY = [
  { icon: FileCheck2, title: "Visa handled for you", body: "We process Umrah visas for every traveller and tell you exactly which documents we need." },
  { icon: Hotel, title: "Honest distances", body: "Every hotel lists its walking distance to the Haram or Masjid an-Nabawi — no vague 'near' claims." },
  { icon: Users, title: "Built for families & elders", body: "Family rooms, child pricing, wheelchair assistance and gentler itineraries." },
  { icon: Headset, title: "Support on the ground", body: "Our team and WhatsApp line are available 24/7 in Makkah and Madinah." },
];

const INCLUDED = [
  { icon: Plane, title: "Return flights", body: "Economy flights from your UK airport with baggage." },
  { icon: FileCheck2, title: "Umrah visa", body: "Visa processing and Saudi e-visa fee." },
  { icon: Hotel, title: "Makkah & Madinah hotels", body: "Room type and distances shown upfront." },
  { icon: Bus, title: "Transfers", body: "Airport, Makkah and Madinah transfers with meet & greet." },
];

const FAQS = [
  {
    q: "Is the Umrah visa included?",
    a: "Yes. All Cheaperfly Umrah packages include Umrah visa processing and the Saudi e-visa fee. We will contact you within 24 hours of booking to collect passport scans and a passport-style photo.",
  },
  {
    q: "How far are the hotels from the Haram?",
    a: "Every package shows the exact walking distance to Masjid al-Haram and Al-Masjid an-Nabawi. Our closest hotels are 120–260 m away with direct pedestrian access; value options are 0.9–3 km away with free shuttles.",
  },
  {
    q: "Can I customise the package?",
    a: "Yes. You can choose the room type, upgrade your Makkah or Madinah hotel, pick a different flight and transfer style, and add ziyarat tours, an Ihram kit, eSIM, or insurance before you pay.",
  },
  {
    q: "Can I travel with children and elderly parents?",
    a: "Absolutely. Family rooms, child pricing (75% of adult) and mobility assistance are available. Our Family Umrah package is designed at a gentler pace with private transfers.",
  },
  {
    q: "What if I need to change or cancel?",
    a: "You can request changes or cancellation from your account. Refunds depend on hotel and airline conditions and the time before departure; the refund workflow shows the estimated amount before you submit.",
  },
  {
    q: "Do you provide a guide in Makkah and Madinah?",
    a: "Our in-country team is on call 24/7 via WhatsApp and there is a representative at each hotel. Scholar-led orientation and ziyarat tours can be added as extras.",
  },
];

function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow mb-1.5 text-gold-600">{eyebrow}</p>
      <h2 className="text-[28px] font-extrabold leading-tight text-umrah-900">{title}</h2>
      {subtitle && <p className="mt-2 text-[15px] text-slate-600">{subtitle}</p>}
    </div>
  );
}

export default async function UmrahPage() {
  // Package prices and departure months are relative to today, so render per request.
  await connection();
  return (
    <>
      <section className="relative isolate bg-umrah-950">
        <Photo src="/images/makkah-clocktower.jpg" alt="" priority sizes="100vw" className="absolute inset-0 -z-10" position="50% 30%" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-umrah-950/95 via-umrah-900/80 to-umrah-900/25" />
        <div className="container-page pb-32 pt-14 sm:pb-36 sm:pt-20">
          <p className="eyebrow mb-4 text-gold-400">Cheaperfly Umrah</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] !text-white sm:text-[54px]" style={{ letterSpacing: "-0.03em" }}>
            Your Umrah,
            <br /> arranged with care.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-umrah-100">
            Hotels close to the Haramain, flights, visa and transfers in one package — with guidance and support at every step of your journey.
          </p>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium text-white">
            {["Visa processing included", "Hotels from 120 m of the Haramain", "24/7 pilgrim support"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <BadgeCheck className="h-[18px] w-[18px] text-gold-400" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="container-page relative z-10 -mt-24">
        <div className="rounded-xl border-t-4 border-gold-500 bg-white p-5 shadow-pop sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold text-umrah-900">Find your package</h2>
          <UmrahSearchForm idPrefix="ul" />
        </div>
      </div>
      <section className="container-page pt-20">
        <Heading
          eyebrow="Featured packages"
          title="Choose the journey that fits your family"
          subtitle="From focused, affordable trips to Kaaba-view luxury — every package includes visa, flights, hotels and transfers."
        />
        <span id="fp-h" className="sr-only">
          Featured Umrah packages
        </span>
        <FeaturedPackages />
        <div className="mt-8 text-center">
          <ButtonLink href="/umrah/packages" variant="umrah" size="lg">
            View all packages
          </ButtonLink>
        </div>
      </section>
      <section className="container-page pt-20">
        <Heading eyebrow="Makkah" title="Hotels close to Masjid al-Haram" subtitle="Walking distance is measured to the Haram courtyards." />
        <span id="mk-h" className="sr-only">
          Makkah hotels
        </span>
        <HolyHotels city="makkah" />
      </section>
      <section className="container-page pt-16">
        <Heading eyebrow="Madinah" title="Stay near Al-Masjid an-Nabawi" subtitle="From hotels facing the Prophet's Mosque to good-value options with free shuttles." />
        <span id="md-h" className="sr-only">
          Madinah hotels
        </span>
        <HolyHotels city="madinah" />
      </section>
      <section className="mt-24 bg-umrah-50 py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative">
            <Photo src="/images/madinah-nabawi.jpg" alt="Al-Masjid an-Nabawi at sunset" ratio="4/3" className="rounded-2xl" sizes="(min-width:1024px) 560px, 100vw" />
            <div className="absolute -bottom-5 -right-2 hidden w-48 overflow-hidden rounded-xl border-4 border-umrah-50 shadow-pop sm:block">
              <Photo src="/images/quran-gold.jpg" alt="" ratio="4/3" sizes="192px" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1.5 text-gold-600">Why Cheaperfly Umrah</p>
            <h2 id="why-h" className="text-[30px] font-extrabold leading-tight text-umrah-900">
              Focus on worship. We’ll handle the rest.
            </h2>
            <ul className="mt-6 space-y-5">
              {WHY.map((w) => (
                <li key={w.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-umrah-800 text-gold-400">
                    <w.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[16px] font-bold text-umrah-900">{w.title}</span>
                    <span className="block text-sm text-slate-600">{w.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="container-page pt-20">
        <Heading eyebrow="Included in every package" title="Everything you need for the journey" />
        <span id="inc-h" className="sr-only">
          Package inclusions
        </span>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INCLUDED.map((x) => (
            <li key={x.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <x.icon className="mb-3 h-6 w-6 text-umrah-700" aria-hidden />
              <h3 className="text-[15px] font-bold text-navy-900">{x.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{x.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="container-page pt-20">
        <div className="grid overflow-hidden rounded-2xl bg-umrah-900 text-white lg:grid-cols-[1.2fr_1fr]">
          <div className="p-8 sm:p-12">
            <p className="eyebrow mb-2 text-gold-400">Assistance</p>
            <h2 id="sup-h" className="!text-white text-[28px] font-extrabold leading-tight">
              Guidance before you go, help while you’re there
            </h2>
            <p className="mt-3 max-w-md text-umrah-100/90">
              Get a pre-departure briefing, a printed guide to the rites of Umrah, and a WhatsApp line to our pilgrim team in Makkah and Madinah.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/help/contact" variant="gold" size="lg" leftIcon={<MessageCircle className="h-4 w-4" />}>
                Talk to our Umrah team
              </ButtonLink>
              <ButtonLink href="/help/umrah" size="lg" variant="ghost" className="text-white hover:bg-white/10">
                Umrah help centre
              </ButtonLink>
            </div>
          </div>
          <Photo src="/images/makkah-kaaba.jpg" alt="" scrim className="min-h-[220px]" sizes="(min-width:1024px) 45vw, 100vw" />
        </div>
      </section>
      <section id="faq" className="container-page scroll-mt-24 pt-20">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <Heading eyebrow="FAQ" title="Umrah questions, answered" />
          <div id="faq-h" className="rounded-xl border border-slate-200 bg-white px-6">
            {FAQS.map((f, i) => (
              <Accordion key={f.q} title={f.q} defaultOpen={i === 0} icon={<Check className="h-4 w-4 text-umrah-700" />}>
                {f.a}
              </Accordion>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

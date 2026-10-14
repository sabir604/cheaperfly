import type { Metadata } from "next";
import { connection } from "next/server";
import { Check, Luggage, Repeat, Ticket } from "lucide-react";
import { FlightDeals, PopularDestinations, RecentSearches } from "@/components/flights/deals";
import { Photo } from "@/components/photo";
import { BookingEngine } from "@/components/search/booking-engine";
import { Accordion } from "@/components/ui/disclosure";
import { SectionHeading } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cheap flights",
  description: "Compare fares across airlines with clear baggage and flexibility information.",
};

const FARE_TYPES = [
  {
    name: "Saver",
    icon: <Ticket className="h-5 w-5 text-slate-700" />,
    points: ["Lowest price", "Cabin bag included, checked bag often extra", "No changes or refunds", "Seats cost extra"],
  },
  {
    name: "Flex",
    icon: <Repeat className="h-5 w-5 text-brand-700" />,
    points: ["Small premium over Saver", "Checked bag and free standard seat", "Changes for a fee", "Partly refundable"],
    featured: true,
  },
  {
    name: "Flex Plus",
    icon: <Luggage className="h-5 w-5 text-emerald-700" />,
    points: ["Everything included", "Two checked bags, preferred seat", "Free changes", "Fully refundable"],
  },
];

const FAQS = [
  {
    q: "Are taxes and fees included in the price I see?",
    a: "Yes. Search results show the per-person price including taxes and carrier charges. Optional extras such as seats and extra baggage are added at checkout and always shown before you pay.",
  },
  {
    q: "What's the difference between fare types?",
    a: "Each airline sells fare families — for example Saver, Flex and Flex Plus — that differ in baggage, seat selection, changes and refunds. We show them side by side so you can choose before entering passenger details.",
  },
  {
    q: "Can I change or cancel after booking?",
    a: "That depends on your fare. Flexible fares can be changed or refunded for a small fee (or free), while Saver fares are usually non-refundable. You can request changes and refunds from your account and track the case.",
  },
  {
    q: "How do I add extra baggage or choose a seat?",
    a: "During booking you can add extra baggage, meals, special assistance and pick seats on an interactive seat map. After booking, use Manage Booking to add baggage or change your seat.",
  },
  {
    q: "Are children and infants priced differently?",
    a: "Yes. Children (2–11) pay 75% of the adult fare plus taxes, and infants under 2 travelling on a lap pay 10% of the fare plus reduced taxes. Each infant must travel with an adult.",
  },
];

export default async function FlightsPage() {
  // Default search dates and "from" prices are relative to today, so render per request.
  await connection();
  return (
    <>
      <section className="relative isolate bg-navy-950">
        <Photo src="/images/air-wing-pink.jpg" alt="" priority sizes="100vw" className="absolute inset-0 -z-10" position="50% 35%" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/20" />
        <div className="container-page pb-28 pt-12 sm:pb-32 sm:pt-16">
          <p className="eyebrow mb-3 text-brand-200">Flights</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] !text-white sm:text-5xl" style={{ letterSpacing: "-0.03em" }}>
            The right flight,
            <br /> at the right price.
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-slate-200">
            Compare airlines side by side, see baggage and flexibility upfront and pick your seat before you pay.
          </p>
        </div>
      </section>
      <div className="container-page relative z-10 -mt-20 sm:-mt-24">
        <BookingEngine />
      </div>
      <RecentSearches />
      <PopularDestinations />
      <FlightDeals />
      <section aria-labelledby="fares-h" className="container-page pt-24">
        <SectionHeading
          eyebrow="Know before you book"
          title={<span id="fares-h">Fare types, explained simply</span>}
          subtitle="Every airline names its fares differently. Here's how to think about them."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {FARE_TYPES.map((f) => (
            <div key={f.name} className={cn("rounded-xl border bg-white p-6", f.featured ? "border-brand-300 shadow-card" : "border-slate-200")}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">{f.icon}</span>
                <h3 className="text-lg font-bold">{f.name}</h3>
              </div>
              <ul className="space-y-2.5 text-[14px] text-slate-600">
                {f.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="faq-h" className="container-page pt-24">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <SectionHeading title={<span id="faq-h">Flight questions, answered</span>} subtitle="Can't find what you need? Our support team is available 24/7." />
          <div className="rounded-xl border border-slate-200 bg-white px-6">
            {FAQS.map((f, i) => (
              <Accordion key={f.q} title={f.q} defaultOpen={i === 0}>
                {f.a}
              </Accordion>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

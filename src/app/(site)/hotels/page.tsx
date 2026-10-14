import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, CalendarCheck2, CreditCard, Tag, ThumbsUp } from "lucide-react";
import { RecommendedHotels } from "@/components/home/sections";
import { Photo } from "@/components/photo";
import { BookingEngine } from "@/components/search/booking-engine";
import { Accordion } from "@/components/ui/disclosure";
import { SectionHeading } from "@/components/ui/primitives";
import { DESTINATIONS, getDestination } from "@/data/hotels";
import { defaultHotelDates, defaultOccupancy, hotelSearchHref } from "@/lib/engine/criteria";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Hotels",
  description: "Find hotels with free cancellation, honest prices and real guest reviews.",
};

const WHY = [
  { icon: CalendarCheck2, title: "Free cancellation", body: "Most rooms can be cancelled free until a clearly stated date." },
  { icon: Tag, title: "Transparent totals", body: "Nightly rate, taxes and fees itemised before you pay." },
  { icon: ThumbsUp, title: "Real guest reviews", body: "Scores and comments from stays at each property." },
  { icon: CreditCard, title: "Pay now or later", body: "Flexible rates let you settle up at the hotel." },
];

const FAQS = [
  {
    q: "What does free cancellation mean?",
    a: "Rates marked 'Free cancellation' can be cancelled without a fee until the date shown. After that date the first night or the full stay may be charged. Non-refundable rates can't be cancelled or changed.",
  },
  {
    q: "When do I pay?",
    a: "Most rates are paid online at booking. Flexible rates let you pay at the hotel — your card is only used to guarantee the booking. You'll always see which applies before you pay.",
  },
  {
    q: "Are taxes included?",
    a: "Taxes and municipality fees are itemised at checkout together with our small service fee. Some destinations (like Dubai) also charge a Tourism Dirham fee directly at the property, which is stated on the hotel page.",
  },
  {
    q: "Can I book for Umrah?",
    a: "Yes. Makkah and Madinah hotels show walking distance to the Haram and Masjid an-Nabawi, meal plans and shuttle details. For visa, flights and transfers included, try our Umrah packages.",
  },
];

export default async function HotelsPage({ searchParams }: PageProps<"/hotels">) {
  // Default search dates are relative to today, so render per request.
  await connection();
  const dest = (await searchParams).dest;
  const destination = typeof dest === "string" && getDestination(dest) ? dest : undefined;
  const dates = defaultHotelDates();
  return (
    <>
      <section className="relative isolate bg-navy-950">
        <Photo src="/images/hotel-infinity.jpg" alt="" priority sizes="100vw" className="absolute inset-0 -z-10" position="50% 60%" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/65 to-navy-950/10" />
        <div className="container-page pb-28 pt-12 sm:pb-32 sm:pt-16">
          <p className="eyebrow mb-3 text-brand-200">Hotels</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] !text-white sm:text-5xl" style={{ letterSpacing: "-0.03em" }}>
            Stay somewhere
            <br /> you’ll remember.
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-slate-200">Free cancellation on most rooms, honest prices and reviews from real guests.</p>
        </div>
      </section>
      <div className="container-page relative z-10 -mt-20 sm:-mt-24">
        <BookingEngine defaultTab="hotels" hotelDestination={destination} />
      </div>
      <section className="container-page pt-16">
        <SectionHeading eyebrow="Destinations" title={<span id="dest-h">Where to stay</span>} subtitle="Six destinations, handpicked properties." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d, i) => (
            <Link
              key={d.id}
              href={hotelSearchHref({ destination: d.id, checkIn: dates.checkIn, checkOut: dates.checkOut, occupancy: defaultOccupancy() })}
              className={cn("group relative block overflow-hidden rounded-xl", i === 0 && "lg:col-span-2")}
            >
              <Photo
                src={d.image}
                alt=""
                scrim
                className={cn("h-56", i === 0 && "lg:h-72")}
                imgClassName="transition-transform duration-700 group-hover:scale-105"
                sizes="(min-width:1024px) 50vw, 100vw"
              />
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-5">
                <div>
                  <h3 className="text-2xl font-extrabold text-white">{d.city}</h3>
                  <p className="text-sm text-white/80">
                    {d.properties} properties · near {d.center}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur group-hover:bg-white group-hover:text-navy-900">
                  <ArrowUpRight className="h-5 w-5" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <RecommendedHotels />
      <section className="container-page pt-24">
        <SectionHeading eyebrow="Book with confidence" title={<span id="why-h">Why book hotels with Cheaperfly</span>} />
        <ul className="grid gap-y-8 border-t border-slate-200 pt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {WHY.map((w, i) => (
            <li key={w.title} className={cn("lg:px-7", i === 0 ? "lg:pl-0" : "lg:border-l lg:border-slate-200")}>
              <w.icon className="mb-3 h-6 w-6 text-brand-600" aria-hidden />
              <h3 className="text-[16px] font-bold">{w.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{w.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="container-page pt-24">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <SectionHeading title={<span id="faq-h">Hotel questions, answered</span>} />
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

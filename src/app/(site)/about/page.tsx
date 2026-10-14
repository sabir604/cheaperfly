import type { Metadata } from "next";
import { Photo } from "@/components/photo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "About Cheaperfly" };

const VALUES = [
  { title: "Transparent pricing", body: "Taxes, fees and extras shown before you pay." },
  { title: "Flexibility", body: "Self-service changes and refund tracking." },
  { title: "Care", body: "24/7 support in English, Arabic and Urdu." },
];

export default function AboutPage() {
  return (
    <div>
      <section className="relative isolate bg-navy-950">
        <Photo src="/images/air-tarmac.jpg" className="absolute inset-0 -z-10" sizes="100vw" position="50% 60%" />
        <div className="absolute inset-0 -z-10 bg-navy-950/75" />
        <div className="container-page py-20">
          <p className="eyebrow mb-3 text-brand-200">About us</p>
          <h1 className="max-w-2xl text-4xl font-extrabold !text-white sm:text-5xl" style={{ letterSpacing: "-0.03em" }}>
            Making travel honest, simple and affordable.
          </h1>
        </div>
      </section>
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5 text-[16px] leading-relaxed text-slate-700">
          <p>
            Cheaperfly was created to make booking flights, hotels and Umrah packages feel straightforward: clear prices, clear rules and real people when you
            need them.
          </p>
          <p>
            We compare fares across airlines, explain fare rules in plain English, and show every tax, fee and extra before you pay. For pilgrims, we combine
            visa processing, hotels close to the Haramain, flights and transfers into packages you can tailor to your family.
          </p>
          <p>This site is a prototype experience built to demonstrate how the customer journey will work. All inventory, prices and payments are simulated.</p>
          <div className="pt-2">
            <ButtonLink href="/help/contact">Get in touch</ButtonLink>
          </div>
        </div>
        <ul className="space-y-4">
          {VALUES.map((v) => (
            <li key={v.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-[16px] font-bold">{v.title}</h2>
              <p className="text-sm text-slate-600">{v.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { UmrahDetail } from "@/components/umrah/umrah-detail";
import { StateView } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { parseUmrahCriteria } from "@/lib/engine/criteria";
import { readUmrahPackage } from "@/server/umrah-catalogue";

export async function generateMetadata({ params }: PageProps<"/umrah/packages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const {pkg}=await readUmrahPackage(slug);
  return pkg ? { title: pkg.name } : {};
}

export default async function UmrahPackagePage({ params, searchParams }: PageProps<"/umrah/packages/[slug]">) {
  // Departure dates are relative to today, so render per request.
  await connection();
  const {pkg,status}=await readUmrahPackage((await params).slug);
  if(status===404)notFound();
  if(!pkg)return <div className="container-page py-16"><StateView tone="warning" title="We couldn’t load this package" description="Please try again shortly." actions={<ButtonLink href="/umrah/packages">Browse packages</ButtonLink>} /></div>;
  const query = await searchParams;
  const c = parseUmrahCriteria(query);
  // The search link carries the party, departure city and travel month into the booking card.
  const seed = query.from
    ? {
        departureCity: c.departureCity,
        departureDate: c.month === "any" ? undefined : pkg.departures.find((d) => d.date.startsWith(c.month))?.date,
        adults: c.adults,
        children: c.children,
        infants: c.infants,
      }
    : undefined;
  return <UmrahDetail key={pkg.slug} pkg={pkg} seed={seed} />;
}

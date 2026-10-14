import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { UmrahDetail } from "@/components/umrah/umrah-detail";
import { UMRAH_PACKAGE_DEFS } from "@/data/umrah";
import { parseUmrahCriteria } from "@/lib/engine/criteria";
import { getUmrahPackage } from "@/lib/engine/umrah";

export async function generateMetadata({ params }: PageProps<"/umrah/packages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const def = UMRAH_PACKAGE_DEFS.find((d) => d.slug === slug);
  return def ? { title: def.name } : {};
}

export default async function UmrahPackagePage({ params, searchParams }: PageProps<"/umrah/packages/[slug]">) {
  // Departure dates are relative to today, so render per request.
  await connection();
  const pkg = getUmrahPackage((await params).slug);
  if (!pkg || !pkg.departures.length) notFound();
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

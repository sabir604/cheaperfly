import type { Metadata } from "next";
import { UmrahResults } from "@/components/umrah/umrah-results";
import { parseUmrahCriteria } from "@/lib/engine/criteria";

export const metadata: Metadata = { title: "Umrah packages" };

export default async function UmrahPackagesPage({ searchParams }: PageProps<"/umrah/packages">) {
  const criteria = parseUmrahCriteria(await searchParams);
  return <UmrahResults key={JSON.stringify(criteria)} criteria={criteria} />;
}

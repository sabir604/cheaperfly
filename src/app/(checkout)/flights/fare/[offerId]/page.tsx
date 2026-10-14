import type { Metadata } from "next";
import { FareSelection } from "@/components/checkout/fare-selection";

export const metadata: Metadata = { title: "Choose your fare" };

export default async function FarePage({ params }: PageProps<"/flights/fare/[offerId]">) {
  const { offerId } = await params;
  return <FareSelection offerId={decodeURIComponent(offerId)} />;
}

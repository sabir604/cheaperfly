import type { Metadata } from "next";
import { UmrahTravellersStep } from "@/components/checkout/umrah-steps";

export const metadata: Metadata = { title: "Traveller details" };

export default function TravellersPage() {
  return <UmrahTravellersStep />;
}

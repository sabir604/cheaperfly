import type { Metadata } from "next";
import { SeatsStep } from "@/components/checkout/seats-step";

export const metadata: Metadata = { title: "Choose your seats" };

export default function SeatsPage() {
  return <SeatsStep />;
}

import type { Metadata } from "next";
import { ExtrasStep } from "@/components/checkout/extras-step";

export const metadata: Metadata = { title: "Baggage, meals & assistance" };

export default function ExtrasPage() {
  return <ExtrasStep />;
}

import type { Metadata } from "next";
import { PassengersStep } from "@/components/checkout/passengers-step";

export const metadata: Metadata = { title: "Passenger details" };

export default function PassengersPage() {
  return <PassengersStep />;
}

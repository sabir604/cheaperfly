import type { Metadata } from "next";
import { UmrahReviewStep } from "@/components/checkout/umrah-steps";

export const metadata: Metadata = { title: "Review your Umrah booking" };

export default function UmrahReviewPage() {
  return <UmrahReviewStep />;
}

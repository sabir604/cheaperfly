import type { Metadata } from "next";
import { ReviewStep } from "@/components/checkout/review-step";

export const metadata: Metadata = { title: "Review your booking" };

export default function ReviewPage() {
  return <ReviewStep />;
}

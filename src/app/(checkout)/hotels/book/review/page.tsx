import type { Metadata } from "next";
import { HotelReviewStep } from "@/components/checkout/hotel-steps";

export const metadata: Metadata = { title: "Review your stay" };

export default function HotelReviewPage() {
  return <HotelReviewStep />;
}

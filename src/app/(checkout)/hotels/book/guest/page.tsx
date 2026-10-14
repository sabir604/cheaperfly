import type { Metadata } from "next";
import { HotelGuestStep } from "@/components/checkout/hotel-steps";

export const metadata: Metadata = { title: "Guest details" };

export default function GuestPage() {
  return <HotelGuestStep />;
}

import type { Metadata } from "next";
import { BookingDetailPage } from "@/components/manage/booking-pages";

export const metadata: Metadata = { title: "Booking details" };

export default async function AccountBookingPage({ params }: PageProps<"/account/bookings/[ref]">) {
  const { ref } = await params;
  return <BookingDetailPage reference={decodeURIComponent(ref)} mode="account" />;
}

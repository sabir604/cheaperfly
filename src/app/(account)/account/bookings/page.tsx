import type { Metadata } from "next";
import { BookingsList } from "@/components/account/my-bookings";

export const metadata: Metadata = { title: "My bookings" };

export default function Page() {
  return <BookingsList />;
}

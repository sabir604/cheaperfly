import type { Metadata } from "next";
import { TripsTimeline } from "@/components/account/my-bookings";

export const metadata: Metadata = { title: "My trips" };

export default function Page() {
  return <TripsTimeline />;
}

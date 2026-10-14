import type { Metadata } from "next";
import { BookingDetailPage } from "@/components/manage/booking-pages";

export const metadata: Metadata = { title: "Your booking" };

export default async function ManageBookingDetailPage({ params }: PageProps<"/manage-booking/[ref]">) {
  const { ref } = await params;
  return (
    <div className="container-page py-8">
      <BookingDetailPage reference={decodeURIComponent(ref)} mode="guest" />
    </div>
  );
}

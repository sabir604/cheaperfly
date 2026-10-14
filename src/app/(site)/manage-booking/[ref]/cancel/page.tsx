import type { Metadata } from "next";
import { CancelPage } from "@/components/manage/booking-pages";

export const metadata: Metadata = { title: "Cancellation & refund request" };

export default async function ManageBookingCancelPage({ params, searchParams }: PageProps<"/manage-booking/[ref]/cancel">) {
  const [{ ref }, { type }] = await Promise.all([params, searchParams]);
  return (
    <div className="container-page py-8">
      <CancelPage reference={decodeURIComponent(ref)} mode="guest" type={typeof type === "string" ? type : undefined} />
    </div>
  );
}

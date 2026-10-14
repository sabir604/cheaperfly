import type { Metadata } from "next";
import { ManagePage } from "@/components/manage/booking-pages";

export const metadata: Metadata = { title: "Manage booking" };

export default async function ManageBookingManagePage({ params, searchParams }: PageProps<"/manage-booking/[ref]/manage">) {
  const [{ ref }, { tab }] = await Promise.all([params, searchParams]);
  return (
    <div className="container-page py-8">
      <ManagePage reference={decodeURIComponent(ref)} mode="guest" tab={typeof tab === "string" ? tab : undefined} />
    </div>
  );
}

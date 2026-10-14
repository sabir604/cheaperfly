import type { Metadata } from "next";
import { ManagePage } from "@/components/manage/booking-pages";

export const metadata: Metadata = { title: "Manage booking" };

export default async function AccountManagePage({ params, searchParams }: PageProps<"/account/bookings/[ref]/manage">) {
  const [{ ref }, { tab }] = await Promise.all([params, searchParams]);
  return <ManagePage reference={decodeURIComponent(ref)} mode="account" tab={typeof tab === "string" ? tab : undefined} />;
}

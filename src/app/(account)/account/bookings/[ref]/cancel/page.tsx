import type { Metadata } from "next";
import { CancelPage } from "@/components/manage/booking-pages";

export const metadata: Metadata = { title: "Cancellation & refund request" };

export default async function AccountCancelPage({ params, searchParams }: PageProps<"/account/bookings/[ref]/cancel">) {
  const [{ ref }, { type }] = await Promise.all([params, searchParams]);
  return <CancelPage reference={decodeURIComponent(ref)} mode="account" type={typeof type === "string" ? type : undefined} />;
}

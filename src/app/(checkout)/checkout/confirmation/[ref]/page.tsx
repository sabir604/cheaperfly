import type { Metadata } from "next";
import { ConfirmationPage } from "@/components/bookings/confirmation-page";

export const metadata: Metadata = { title: "Booking confirmed" };

export default async function Page({ params }: PageProps<"/checkout/confirmation/[ref]">) {
  const { ref } = await params;
  return <ConfirmationPage reference={decodeURIComponent(ref)} />;
}

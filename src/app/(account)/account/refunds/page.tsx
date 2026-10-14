import type { Metadata } from "next";
import { RefundsPage } from "@/components/account/refunds-page";

export const metadata: Metadata = { title: "Refund requests" };

export default function Page() {
  return <RefundsPage />;
}

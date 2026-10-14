import type { Metadata } from "next";
import { PaymentPage } from "@/components/checkout/payment-page";

export const metadata: Metadata = { title: "Payment" };

export default function Page() {
  return <PaymentPage />;
}

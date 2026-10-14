import type { Metadata } from "next";
import { ProcessingPage } from "@/components/checkout/processing-page";

export const metadata: Metadata = { title: "Processing" };

export default function Page() {
  return <ProcessingPage />;
}

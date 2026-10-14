import type { Metadata } from "next";
import { InvoiceDocument } from "@/components/documents/invoice-document";

export const metadata: Metadata = { title: "Invoice" };

export default async function Page({ params }: PageProps<"/documents/invoice/[ref]">) {
  const { ref } = await params;
  return <InvoiceDocument reference={decodeURIComponent(ref)} />;
}

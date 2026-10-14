import type { Metadata } from "next";
import { VoucherDocument } from "@/components/documents/voucher-document";

export const metadata: Metadata = { title: "Booking voucher" };

export default async function Page({ params }: PageProps<"/documents/voucher/[ref]">) {
  const { ref } = await params;
  return <VoucherDocument reference={decodeURIComponent(ref)} />;
}

import type { Metadata } from "next";
import { ETicketDocument } from "@/components/documents/eticket-document";

export const metadata: Metadata = { title: "E-ticket" };

export default async function Page({ params }: PageProps<"/documents/eticket/[ref]">) {
  const { ref } = await params;
  return <ETicketDocument reference={decodeURIComponent(ref)} />;
}

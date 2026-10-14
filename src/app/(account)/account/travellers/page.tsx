import type { Metadata } from "next";
import { TravellersPage } from "@/components/account/travellers-page";

export const metadata: Metadata = { title: "Saved travellers" };

export default function Page() {
  return <TravellersPage />;
}

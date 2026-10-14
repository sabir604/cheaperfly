import type { Metadata } from "next";
import { AccountSupportPage } from "@/components/account/support-page";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return <AccountSupportPage />;
}

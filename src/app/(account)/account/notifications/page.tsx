import type { Metadata } from "next";
import { NotificationsPage } from "@/components/account/settings-pages";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsPage />;
}

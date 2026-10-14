import type { Metadata } from "next";
import { PreferencesPage } from "@/components/account/settings-pages";

export const metadata: Metadata = { title: "Preferences" };

export default function Page() {
  return <PreferencesPage />;
}

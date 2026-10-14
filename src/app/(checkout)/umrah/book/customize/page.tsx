import type { Metadata } from "next";
import { UmrahCustomize } from "@/components/checkout/umrah-steps";

export const metadata: Metadata = { title: "Customise your Umrah" };

export default function CustomizePage() {
  return <UmrahCustomize />;
}

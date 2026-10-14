import type { Metadata } from "next";
import { HelpHome } from "./help-home";

export const metadata: Metadata = { title: "Help centre", description: "Answers, guides and ways to contact Cheaperfly support." };

export default function HelpPage() {
  return <HelpHome />;
}

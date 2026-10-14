import { connection } from "next/server";
import { HomeContent } from "@/components/home/home-content";

export default async function HomePage() {
  // Default search dates and "from" prices are relative to today, so render per request.
  await connection();
  return <HomeContent />;
}

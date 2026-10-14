import type { Metadata } from "next";
import { VerifyForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Verify your email" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const { email, next } = await searchParams;
  return <VerifyForm email={str(email)} next={str(next)} />;
}

import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { email, next } = await searchParams;
  return <SignUpForm email={str(email)} next={str(next)} />;
}

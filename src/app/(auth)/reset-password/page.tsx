import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { email } = await searchParams;
  return <ResetPasswordForm email={typeof email === "string" ? email : undefined} />;
}

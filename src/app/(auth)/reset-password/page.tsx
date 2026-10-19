import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { email, challengeId, token } = await searchParams;
  return <ResetPasswordForm email={typeof email === "string" ? email : undefined} challengeId={typeof challengeId === "string" ? challengeId : undefined} token={typeof token === "string" ? token : undefined} />;
}

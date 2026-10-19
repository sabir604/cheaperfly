import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CUSTOMER_COOKIE } from "@cheaperfly/api-contracts";
import { proxyWebsiteApi } from "@/server/api-transport";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";
import { SiteChrome } from "@/components/layout/site-chrome";

/** Account area: the site frame with a taller main (so short pages keep the footer low) around the account shell. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const target = requestHeaders.get("x-cheaperfly-account-path") ?? "/account";
  const next = /^\/account(?:[/?]|$)/.test(target) && !/[\\\r\n]/.test(target) ? target : "/account";
  const signInPath = `/sign-in?next=${encodeURIComponent(next)}`;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!cookie) redirect(signInPath);
  // GET identity validation uses a fixed internal request origin and the allowlisted adapter.
  const session = await proxyWebsiteApi(new Request("http://website.internal/api/customer/v1/session", {
    headers: { cookie: `${CUSTOMER_COOKIE}=${cookie}` },
  }), "customer", ["session"]);
  if (!session.ok) redirect(signInPath);
  return (
    <SiteChrome mainClassName="min-h-[70vh]">
      <AccountShell>{children}</AccountShell>
    </SiteChrome>
  );
}

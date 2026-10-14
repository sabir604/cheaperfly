import type { ReactNode } from "react";
import { AccountShell } from "@/components/account/account-shell";
import { SiteChrome } from "@/components/layout/site-chrome";

/** Account area: the site frame with a taller main (so short pages keep the footer low) around the account shell. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <SiteChrome mainClassName="min-h-[70vh]">
      <AccountShell>{children}</AccountShell>
    </SiteChrome>
  );
}

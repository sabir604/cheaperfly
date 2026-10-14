import type { ReactNode } from "react";

/** Printable documents (e-ticket, invoice, voucher): no site navigation. */
export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="min-h-screen">
      {children}
    </main>
  );
}

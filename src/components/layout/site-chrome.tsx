import type { ReactNode } from "react";
import { AnnouncementBar } from "./announcement-bar";
import { FeatureRouteGate } from "./feature-route-gate";
import { Footer } from "./footer";
import { Header } from "./header";

/** Public-site frame: announcement bar, header, footer. */
export function SiteChrome({ children, mainClassName }: { children: ReactNode; mainClassName?: string }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main id="main" className={mainClassName}>
        <FeatureRouteGate>{children}</FeatureRouteGate>
      </main>
      <Footer />
    </>
  );
}

import { NotFoundView } from "@/components/errors/not-found-view";
import { SiteChrome } from "@/components/layout/site-chrome";

/** Unmatched URLs render outside every route group, so this one brings its own site frame. */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundView />
    </SiteChrome>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Info, Megaphone, TriangleAlert, X } from "lucide-react";
import { useIsPreview, useSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const TONES = {
  info: "bg-brand-600 text-white",
  promo: "bg-gold-500 text-white",
  warning: "bg-amber-500 text-navy-950",
} as const;

const noopSubscribe = () => () => {};

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Site-wide banner, configured from the admin CMS. Dismissal lasts for the browser session. */
export function AnnouncementBar() {
  const { announcement } = useSiteConfig();
  const preview = useIsPreview();
  const key = `cf.announcement.${announcement.text.slice(0, 40)}`;
  const [dismissedNow, setDismissed] = useState(false);
  // Dismissal is remembered for the browser session; the server always renders the bar.
  const dismissedEarlier = useSyncExternalStore(noopSubscribe, () => readFlag(key), () => false);
  const dismissed = !preview && (dismissedNow || dismissedEarlier);

  if (!announcement.enabled || !announcement.text.trim() || dismissed) return null;

  const tone = (announcement.tone in TONES ? announcement.tone : "info") as keyof typeof TONES;
  const Icon = tone === "warning" ? TriangleAlert : tone === "promo" ? Megaphone : Info;
  const content = (
    <span className="flex items-center justify-center gap-2 text-center">
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{announcement.text}</span>
      {announcement.href && <span className="font-bold underline underline-offset-2">Learn more</span>}
    </span>
  );
  return (
    <div role="region" aria-label="Announcement" className={cn("no-print relative px-10 py-2 text-[13px] font-medium", TONES[tone])}>
      {announcement.href ? (
        <Link href={announcement.href} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
      {announcement.dismissible && (
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(key, "1");
            } catch {
              // storage unavailable: dismissal lasts until reload
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

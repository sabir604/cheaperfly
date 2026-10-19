"use client";

import { useEffect } from "react";
import { refreshSession } from "@/lib/engine/auth";
import { rehydrateAll } from "@/lib/stores/hydration";
import { startConfigSync } from "@/lib/site-config";

/** Loads browser drafts and server-backed identity/configuration after first paint. */
export function ClientBoot() {
  useEffect(() => {
    rehydrateAll();
    const stopConfigSync = startConfigSync();
    const refresh = () => { void refreshSession(); };
    const changed = (event: StorageEvent) => { if (event.key === "cf.auth-event") refresh(); };
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", changed);
    return () => { stopConfigSync(); clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", changed); };
  }, []);
  return null;
}

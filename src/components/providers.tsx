"use client";

import { useEffect } from "react";
import { rehydrateAll } from "@/lib/stores/hydration";
import { startConfigSync } from "@/lib/site-config";

/** Loads persisted browser state (bookings, session, drafts, CMS config) once, after first paint. */
export function ClientBoot() {
  useEffect(() => {
    rehydrateAll();
    startConfigSync();
  }, []);
  return null;
}

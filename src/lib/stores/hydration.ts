"use client";

import { create } from "zustand";
import { useAccountStore, useBookingsStore } from "./bookings";
import { useCheckoutStore, useDraftsStore } from "./drafts";
import { useUiStore } from "./session";

/**
 * Stores skip automatic hydration so server-rendered HTML and the first client render agree.
 * `rehydrateAll()` runs once on mount (see <StoreHydrator/>); components wait on `useHydrated()`.
 */
const useHydrationStore = create<{ hydrated: boolean; setHydrated: (v: boolean) => void }>((set) => ({
  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),
}));

export const useHydrated = () => useHydrationStore((s) => s.hydrated);

let started = false;

export async function rehydrateAll() {
  if (started) return;
  started = true;
  try {
    await Promise.all([
      useUiStore.persist.rehydrate(),
      useBookingsStore.persist.rehydrate(),
      useAccountStore.persist.rehydrate(),
      useDraftsStore.persist.rehydrate(),
      useCheckoutStore.persist.rehydrate(),
    ]);
  } catch {
    // Corrupt or blocked storage: carry on with defaults.
  }
  useAccountStore.setState({travellers:[],notifications:[]});
  const { refreshSession } = await import("@/lib/engine/auth");
  await refreshSession();
  useHydrationStore.getState().setHydrated(true);
}

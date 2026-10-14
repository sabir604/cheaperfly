"use client";

/**
 * Site content & feature flags. Defaults ship with the app (DEFAULT_SITE / DEFAULT_FEATURES);
 * the admin portal publishes overrides into localStorage `cf-config`, and every open tab
 * picks them up via the `storage` event.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import defaultSite from "@/data/json/DEFAULT_SITE.json";
import defaultFeatures from "@/data/json/DEFAULT_FEATURES.json";

export type SiteConfig = Omit<typeof defaultSite, "faqs"> & {
  faqs: { id: string; q: string; a: string; visible: boolean; category?: string }[];
};
export type FeatureKey = keyof typeof defaultFeatures;
export type Features = Record<FeatureKey, boolean>;

export const DEFAULT_SITE = defaultSite as unknown as SiteConfig;
export const DEFAULT_FEATURES = defaultFeatures as Features;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Published content replaces whole top-level sections (e.g. all of `footer`). */
export function withDefaults(content?: Partial<SiteConfig> | null): SiteConfig {
  const base = clone(DEFAULT_SITE);
  return content ? { ...base, ...content } : base;
}

interface ConfigState {
  content: Partial<SiteConfig> | null;
  meta: { version: number; publishedAt: string; publishedBy: string } | null;
  features: Partial<Features>;
  hydrated: boolean;
  publish: (content: Partial<SiteConfig>, meta: ConfigState["meta"]) => void;
  setFeature: (key: FeatureKey, on: boolean) => void;
  setFeatures: (f: Partial<Features>) => void;
  resetAll: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      content: null,
      meta: null,
      features: {},
      hydrated: false,
      publish: (content, meta) => set({ content: clone(content), meta }),
      setFeature: (key, on) => set((s) => ({ features: { ...s.features, [key]: on } })),
      setFeatures: (features) => set({ features }),
      resetAll: () => set({ content: null, meta: null, features: {} }),
    }),
    {
      name: "cf-config",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ content: s.content, meta: s.meta, features: s.features }),
    },
  ),
);

let syncing = false;

/** Loads published config and keeps it in sync with other tabs (e.g. the admin portal). */
export function startConfigSync() {
  if (syncing) return;
  syncing = true;
  const load = () => {
    try {
      Promise.resolve(useConfigStore.persist.rehydrate()).finally(() => useConfigStore.setState({ hydrated: true }));
    } catch {
      useConfigStore.setState({ hydrated: true });
    }
  };
  load();
  window.addEventListener("storage", (e) => {
    if (e.key === "cf-config") load();
  });
}

/** Admin "preview" mode renders the site with draft config instead of the published one. */
const PreviewContext = createContext<{ config: SiteConfig; features: Features; preview: boolean } | null>(null);

export function SiteConfigProvider({ config, features, preview = true, children }: { config: SiteConfig; features?: Partial<Features>; preview?: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ config, features: { ...DEFAULT_FEATURES, ...features }, preview }), [config, features, preview]);
  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  const preview = useContext(PreviewContext);
  const hydrated = useConfigStore((s) => s.hydrated);
  const content = useConfigStore((s) => s.content);
  return useMemo(() => (preview ? preview.config : hydrated && content ? withDefaults(content) : DEFAULT_SITE), [preview, hydrated, content]);
}

export function useFeatures(): Features {
  const preview = useContext(PreviewContext);
  const hydrated = useConfigStore((s) => s.hydrated);
  const features = useConfigStore((s) => s.features);
  return useMemo(() => (preview ? preview.features : hydrated ? { ...DEFAULT_FEATURES, ...features } : DEFAULT_FEATURES), [preview, hydrated, features]);
}

export function useFeature(key: FeatureKey): boolean {
  const preview = useContext(PreviewContext);
  const hydrated = useConfigStore((s) => s.hydrated);
  const value = useConfigStore((s) => s.features[key]);
  if (preview) return preview.features[key];
  return hydrated ? (value ?? DEFAULT_FEATURES[key]) : DEFAULT_FEATURES[key];
}

export function useIsPreview(): boolean {
  return !!useContext(PreviewContext)?.preview;
}

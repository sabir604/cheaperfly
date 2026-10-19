"use client";

/** Published website content comes from the shared backend; defaults remain the initial view. */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { create } from "zustand";
import { apiRequest } from "@/lib/api/client";
import type { PublicConfiguration } from "@cheaperfly/api-contracts";
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
  meta: { version: number } | null;
  features: Partial<Features>;
  hydrated: boolean;
  error: string | null;
}
export const useConfigStore = create<ConfigState>()(() => ({
  content: null, meta: null, features: {}, hydrated: false, error: null,
}));
let refreshSequence = 0;
export async function refreshConfiguration() {
  const sequence = ++refreshSequence;
  try {
    const { data } = await apiRequest<PublicConfiguration>("public", "configuration");
    if (sequence !== refreshSequence) return;
    useConfigStore.setState({content: data.content as unknown as SiteConfig, features: data.features, meta: {version:data.version}, hydrated:true,error:null});
  } catch(error) {
    if (sequence === refreshSequence) useConfigStore.setState({hydrated:true,error:error instanceof Error ? error.message : "Configuration unavailable."});
  }
}
let syncing = false;
/** Polling and focus refresh work across ports, browsers and devices; localStorage is not a publisher. */
export function startConfigSync() {
  if (syncing) return () => {};
  syncing = true;
  // Legacy cf-config data is ignored and left intact; it cannot publish to the backend.
  const refresh = () => { void refreshConfiguration(); };
  refresh();
  const timer = window.setInterval(refresh, 15_000);
  window.addEventListener("focus", refresh);
  return () => { syncing=false; refreshSequence++; window.clearInterval(timer); window.removeEventListener("focus",refresh); };
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

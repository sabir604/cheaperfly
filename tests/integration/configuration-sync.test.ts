import { beforeEach, it, expect, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  refreshConfiguration,
  useConfigStore,
  startConfigSync,
} from "@/lib/site-config";
import { bootstrapConfiguration } from "@cheaperfly/api-contracts/defaults";
import { isWebsiteContent } from "@cheaperfly/api-contracts";
import type { PublicConfiguration } from "@cheaperfly/api-contracts";
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  apiRequest: vi.fn(),
}));
const api = vi.mocked(apiRequest);
const envelope = (data: PublicConfiguration) => ({
  data,
  meta: {
    apiVersion: "2026-10-16.v1" as const,
    providerMode: "simulated" as const,
    requestId: "test",
  },
});
beforeEach(() => {
  api.mockReset();
  useConfigStore.setState({
    content: null,
    meta: null,
    features: {},
    hydrated: false,
    error: null,
  });
});
it("uses server publications across refreshes and ignores browser-local overrides", async () => {
  localStorage.setItem(
    "cf-config",
    JSON.stringify({
      content: { homepage: { hero: { titleLine1: "Forged" } } },
    }),
  );
  const published = structuredClone({
    ...bootstrapConfiguration,
    source: "published" as const,
    version: 2,
  });
  published.content.homepage.hero.titleLine1 = "Published";
  published.features.flights = false;
  api.mockResolvedValue(envelope(published));
  await refreshConfiguration();
  expect(useConfigStore.getState().content?.homepage?.hero.titleLine1).toBe(
    "Published",
  );
  expect(useConfigStore.getState().features.flights).toBe(false);
  api.mockRejectedValue(new Error("Offline"));
  await refreshConfiguration();
  expect(useConfigStore.getState().content?.homepage?.hero.titleLine1).toBe(
    "Published",
  );
  expect(useConfigStore.getState().error).toBe("Offline");
});
it("discards an older configuration response after a newer refresh", async () => {
  let finish!: (value: ReturnType<typeof envelope>) => void;
  api.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const older = refreshConfiguration();
  const newer = {
    ...bootstrapConfiguration,
    source: "published" as const,
    version: 3,
  };
  api.mockResolvedValueOnce(envelope(newer));
  await refreshConfiguration();
  finish(envelope(bootstrapConfiguration));
  await older;
  expect(useConfigStore.getState().meta?.version).toBe(3);
});
it("polls server configuration and cleans up focus/timer listeners", async () => {
  vi.useFakeTimers();
  const events = new EventTarget();
  vi.stubGlobal("window", {
    setInterval,
    clearInterval,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  });
  try {
    api.mockResolvedValue(envelope(bootstrapConfiguration));
    const stop = startConfigSync();
    await Promise.resolve();
    expect(api).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15000);
    expect(api).toHaveBeenCalledTimes(2);
    events.dispatchEvent(new Event("focus"));
    expect(api).toHaveBeenCalledTimes(3);
    stop();
    await vi.advanceTimersByTimeAsync(15000);
    events.dispatchEvent(new Event("focus"));
    expect(api).toHaveBeenCalledTimes(3);
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
it("validates nested configuration blocks before a publication can reach the website", () => {
  const content = structuredClone(bootstrapConfiguration.content);
  content.footer.columns[0].links[0].href = "javascript:alert(1)";
  expect(isWebsiteContent(content)).toBe(false);
  const extra = { ...bootstrapConfiguration.content, token: "private" };
  expect(isWebsiteContent(extra)).toBe(false);
});

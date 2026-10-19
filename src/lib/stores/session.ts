import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CurrencyCode } from "@/lib/engine/currency";
import { accountPreferenceDefaults, type AccountProfile, type AccountPreferences } from "@cheaperfly/api-contracts";
import type { Scenario } from "@/lib/engine/service";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  memberSince: string;
  verified: boolean;
  isDemo?: boolean;
}

export type Profile = AccountProfile;
export type Preferences = AccountPreferences;

export interface OtpChallenge {
  purpose: "signup" | "reset";
  email: string;
  code: string;
  challengeId: string;
  createdAt: string;
}

export const DEFAULT_PREFERENCES: Preferences = accountPreferenceDefaults;

interface SessionState {
  user: User | null;
  profile: Profile | null;
  preferences: Preferences;
  otp: OtpChallenge | null;
  setSession: (user: User, profile: Profile) => void;
  clearSession: () => void;
  setOtp: (otp: OtpChallenge | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
}

/** Server-authorized identity cache only. Never persisted in browser storage. */
export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  profile: null,
  preferences: DEFAULT_PREFERENCES,
  otp: null,
  setSession: (user, profile) => set({ user, profile }),
  clearSession: () => set({ user: null, profile: null, otp: null, preferences: DEFAULT_PREFERENCES }),
  setOtp: (otp) => set({ otp }),
  updateProfile: (patch) => set((s) => {
    if (!s.profile || !s.user) return s;
    const profile = { ...s.profile, ...patch };
    return { profile, user: { ...s.user, firstName: profile.firstName, lastName: profile.lastName } };
  }),
  updatePreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
}));

export interface RecentItem {
  id: string;
  product: "flight" | "hotel" | "umrah";
  href: string;
  label: string;
  sublabel?: string;
  at: string;
}

interface UiState {
  currency: CurrencyCode;
  recent: RecentItem[];
  scenario: Scenario;
  failPayment: boolean;
  setCurrency: (c: CurrencyCode) => void;
  addRecent: (item: Omit<RecentItem, "id" | "at">) => void;
  clearRecent: () => void;
  setScenario: (s: Scenario) => void;
  setFailPayment: (v: boolean) => void;
}

/** Display currency, recent searches and QA switches, persisted in `cf.ui`. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      currency: "GBP",
      recent: [],
      scenario: "ok",
      failPayment: false,
      setCurrency: (currency) => set({ currency }),
      addRecent: (item) =>
        set((s) => {
          const entry = { ...item, id: `${item.product}:${item.href}`, at: new Date().toISOString() };
          return { recent: [entry, ...s.recent.filter((r) => r.id !== entry.id)].slice(0, 6) };
        }),
      clearRecent: () => set({ recent: [] }),
      setScenario: (scenario) => set({ scenario }),
      setFailPayment: (failPayment) => set({ failPayment }),
    }),
    { name: "cf.ui", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

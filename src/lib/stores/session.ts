import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CurrencyCode } from "@/lib/engine/currency";
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

export interface Profile {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  email: string;
  countryCode: string;
  mobile: string;
  address: { line1: string; line2?: string; city: string; postcode: string; country: string };
  passportNo: string;
  passportCountry: string;
  passportExpiry: string;
}

export interface Preferences {
  currency: CurrencyCode;
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  marketing: boolean;
  defaultMeal: string;
  seatPreference: string;
}

export interface OtpChallenge {
  purpose: "signup" | "reset";
  email: string;
  code: string;
  createdAt: string;
}

/** A locally registered (simulated) account. Passwords are stored in plain text: prototype only. */
export interface Credential {
  email: string;
  password: string;
  user: User;
  profile: Profile;
}

export const DEFAULT_PREFERENCES: Preferences = {
  currency: "GBP",
  language: "English (UK)",
  emailNotifications: true,
  smsNotifications: false,
  whatsappNotifications: true,
  marketing: false,
  defaultMeal: "standard",
  seatPreference: "any",
};

interface SessionState {
  user: User | null;
  profile: Profile | null;
  preferences: Preferences;
  otp: OtpChallenge | null;
  credentials: Credential[];
  setSession: (user: User, profile: Profile) => void;
  clearSession: () => void;
  setOtp: (otp: OtpChallenge | null) => void;
  addCredential: (c: Credential) => void;
  updateCredentialPassword: (email: string, password: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
}

/** Simulated sign-in state, persisted in `cf.session`. */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      preferences: DEFAULT_PREFERENCES,
      otp: null,
      credentials: [],
      setSession: (user, profile) => set({ user, profile }),
      clearSession: () => set({ user: null, profile: null, otp: null }),
      setOtp: (otp) => set({ otp }),
      addCredential: (c) => set((s) => ({ credentials: [...s.credentials.filter((x) => x.email !== c.email), c] })),
      updateCredentialPassword: (email, password) =>
        set((s) => ({ credentials: s.credentials.map((c) => (c.email === email ? { ...c, password } : c)) })),
      updateProfile: (patch) =>
        set((s) => {
          if (!s.profile || !s.user) return s;
          const profile = { ...s.profile, ...patch };
          const user = { ...s.user, firstName: profile.firstName, lastName: profile.lastName };
          return { profile, user, credentials: s.credentials.map((c) => (c.email === user.email ? { ...c, user, profile } : c)) };
        }),
      updatePreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
    }),
    {
      name: "cf.session",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ user: s.user, profile: s.profile, preferences: s.preferences, otp: s.otp, credentials: s.credentials }),
    },
  ),
);

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

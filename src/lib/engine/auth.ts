import { clearServerBookings } from "./server-bookings";
/** Customer identity is authorized by the backend; no browser credentials or demo login. */
import { invalidateAccountData,loadAccountData } from "./account";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import {
  useSessionStore,
  useUiStore,
  type Profile,
  type User,
} from "@/lib/stores/session";
import { useAccountStore, useBookingsStore } from "@/lib/stores/bookings";
import { useDraftsStore, useCheckoutStore } from "@/lib/stores/drafts";
import type { Session } from "@cheaperfly/api-contracts";

export type AuthResult =
  | { ok: true; user?: User }
  | { ok: false; error: string; code?: "invalid" | "unverified" | "not_found" };
type Accepted = {
  accepted: true;
  challengeId?: string;
  demo?: { challengeId: string; code?: string; token?: string };
};
let pendingPassword = "";
let revision = 0;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
function clearCustomerCaches() {
  clearServerBookings();
  invalidateAccountData();
  useAccountStore.setState({
    travellers: [],
    notifications: [],
    requests: [],
    cases: [],
    seededFor: [],
  });
  useBookingsStore.setState({ bookings: [], seededFor: [], guestRefs: [] });
  useDraftsStore.setState(useDraftsStore.getInitialState(), true);
  useCheckoutStore.setState(useCheckoutStore.getInitialState(), true);
  useUiStore.getState().clearRecent();
}
function identity(user: User | null) {
  const owner = user?.id ?? "guest";
  let previous: string | null = null;
  try {
    previous = localStorage.getItem("cf.cache-owner");
  } catch {
    /* Storage may be disabled. */
  }
  const current = useSessionStore.getState().user;
  if (previous !== owner || (current && current.id !== user?.id))
    clearCustomerCaches();
  try {
    localStorage.setItem("cf.cache-owner", owner);
    localStorage.removeItem("cf.session");
  } catch {
    /* Identity remains memory-only. */
  }
  if (user && current?.id === user.id) {
    useSessionStore.setState({ user });
    return;
  }
  useSessionStore.getState().clearSession();
  if (user) {
    const profile: Profile = {
      title: "",
      firstName: user.firstName,
      lastName: user.lastName,
      dob: "",
      gender: "",
      nationality: "",
      email: user.email,
      countryCode: "+44",
      mobile: "",
      address: { line1: "", city: "", postcode: "", country: "" },
      passportNo: "",
      passportCountry: "",
      passportExpiry: "",
    };
    useSessionStore.getState().setSession(user, profile);
  }
}
function broadcast() {
  try {
    localStorage.setItem("cf.auth-event", `${Date.now()}-${Math.random()}`);
  } catch {
    /* Best effort cross-tab invalidation. */
  }
}
async function established(path: string, body: unknown): Promise<AuthResult> {
  const attempt = ++revision;
  try {
    const { data } = await apiRequest<Session>("customer", path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (attempt !== revision)
      return { ok: false, error: "Your session changed. Please try again." };
    identity(data.customer);
    await loadAccountData();
    pendingPassword = "";
    broadcast();
    return { ok: true, user: data.customer };
  } catch (error) {
    if (error instanceof ApiClientError && error.apiCode === "email_unverified")
      return { ok: false, error: error.message, code: "unverified" };
    return { ok: false, error: message(error) };
  }
}
export async function signIn(
  email: string,
  password: string,
  remember = true,
): Promise<AuthResult> {
  pendingPassword = password;
  const result = await established("session", { email, password, remember });
  if (!result.ok && result.code === "unverified")
    await requestOtp("signup", email);
  else pendingPassword = "";
  return result;
}
export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  mobile: string;
  password: string;
  marketing: boolean;
  terms: boolean;
}
export async function signUp(input: SignUpInput): Promise<AuthResult> {
  try {
    const { data } = await apiRequest<Accepted>("customer", "registration", {
      method: "POST",
      body: JSON.stringify(input),
    });
    pendingPassword = input.password;
    useSessionStore
      .getState()
      .setOtp({
        purpose: "signup",
        email: input.email,
        code: data.demo?.code ?? "",
        challengeId: data.challengeId ?? "",
        createdAt: new Date().toISOString(),
      });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
export async function requestOtp(
  _purpose: "signup" | "reset",
  email: string,
): Promise<AuthResult> {
  if (!pendingPassword)
    return {
      ok: false,
      error: "Please sign in again to request a verification code.",
    };
  try {
    const { data } = await apiRequest<Accepted>(
      "customer",
      "verification/resend",
      {
        method: "POST",
        body: JSON.stringify({ email, password: pendingPassword }),
      },
    );
    useSessionStore
      .getState()
      .setOtp({
        purpose: "signup",
        email,
        code: data.demo?.code ?? "",
        challengeId: data.challengeId ?? "",
        createdAt: new Date().toISOString(),
      });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
export async function verifyOtp(code: string): Promise<AuthResult> {
  const otp = useSessionStore.getState().otp;
  if (!otp?.challengeId)
    return {
      ok: false,
      error: "Request a new verification code by signing in again.",
    };
  return established("verification", {
    challengeId: otp.challengeId,
    code: code.replace(/\s/g, ""),
  });
}
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true; link?: string } | { ok: false; error: string }> {
  try {
    const { data } = await apiRequest<Accepted>(
      "customer",
      "password/reset-request",
      { method: "POST", body: JSON.stringify({ email }) },
    );
    return {
      ok: true,
      ...(data.demo?.token
        ? {
            link: `/reset-password?email=${encodeURIComponent(email)}&challengeId=${encodeURIComponent(data.demo.challengeId)}&token=${encodeURIComponent(data.demo.token)}`,
          }
        : {}),
    };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
export async function resetPassword(
  challengeId: string,
  token: string,
  password: string,
): Promise<AuthResult> {
  try {
    await apiRequest("customer", "password/reset", {
      method: "POST",
      body: JSON.stringify({ challengeId, token, password }),
    });
    ++revision;
    identity(null);
    broadcast();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}
export async function signOut(): Promise<boolean> {
  ++revision;
  try {
    await apiRequest("customer", "session", { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiClientError && error.status === 401))
      return false;
  }
  pendingPassword = "";
  identity(null);
  broadcast();
  return true;
}
export async function refreshSession() {
  const attempt = ++revision;
  try {
    const { data } = await apiRequest<Session>("customer", "session");
    if (attempt === revision) { identity(data.customer); await loadAccountData(); }
  } catch {
    if (attempt === revision) identity(null);
  }
}

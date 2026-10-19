import { beforeEach, describe, it, expect, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  invalidateAccountData,
  loadAccountData,
  savePreferences,
  saveProfile,
  saveTraveller,
  useAccountData,
} from "@/lib/engine/account";
import {
  useSessionStore,
  DEFAULT_PREFERENCES,
  type Profile,
} from "@/lib/stores/session";
import { useAccountStore } from "@/lib/stores/bookings";
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  apiRequest: vi.fn(),
}));
const api = vi.mocked(apiRequest);
const user = {
  id: "alice",
  email: "alice@test.invalid",
  firstName: "Alice",
  lastName: "Test",
  memberSince: "2026-10-16",
  verified: true,
};
const profile: Profile = {
  title: "Ms",
  firstName: "Alice",
  lastName: "Test",
  dob: "",
  gender: "",
  nationality: "",
  email: user.email,
  countryCode: "+44",
  mobile: "7700900123",
  address: { line1: "", city: "", postcode: "", country: "" },
  passportNo: "",
  passportCountry: "",
  passportExpiry: "",
};
const meta = {
  apiVersion: "2026-10-16.v1" as const,
  providerMode: "simulated" as const,
  requestId: "test",
};
const result = (data: unknown) => ({ data, meta });
function reads() {
  api.mockImplementation(async (_scope, path) =>
    path === "profile"
      ? result(profile)
      : path === "preferences"
        ? result(DEFAULT_PREFERENCES)
        : {
            ...result([]),
            pagination: { page: 1, perPage: 100, total: 0, totalPages: 0 },
          },
  );
}
beforeEach(() => {
  invalidateAccountData();
  api.mockReset();
  useSessionStore.getState().setSession(user, { ...profile });
  useAccountStore.setState({ travellers: [], notifications: [] });
});
describe("server account cache", () => {
  it("serializes rapid automatic saves without losing fields", async () => {
    let server = { ...DEFAULT_PREFERENCES };
    api.mockImplementation(async (_scope, _path, init) => {
      server = { ...server, ...JSON.parse(String(init?.body)) };
      return result({ ...server });
    });
    await Promise.all([
      savePreferences({ currency: "USD" }),
      savePreferences({ marketing: true }),
      savePreferences({ seatPreference: "window" }),
    ]);
    expect(useSessionStore.getState().preferences).toMatchObject({
      currency: "USD",
      marketing: true,
      seatPreference: "window",
    });
    api.mockRejectedValueOnce(new Error("Offline"));
    await expect(savePreferences({ currency: "EUR" })).rejects.toThrow(
      "Offline",
    );
    expect(useSessionStore.getState().preferences.currency).toBe("USD");
  });
  it("ignores an old background profile read after a confirmed save", async () => {
    let finish!: (value: ReturnType<typeof result>) => void;
    const old = new Promise<ReturnType<typeof result>>((resolve) => {
      finish = resolve;
    });
    reads();
    api.mockImplementation(async (_scope, path, init) => {
      if (path === "profile")
        return init?.method === "PATCH"
          ? result({ ...profile, firstName: "Updated" })
          : old;
      return path === "preferences"
        ? result(DEFAULT_PREFERENCES)
        : {
            ...result([]),
            pagination: { page: 1, perPage: 100, total: 0, totalPages: 0 },
          };
    });
    useAccountData.setState({ status: "ready" });
    const loading = loadAccountData();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await saveProfile({ firstName: "Updated" });
    finish(result(profile));
    await loading;
    expect(useSessionStore.getState().profile?.firstName).toBe("Updated");
  });
  it("cannot append a late mutation response to another customer's cache", async () => {
    let finish!: (value: ReturnType<typeof result>) => void;
    api.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const saving = saveTraveller({
      type: "adult",
      title: "Ms",
      firstName: "Alice",
      lastName: "Test",
      dob: "1990-01-01",
      gender: "female",
      nationality: "GB",
      passportNo: "AB123456",
      passportCountry: "GB",
      passportExpiry: "2099-01-01",
    });
    const rejected = expect(saving).rejects.toThrow("session changed");
    await new Promise((resolve) => setTimeout(resolve, 0));
    invalidateAccountData();
    useSessionStore
      .getState()
      .setSession({ ...user, id: "bob" }, { ...profile });
    finish(result({ id: "private", firstName: "Alice" }));
    await rejected;
    expect(useAccountStore.getState().travellers).toEqual([]);
  });
  it("exposes load failure for retry instead of treating it as an empty account", async () => {
    api.mockRejectedValue(new Error("Unavailable"));
    await loadAccountData();
    expect(useAccountData.getState()).toMatchObject({
      status: "error",
      error: "Unavailable",
    });
    reads();
    await loadAccountData();
    expect(useAccountData.getState().status).toBe("ready");
  });
});

it("finishes initial loading when an automatic save overlaps the first account read",async()=>{
 let finish!:(value:ReturnType<typeof result>)=>void;
 const initial=new Promise<ReturnType<typeof result>>(resolve=>{finish=resolve;});let calls=0;let prefs={...DEFAULT_PREFERENCES};
 api.mockImplementation(async(_scope,path,init)=>{
  if(path==="profile")return ++calls===1?initial:result(profile);
  if(path==="preferences"){if(init?.method==="PATCH")prefs={...prefs,...JSON.parse(String(init.body))};return result(prefs);}
  return {...result([]),pagination:{page:1,perPage:100,total:0,totalPages:0}};
 });
 const loading=loadAccountData();await new Promise(resolve=>setTimeout(resolve,0));
 await savePreferences({currency:"USD"});finish(result(profile));await loading;await new Promise(resolve=>setTimeout(resolve,0));
 await loadAccountData();expect(useAccountData.getState().status).toBe("ready");expect(useSessionStore.getState().preferences.currency).toBe("USD");
});

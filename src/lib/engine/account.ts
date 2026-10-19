import { create } from "zustand";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import {
  useSessionStore,
  useUiStore,
  type Profile,
  type Preferences,
} from "@/lib/stores/session";
import { useAccountStore } from "@/lib/stores/bookings";
import type { SavedTraveller, AccountNotification } from "@/lib/types/booking";
export const useAccountData = create<{
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
}>(() => ({ status: "idle", error: null }));
let generation = 0;
let readVersion = 0;
let pending: Promise<void> | undefined;
let mutations: Promise<unknown> = Promise.resolve();
export function invalidateAccountData() {
  generation++;
  readVersion++;
  mutations = Promise.resolve();
  pending = undefined;
  useAccountData.setState({ status: "idle", error: null });
}
function actor() {
  const user = useSessionStore.getState().user;
  if (!user) throw new ApiClientError(401, "unauthenticated", "");
  return { id: user.id, generation };
}
function current(who: { id: string; generation: number }) {
  return (
    generation === who.generation &&
    useSessionStore.getState().user?.id === who.id
  );
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
async function collection<T>(path: string) {
  let page = 1;
  const items: T[] = [];
  while (true) {
    const result = await apiRequest<T[]>("customer", path, {
      query: { page, perPage: 100 },
    });
    items.push(...result.data);
    if (!result.pagination || page >= result.pagination.totalPages)
      return items;
    page++;
    if (page > 10000) throw new Error("Please refresh your account.");
  }
}
export function loadAccountData(): Promise<void> {
  if (pending) return pending;
  const who = actor();
  if (useAccountData.getState().status !== "ready")
    useAccountData.setState({ status: "loading", error: null });
  const loading = (async () => {
    await mutations.catch(() => {});
    const sequence = readVersion;
    try {
      const [profile, preferences, travellers, notifications] =
        await Promise.all([
          apiRequest<Profile>("customer", "profile"),
          apiRequest<Preferences>("customer", "preferences"),
          collection<SavedTraveller>("travellers"),
          collection<AccountNotification>("notifications"),
        ]);
      if (!current(who) || sequence !== readVersion) return;
      const user = useSessionStore.getState().user!;
      useSessionStore.setState({
        profile: profile.data,
        preferences: preferences.data,
        user: {
          ...user,
          firstName: profile.data.firstName,
          lastName: profile.data.lastName,
        },
      });
      useUiStore.getState().setCurrency(preferences.data.currency);
      useAccountStore.setState({ travellers, notifications });
      useAccountData.setState({ status: "ready", error: null });
    } catch (error) {
      if (current(who) && sequence === readVersion)
        useAccountData.setState({ status: "error", error: message(error) });
    }
  })();
  pending = loading;
  void loading.finally(() => {
    if (pending === loading) pending = undefined;
  });
  return loading;
}
/** Serialize writes from automatic-save controls, and scope every completion to its original identity. */
function mutate<T>(
  operation: (who: { id: string; generation: number }) => Promise<T>,
): Promise<T> {
  const who = actor();
  const task = mutations
    .catch(() => {})
    .then(async () => {
      if (!current(who))
        throw new Error("Your session changed. Please try again.");
      // Invalidate an overlapping background read before issuing the mutation.
      readVersion++;
      pending = undefined;
      const result = await operation(who);
      if (!current(who))
        throw new Error("Your session changed. Please try again.");
      return result;
    });
  mutations = task;
  return task.finally(() => {
    if (current(who) && useAccountData.getState().status === "loading") void loadAccountData();
  });
}
export function saveProfile(patch: Partial<Profile>) {
  return mutate(async (who) => {
    const { data } = await apiRequest<Profile>("customer", "profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (current(who)) {
      const user = useSessionStore.getState().user!;
      useSessionStore.setState({
        profile: data,
        user: { ...user, firstName: data.firstName, lastName: data.lastName },
      });
    }
    return data;
  });
}
export function savePreferences(patch: Partial<Preferences>) {
  return mutate(async (who) => {
    const { data } = await apiRequest<Preferences>("customer", "preferences", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (current(who)) {
      useSessionStore.setState({ preferences: data });
      useUiStore.getState().setCurrency(data.currency);
    }
    return data;
  });
}
export function saveTraveller(
  input: Omit<SavedTraveller, "id"> & { id?: string },
) {
  return mutate(async (who) => {
    const { id, ...body } = input;
    const { data } = await apiRequest<SavedTraveller>(
      "customer",
      id ? `travellers/${id}` : "travellers",
      { method: id ? "PATCH" : "POST", body: JSON.stringify(body) },
    );
    if (current(who))
      useAccountStore.setState((s) => ({
        travellers: [data, ...s.travellers.filter((t) => t.id !== data.id)],
      }));
    return data;
  });
}
export function deleteTraveller(id: string) {
  return mutate(async (who) => {
    await apiRequest("customer", `travellers/${id}`, { method: "DELETE" });
    if (current(who))
      useAccountStore.setState((s) => ({
        travellers: s.travellers.filter((t) => t.id !== id),
      }));
  });
}
export function markNotification(id: string, read = true) {
  return mutate(async (who) => {
    const { data } = await apiRequest<AccountNotification>(
      "customer",
      `notifications/${id}`,
      { method: "PATCH", body: JSON.stringify({ read }) },
    );
    if (current(who))
      useAccountStore.setState((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? data : n)),
      }));
  });
}
export function deleteNotification(id: string) {
  return mutate(async (who) => {
    await apiRequest("customer", `notifications/${id}`, { method: "DELETE" });
    if (current(who))
      useAccountStore.setState((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }));
  });
}
export function markAllNotificationsRead() {
  return mutate(async (who) => {
    await apiRequest("customer", "notifications/read-all", {
      method: "POST",
      body: "{}",
    });
    if (current(who))
      useAccountStore.setState((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      }));
  });
}

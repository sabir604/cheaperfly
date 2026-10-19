import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { newId } from "@/lib/engine/refs";
import type {
  AccountNotification,
  Booking,
  SavedTraveller,
  ServiceRequest,
  SupportCase,
} from "@/lib/types/booking";

interface BookingsState {
  bookings: Booking[];
  /** User ids whose demo bookings have already been seeded. */
  seededFor: string[];
  /** References a signed-out visitor unlocked via Manage Booking lookup. */
  guestRefs: string[];
  addBooking: (b: Booking) => void;
  updateBooking: (id: string, patch: Partial<Booking> | ((b: Booking) => Booking)) => void;
  markSeeded: (userId: string) => void;
  grantGuestAccess: (ref: string) => void;
}

/** All bookings made in this browser, persisted in `cf.bookings`. */
export const useBookingsStore = create<BookingsState>()(
  persist(
    (set) => ({
      bookings: [],
      seededFor: [],
      guestRefs: [],
      addBooking: (b) => set((s) => ({ bookings: [b, ...s.bookings.filter((x) => x.id !== b.id)] })),
      updateBooking: (id, patch) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? (typeof patch === "function" ? patch(b) : ({ ...b, ...patch } as Booking)) : b)),
        })),
      markSeeded: (userId) => set((s) => ({ seededFor: [...new Set([...s.seededFor, userId])] })),
      grantGuestAccess: (ref) => set((s) => ({ guestRefs: [...new Set([...s.guestRefs, ref])] })),
    }),
    { name: "cf.bookings", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

type NewNotification = Omit<AccountNotification, "id" | "at" | "read"> & Partial<Pick<AccountNotification, "at" | "read">>;

interface AccountState {
  travellers: SavedTraveller[];
  notifications: AccountNotification[];
  requests: ServiceRequest[];
  cases: SupportCase[];
  seededFor: string[];
  upsertTraveller: (t: Omit<SavedTraveller, "id"> & { id?: string }) => SavedTraveller;
  removeTraveller: (id: string) => void;
  addNotification: (n: NewNotification) => void;
  markRead: (id: string, read?: boolean) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  addRequest: (r: ServiceRequest) => void;
  updateRequest: (id: string, patch: Partial<ServiceRequest>) => void;
  addCase: (c: SupportCase) => void;
  updateCase: (id: string, fn: (c: SupportCase) => SupportCase) => void;
  seed: (
    userId: string,
    data: { travellers: SavedTraveller[]; notifications: AccountNotification[]; requests: ServiceRequest[]; cases: SupportCase[] },
  ) => void;
}

/** Saved travellers, notifications, refund/change requests and support cases, persisted in `cf.account`. */
export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      travellers: [],
      notifications: [],
      requests: [],
      cases: [],
      seededFor: [],
      upsertTraveller: (t) => {
        const traveller = { ...t, id: t.id ?? newId("trv") } as SavedTraveller;
        set((s) => ({
          travellers: s.travellers.some((x) => x.id === traveller.id)
            ? s.travellers.map((x) => (x.id === traveller.id ? traveller : x))
            : [...s.travellers, traveller],
        }));
        return traveller;
      },
      removeTraveller: (id) => set((s) => ({ travellers: s.travellers.filter((t) => t.id !== id) })),
      addNotification: (n) =>
        set((s) => ({
          notifications: [{ id: newId("ntf"), at: n.at ?? new Date().toISOString(), read: n.read ?? false, ...n }, ...s.notifications],
        })),
      markRead: (id, read = true) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)) })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      deleteNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      addRequest: (r) => set((s) => ({ requests: [r, ...s.requests] })),
      updateRequest: (id, patch) => set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      addCase: (c) => set((s) => ({ cases: [c, ...s.cases] })),
      updateCase: (id, fn) => set((s) => ({ cases: s.cases.map((c) => (c.id === id ? fn(c) : c)) })),
      seed: (userId, data) =>
        set((s) => ({
          seededFor: [...new Set([...s.seededFor, userId])],
          travellers: [...data.travellers, ...s.travellers],
          notifications: [...s.notifications, ...data.notifications],
          requests: [...s.requests, ...data.requests],
          cases: [...s.cases, ...data.cases],
        })),
    }),
    { name: "cf.account", storage: createJSONStorage(() => localStorage), skipHydration: true, partialize: (s) => ({requests:s.requests,cases:s.cases}) },
  ),
);

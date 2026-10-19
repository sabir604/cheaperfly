"use client";
import { loadServicingData } from "./servicing";
import { create } from "zustand";
import { apiRequest } from "@/lib/api/client";
import type { Booking } from "@/lib/types/booking";
import type {
  BookingDocument,
  GuestBookingAccess,
} from "@cheaperfly/api-contracts/bookings";
export const serverBookings = {
  async read(
    reference: string,
    account = false,
    kind?: BookingDocument["kind"],
  ) {
    const result = await apiRequest<Booking | BookingDocument>(
      account ? "customer" : "public",
      `bookings/${encodeURIComponent(reference)}${kind ? `/documents/${kind}` : ""}`,
    );
    return kind
      ? (result.data as BookingDocument).booking
      : (result.data as Booking);
  },
  async lookup(reference: string, lastName: string) {
    return (
      await apiRequest<GuestBookingAccess>("public", "guest-access", {
        method: "POST",
        body: JSON.stringify({ reference, lastName }),
      })
    ).data;
  },
};
export const useServerBookings = create<{
  bookings: Booking[];
  owner: string | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
}>(() => ({ bookings: [], owner: null, status: "idle", error: null }));
let generation = 0;
export function clearServerBookings() {
  generation++;
  useServerBookings.setState({
    bookings: [],
    owner: null,
    status: "idle",
    error: null,
  });
}
export async function loadServerBookings(owner: string) {
  const run = ++generation;
  const current=useServerBookings.getState();
  if(current.owner!==owner||current.status!=='ready')useServerBookings.setState({bookings:[],owner,status:'loading',error:null});

  try {
    const bookings: Booking[] = [];
    for (let page = 1; ; page++) {
      const response = await apiRequest<Booking[]>("customer", "bookings", {
        query: { page, perPage: 20 },
      });
      bookings.push(...response.data);
      if (!response.pagination || page >= response.pagination.totalPages) break;
    }
    if (run === generation) await loadServicingData(owner);
    if (run === generation)
      useServerBookings.setState({ bookings, status: "ready" });
  } catch {
    if (run === generation)
      useServerBookings.setState({
        bookings: [],
        status: "error",
        error: "Could not load your bookings. Please try again.",
      });
  }
}

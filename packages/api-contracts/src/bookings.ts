import type { Booking } from "./booking";
import { validCheckoutData } from "./checkout";
export const BOOKING_GRANT_COOKIE = "cf_booking_grant";
export const BOOKING_GRANT_HEADER = "x-cheaperfly-booking-grant";
export type BookingDocument = {
  kind: "invoice" | "eticket" | "voucher";
  booking: Booking;
  issuedAt: string;
  providerMode: "simulated";
};
export type GuestBookingAccess = { reference: string; expiresAt: string };
export function validBookingData(path: string, v: unknown): boolean {
  const obj = (x: unknown): x is Record<string, unknown> =>
    !!x && typeof x === "object" && !Array.isArray(x);
  const booking = (b: unknown) =>
    validCheckoutData("checkouts/confirmation/ref", b);
  if (path === "bookings")
    return Array.isArray(v) && v.length <= 100 && v.every(booking);
  if (path === "guest-access")
    return (
      obj(v) &&
      Object.keys(v).length === 2 &&
      typeof v.reference === "string" &&
      typeof v.expiresAt === "string" &&
      Number.isFinite(Date.parse(v.expiresAt))
    );
  if (path.includes("/documents/"))
    return (
      obj(v) &&
      ["invoice", "eticket", "voucher"].includes(String(v.kind)) &&
      v.providerMode === "simulated" &&
      typeof v.issuedAt === "string" &&
      booking(v.booking)
    );
  return booking(v);
}

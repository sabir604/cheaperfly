import {refundUnits} from "@cheaperfly/api-contracts/refunds";
import { cityImage } from "@/data/hotels";
import { todayISO } from "@/lib/engine/dates";
import { FX_RATES } from "@/lib/engine/currency";
import type { User } from "@/lib/stores/session";
import type { Booking, BookingStatus, Product } from "@/lib/types/booking";

export const PRODUCT_LABEL: Record<Product, string> = { flight: "Flight", hotel: "Hotel", umrah: "Umrah package" };

export type Tone = "success" | "warning" | "danger" | "neutral";

export const STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  ticketed: { label: "Ticketed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  cancellation_requested: { label: "Cancellation requested", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  completed: { label: "Completed", tone: "neutral" },
};

export type BookingBucket = "upcoming" | "past" | "cancelled";

export function bookingBucket(b: Pick<Booking, "status" | "endDate">): BookingBucket {
  if (b.status === "cancelled" || b.status === "refunded") return "cancelled";
  if (b.status === "completed" || b.endDate < todayISO()) return "past";
  return "upcoming";
}

export function userOwnsBooking(b: Pick<Booking, "userId" | "customerEmail">, user: Pick<User, "id" | "email"> | null): boolean {
  return !!user && b.userId === user.id;
}

export function bookingImage(b: Booking): string {
  if (b.product === "hotel") return b.hotel.image;
  if (b.product === "umrah") return b.package.images[0];
  return cityImage(b.offer.legs[0].toCity);
}

export interface RefundLine {
  label: string;
  amount: number;
  tone?: "neg" | "total";
}

export interface RefundEstimate {
  lines: RefundLine[];
  paid: number;
  net: number;
  fee: number;
  refundable: boolean;
  note: string;
}

/**
 * What a customer gets back if they cancel now.
 * - Flights: per selected passenger. Non-refundable fares return taxes only; extras are never refunded;
 *   refundable fares lose the airline fee; a £20/passenger handling fee applies unless the fare is fully refundable.
 * - Hotels: full room + taxes back inside the free-cancellation window (service fee kept), otherwise nothing.
 * - Umrah: sliding scale by days to departure: >60 days 90%, >30 60%, >14 30%, else 0%.
 */
export function estimateRefund(b: Booking, selectedIds: string[]): RefundEstimate {
 const units=refundUnits(b,b.refundExchangeRate??FX_RATES[b.currency]).filter(u=>b.product==='hotel'||selectedIds.includes(u.id));
 const paid=units.reduce((a,u)=>a+u.grossMinor,0)/100;
 const net=units.reduce((a,u)=>a+u.netMinor,0)/100;
 return {paid,net,fee:paid-net,refundable:net>0,lines:[{label:'Paid allocation for selected travellers',amount:paid},{label:'Non-refundable fare, extras, fees and cancellation charges',amount:-(paid-net),tone:'neg'},{label:'Estimated refund',amount:net,tone:'total'}],note:'Simulated estimate from the original booking. Extras and service fees are non-refundable. Authorized staff must approve and process; no real refund is issued.'};
}

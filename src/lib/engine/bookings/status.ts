import { baggageOptionById } from "@/data/extras";
import { cityImage } from "@/data/hotels";
import { dayDiff, todayISO } from "@/lib/engine/dates";
import { toCurrency } from "@/lib/engine/currency";
import { fareUnitPrices } from "@/lib/engine/pricing";
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
  return !!user && (b.userId === user.id || b.customerEmail.toLowerCase() === user.email.toLowerCase());
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
  const cur = b.currency;
  if (b.product === "flight") {
    const unit = fareUnitPrices(b.fare, cur);
    const handling = toCurrency(20, cur);
    const lines: RefundLine[] = [];
    let paid = 0;
    let nonRefundableFare = 0;
    let airlineFee = 0;
    let handlingTotal = 0;
    let extrasKept = 0;
    for (const id of selectedIds) {
      const p = b.passengers.find((x) => x.id === id);
      if (!p) continue;
      const u = p.type === "adult" ? unit.adult : p.type === "child" ? unit.child : unit.infant;
      paid += u.base + u.tax;
      let extras = 0;
      for (const optionId of Object.values(b.extras.baggage[p.id] ?? {})) {
        const option = baggageOptionById(optionId);
        if (option) extras += toCurrency(option.price, cur);
      }
      for (const perPax of Object.values(b.extras.seats)) {
        const seat = perPax[p.id];
        if (seat) extras += toCurrency(seat.price, cur);
      }
      paid += extras;
      if (b.fare.refundFee === null) {
        nonRefundableFare += u.base;
        extrasKept += extras;
      } else airlineFee += toCurrency(b.fare.refundFee, cur);
      handlingTotal += handling;
    }
    lines.push({ label: "Paid for selected passengers", amount: paid });
    if (nonRefundableFare) lines.push({ label: `Non-refundable fare (${b.fare.name})`, amount: -nonRefundableFare, tone: "neg" });
    if (extrasKept) lines.push({ label: "Baggage & seat extras (non-refundable)", amount: -extrasKept, tone: "neg" });
    if (airlineFee) lines.push({ label: "Airline cancellation fee", amount: -airlineFee, tone: "neg" });
    if (handlingTotal && b.fare.refundFee !== 0) lines.push({ label: "Cheaperfly handling fee", amount: -handlingTotal, tone: "neg" });
    const handlingCharged = b.fare.refundFee !== 0 ? handlingTotal : 0;
    const net = Math.max(0, paid - nonRefundableFare - extrasKept - airlineFee - handlingCharged);
    lines.push({ label: "Estimated refund", amount: net, tone: "total" });
    return {
      lines,
      paid,
      net,
      fee: airlineFee + handlingCharged,
      refundable: net > 0,
      note:
        b.fare.refundFee === null
          ? "Your fare is non-refundable. Unused airport taxes and charges can be refunded, minus our handling fee."
          : b.fare.refundFee === 0
            ? "Your fare is fully refundable with no airline fee."
            : "Your fare is refundable subject to the airline's cancellation fee shown above.",
    };
  }

  if (b.product === "hotel") {
    const room = b.pricing.lines.find((l) => l.kind === "base")?.amount ?? 0;
    const { taxes, fees, discount, total } = b.pricing;
    const withinWindow = !!b.quote.freeCancelUntil && b.quote.freeCancelUntil >= todayISO();
    const lines: RefundLine[] = [{ label: "Amount paid", amount: total }];
    let net = 0;
    if (b.quote.refundable && withinWindow) {
      net = Math.max(0, room + taxes - discount);
      lines.push({ label: "Non-refundable service fee", amount: -fees, tone: "neg" });
    } else lines.push({ label: "Non-refundable rate / free cancellation period ended", amount: -total, tone: "neg" });
    lines.push({ label: "Estimated refund", amount: net, tone: "total" });
    return {
      lines,
      paid: total,
      net,
      fee: total - net,
      refundable: net > 0,
      note:
        withinWindow && b.quote.refundable
          ? `Free cancellation applies until ${b.quote.freeCancelUntil}. Our service fee is not refundable.`
          : "This rate is non-refundable or the free cancellation period has passed. You can still ask the hotel for goodwill and we will pass on your request.",
    };
  }

  const daysOut = dayDiff(todayISO(), b.startDate);
  const refundShare = daysOut > 60 ? 0.9 : daysOut > 30 ? 0.6 : daysOut > 14 ? 0.3 : 0;
  const share = selectedIds.length && b.travellers.length ? selectedIds.length / b.travellers.length : 1;
  const refundableBase = (b.pricing.base + b.pricing.taxes + b.pricing.extras - b.pricing.discount) * share;
  const paid = Math.round(b.pricing.total * share);
  const net = Math.round(refundableBase * refundShare);
  return {
    lines: [
      { label: "Paid for selected travellers", amount: paid },
      { label: "Non-refundable service fee", amount: -Math.round(b.pricing.fees * share), tone: "neg" },
      {
        label: `Supplier cancellation charges (${Math.round((1 - refundShare) * 100)}% of package — ${daysOut} days to departure)`,
        amount: -Math.round(refundableBase * (1 - refundShare)),
        tone: "neg",
      },
      { label: "Estimated refund", amount: net, tone: "total" },
    ],
    paid,
    net,
    fee: paid - net,
    refundable: net > 0,
    note:
      daysOut > 60
        ? "More than 60 days before departure: 90% of the package cost is refundable."
        : daysOut > 30
          ? "31–60 days before departure: 60% of the package cost is refundable."
          : daysOut > 14
            ? "15–30 days before departure: 30% of the package cost is refundable."
            : "Within 14 days of departure the package is non-refundable. Visa fees already issued cannot be recovered.",
  };
}

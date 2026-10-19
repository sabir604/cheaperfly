import type {
  Booking,
  Contact,
  FlightPassenger,
  HotelGuest,
  UmrahTraveller,
} from "./booking";
export type CheckoutDetails = {
  contact: Contact;
  passengers?: FlightPassenger[];
  guests?: HotelGuest[];
  travellers?: UmrahTraveller[];
  specialRequests?: string[];
  requestNotes?: string;
  arrivalTime?: string;
  notes?: string;
};
export type CheckoutRequest = {
  quoteId: string;
  quoteRevision: number;
  idempotencyKey: string;
  paymentReference: string;
  termsAccepted: true;
  details: CheckoutDetails;
};
export type PaymentInstrument = {
  paymentReference: string;
  method: "card" | "apple_pay" | "google_pay";
  brand: string;
  last4: string;
  expiresAt: string;
  providerMode: "simulated";
};
export type CheckoutState = {
  id: string;
  quoteId: string;
  state: "pending" | "declined" | "confirmed";
  providerMode: "simulated";
  failureCode?: "card_declined" | "insufficient_funds" | "quote_expired";
  booking?: Booking;
};
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => typeof v === "string" && v.length <= 10000;
function safe(v: unknown, depth = 0): boolean {
  if (depth > 25) return false;
  if (
    v === null ||
    typeof v === "boolean" ||
    str(v) ||
    (typeof v === "number" && Number.isFinite(v))
  )
    return true;
  if (Array.isArray(v))
    return v.length <= 2000 && v.every((x) => safe(x, depth + 1));
  return (
    obj(v) &&
    Object.keys(v).length <= 150 &&
    Object.entries(v).every(
      ([k, x]) =>
        ![
          "cvv",
          "number",
          "cardNumber",
          "token_hash",
          "password_hash",
          "paymentReference",
        ].includes(k) && safe(x, depth + 1),
    )
  );
}
export function validCheckoutData(path: string, v: unknown): boolean {
  if (!obj(v)) return false;
  if (path === "payment-tokens")
    return (
      Object.keys(v).length === 6 &&
      str(v.paymentReference) &&
      /^[A-Za-z0-9_-]{43}$/.test(String(v.paymentReference)) &&
      ["card", "apple_pay", "google_pay"].includes(String(v.method)) &&
      str(v.brand) &&
      /^\d{4}$/.test(String(v.last4)) &&
      str(v.expiresAt) &&
      v.providerMode === "simulated"
    );
  if (!safe(v)) return false;
  if (path.startsWith("checkouts/confirmation/")) return validBooking(v);
  return (
    str(v.id) &&
    str(v.quoteId) &&
    v.providerMode === "simulated" &&
    ["pending", "declined", "confirmed"].includes(String(v.state)) &&
    (v.state !== "declined" ||
      ["card_declined", "insufficient_funds", "quote_expired"].includes(
        String(v.failureCode),
      )) &&
    (v.state !== "confirmed" || validBooking(v.booking))
  );
}
function validBooking(v: unknown): boolean {
  if (!obj(v)) return false;
  return (
    str(v.id) &&
    v.providerMode === "simulated" &&
    ["flight", "hotel", "umrah"].includes(String(v.product)) &&
    str(v.createdAt) &&
    obj(v.pricing) &&
    typeof v.pricing.total === "number" &&
    Array.isArray(v.pricing.lines) &&
    obj(v.payment) &&
    ["captured", "pending", "refunded", "partially_refunded"].includes(String(v.payment.status)) &&
    obj(v.contact) &&
    str(v.contact.email) &&
    Array.isArray(v.timeline) &&
    Array.isArray(v.emails) &&
    (v.product === "flight"
      ? Array.isArray(v.passengers) && obj(v.offer) && obj(v.criteria)
      : v.product === "hotel"
        ? Array.isArray(v.guests) && obj(v.hotel) && obj(v.quote)
        : Array.isArray(v.travellers) && obj(v.package) && obj(v.config))
  );
}
export const checkoutFailureMessages = {
  card_declined:
    "The simulated payment was declined. No money was taken. Try another test card.",
  insufficient_funds:
    "The simulated card has insufficient funds. No money was taken. Try another test card.",
  quote_expired:
    "This quote has expired. Return to review and refresh your quote.",
} as const;

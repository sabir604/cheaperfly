import type { CurrencyCode } from "@/lib/engine/currency";
import type { FlightExtras, PriceBreakdown } from "@/lib/engine/pricing";
import type { HotelCriteria, MealPlan, RoomQuote } from "@/lib/engine/hotels";
import type { Fare, FlightCriteria, Offer } from "@/lib/types/flights";
import type {
  UmrahConfig,
  UmrahExtra,
  UmrahFlightOption,
  UmrahHotel,
  UmrahPackage,
  UmrahTransferOption,
} from "@/lib/types/umrah";

export type Product = "flight" | "hotel" | "umrah";
export type PaxType = "adult" | "child" | "infant";
export type BookingStatus = "confirmed" | "ticketed" | "pending" | "cancellation_requested" | "cancelled" | "refunded" | "completed";
export type PaymentMethod = "card" | "apple_pay" | "google_pay";

export interface Contact {
  email: string;
  countryCode: string;
  mobile: string;
}

export interface FlightPassenger {
  id: string;
  type: PaxType;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  passportNo: string;
  passportCountry: string;
  passportExpiry: string;
  frequentFlyer: string;
  savedTravellerId?: string;
  ticketNumber?: string;
}

export interface HotelGuest {
  title: string;
  firstName: string;
  lastName: string;
  isLead: boolean;
}

export interface UmrahTraveller {
  id: string;
  type: PaxType;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  passportNo: string;
  passportCountry?: string;
  passportExpiry: string;
  /** "Travelling with (family / group leader)". */
  mahram: string;
}

export interface PaymentRecord {
  method: PaymentMethod;
  brand: string;
  last4: string;
  cardholder?: string;
  transactionId: string;
  status: "captured" | "pending" | "refunded" | "partially_refunded";
  amount?: number;
  currency?: CurrencyCode;
  paidAt: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  detail?: string;
  at: string;
  done: boolean;
}

interface BookingBase {
  /** Booking reference, `CF-######`. */
  id: string;
  product: Product;
  status: BookingStatus;
  createdAt: string;
  currency: CurrencyCode;
  pricing: PriceBreakdown;
  contact: Contact;
  customerEmail: string;
  leadLastName: string;
  userId?: string;
  payment: PaymentRecord;
  invoiceNo: string;
  timeline: TimelineEvent[];
  emails: { at: string; type: string; to: string }[];
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  travellerCount: number;
  demoSeed?: boolean;
}

export interface FlightBooking extends BookingBase {
  product: "flight";
  pnr: string;
  criteria: FlightCriteria;
  offer: Offer;
  fare: Fare;
  passengers: FlightPassenger[];
  extras: FlightExtras;
}

export interface HotelBookingHotel {
  id: string;
  name: string;
  stars: number;
  address: string;
  city: string;
  country: string;
  image: string;
  checkIn: string;
  checkOut: string;
  policies: unknown;
  distanceLabel: string;
  phone: string;
}

export interface HotelBooking extends BookingBase {
  product: "hotel";
  confirmationNumber: string;
  hotel: HotelBookingHotel;
  criteria: HotelCriteria & { destinationLabel?: string };
  quote: RoomQuote;
  meal: MealPlan;
  guests: HotelGuest[];
  specialRequests: string[];
  requestNotes: string;
  arrivalTime: string;
}

export type VisaStatus = "documents_requested" | "in_progress" | "issued";

export interface UmrahBooking extends BookingBase {
  product: "umrah";
  confirmationNumber: string;
  package: UmrahPackage;
  config: UmrahConfig;
  makkahHotel: UmrahHotel;
  madinahHotel: UmrahHotel;
  flight: UmrahFlightOption;
  transfer: UmrahTransferOption;
  extras: UmrahExtra[];
  travellers: UmrahTraveller[];
  visaStatus: VisaStatus;
  notes: string;
}

export type Booking = FlightBooking | HotelBooking | UmrahBooking;

/* Drafts: in-progress checkouts persisted in `cf.drafts`. */

export interface FlightDraft {
  criteria: FlightCriteria;
  searchId: string;
  offer: Offer;
  fareId: string | null;
  passengers: FlightPassenger[];
  contact: Contact;
  extras: FlightExtras;
  termsAccepted: boolean;
  startedAt: string;
}

export interface HotelDraft {
  criteria: HotelCriteria & { destinationLabel?: string };
  hotelId: string;
  quote: RoomQuote;
  guests: HotelGuest[];
  contact: Contact;
  specialRequests: string[];
  requestNotes: string;
  arrivalTime: string;
  termsAccepted: boolean;
  startedAt: string;
}

export interface UmrahDraft {
  packageId: string;
  config: UmrahConfig;
  travellers: UmrahTraveller[];
  contact: Contact;
  notes: string;
  termsAccepted: boolean;
  startedAt: string;
}

/* Account data persisted in `cf.account`. */

export type RequestKind = "refund" | "cancellation" | "change";
export type RequestStatus = "submitted" | "under_review" | "approved" | "processed" | "rejected";

export interface ServiceRequest {
  /** `RF-#####` for refunds and cancellations, `CH-#####` for changes. */
  id: string;
  kind: RequestKind;
  bookingId: string;
  product: Product;
  bookingTitle: string;
  passengers: string[];
  reason: string;
  explanation?: string;
  status: RequestStatus;
  createdAt: string;
  currency: CurrencyCode;
  refundEstimate?: { gross: number; fee: number; net: number };
  changeDetails?: { preferredDate?: string; notes?: string };
  timeline: TimelineEvent[];
}

export interface SupportCase {
  /** `SP-#####`. */
  id: string;
  bookingRef?: string;
  topic: string;
  subject: string;
  status: "open" | "resolved";
  createdAt: string;
  channel: "message" | "whatsapp" | "phone" | string;
  messages: { from: "customer" | "agent"; text: string; at: string }[];
}

export type NotificationKind = "booking" | "payment" | "ticket" | "trip" | "refund" | "support" | "promo";

export interface AccountNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  at: string;
  read: boolean;
}

export interface SavedTraveller {
  id: string;
  type: PaxType;
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  passportNo: string;
  passportCountry: string;
  passportExpiry: string;
  relationship?: string;
  frequentFlyer?: string;
}

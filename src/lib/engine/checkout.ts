import { apiRequest } from "@/lib/api/client";
import type {
  CheckoutRequest,
  CheckoutState,
  PaymentInstrument,
} from "@cheaperfly/api-contracts/checkout";
import type {
  Booking,
  Product,
  FlightDraft,
  HotelDraft,
  UmrahDraft,
} from "@/lib/types/booking";
import { useDraftsStore } from "@/lib/stores/drafts";
export { checkoutFailureMessages } from "@cheaperfly/api-contracts/checkout";
async function post<T>(path: string, body: unknown): Promise<T> {
  return (
    await apiRequest<T>("public", path, {
      method: "POST",
      body: JSON.stringify(body),
    })
  ).data;
}
export const checkoutService = {
  tokenize: (input: {
    method: "card" | "apple_pay" | "google_pay";
    number?: string;
    testScenario?: "declined";
  }) => post<PaymentInstrument>("payment-tokens", input),
  create: (request: CheckoutRequest) =>
    post<CheckoutState>("checkouts", request),
  status: async (id: string) =>
    (await apiRequest<CheckoutState>("public", "checkouts/" + id)).data,
  resume: (id: string) =>
    post<CheckoutState>("checkouts/" + id + "/resume", {}),
  confirmation: async (reference: string) =>
    (await apiRequest<Booking>("public", "checkouts/confirmation/" + reference))
      .data,
};
export function checkoutDetails(product: Product): CheckoutRequest["details"] {
  const drafts = useDraftsStore.getState();
  if (product === "flight") {
    const f = drafts.flight as FlightDraft;
    return {
      contact: f.contact,
      passengers: f.passengers.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        dob: p.dob,
        gender: p.gender,
        nationality: p.nationality,
        passportNo: p.passportNo,
        passportCountry: p.passportCountry,
        passportExpiry: p.passportExpiry,
        frequentFlyer: p.frequentFlyer,
      })),
    };
  }
  if (product === "hotel") {
    const h = drafts.hotel as HotelDraft;
    return {
      contact: h.contact,
      guests: h.guests,
      specialRequests: h.specialRequests,
      requestNotes: h.requestNotes,
      arrivalTime: h.arrivalTime,
    };
  }
  const u = drafts.umrah as UmrahDraft;
  return { contact: u.contact, travellers: u.travellers, notes: u.notes };
}

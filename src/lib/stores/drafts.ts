import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { HotelCriteria, RoomQuote } from "@/lib/engine/hotels";
import type { AssistanceRequest } from "@/lib/engine/pricing";
import type { FlightCriteria, Offer, Pax } from "@/lib/types/flights";
import type { UmrahConfig } from "@/lib/types/umrah";
import type {
  Contact,
  FlightDraft,
  FlightPassenger,
  HotelDraft,
  PaxType,
  UmrahDraft,
  UmrahTraveller,
} from "@/lib/types/booking";

const EMPTY_CONTACT: Contact = { email: "", countryCode: "+44", mobile: "" };

function blankPassengers(pax: Pax): FlightPassenger[] {
  const out: FlightPassenger[] = [];
  const add = (type: PaxType, count: number) => {
    for (let i = 0; i < count; i++)
      out.push({
        id: `${type}-${i + 1}`,
        type,
        title: "",
        firstName: "",
        middleName: "",
        lastName: "",
        dob: "",
        gender: "",
        nationality: "",
        passportNo: "",
        passportCountry: "",
        passportExpiry: "",
        frequentFlyer: "",
      });
  };
  add("adult", pax.adults);
  add("child", pax.children);
  add("infant", pax.infants);
  return out;
}

function blankTravellers(c: Pick<UmrahConfig, "adults" | "children" | "infants">): UmrahTraveller[] {
  const out: UmrahTraveller[] = [];
  const add = (type: PaxType, count: number) => {
    for (let i = 0; i < count; i++)
      out.push({ id: `${type}-${i + 1}`, type, title: "", firstName: "", lastName: "", dob: "", gender: "", nationality: "", passportNo: "", passportExpiry: "", mahram: "" });
  };
  add("adult", c.adults);
  add("child", c.children);
  add("infant", c.infants);
  return out;
}

type SeatChoice = { seat: string; price: number; kind: string };

interface DraftsState {
  flight: FlightDraft | null;
  hotel: HotelDraft | null;
  umrah: UmrahDraft | null;
  active: "flight" | "hotel" | "umrah" | null;
  setActive: (a: DraftsState["active"]) => void;

  /** Starts (or resumes, for the same offer) a flight checkout. */
  startFlight: (criteria: FlightCriteria, searchId: string, offer: Offer, contact?: Contact) => void;
  /** Changing fare clears seats, since seat prices depend on the fare. */
  selectFare: (fareId: string) => void;
  patchFlight: (patch: Partial<FlightDraft>) => void;
  setPassengers: (p: FlightPassenger[]) => void;
  setContact: (c: Contact) => void;
  setBaggage: (paxId: string, legIndex: number | string, optionId: string | null) => void;
  setMeal: (paxId: string, legIndex: number | string, mealId: string) => void;
  /** Assigning a seat already held by another passenger on the segment takes it from them. */
  setSeat: (segmentId: string, paxId: string, choice: SeatChoice | null) => void;
  setAssistance: (paxId: string, request: AssistanceRequest) => void;
  setSeatsSkipped: (skipped: boolean) => void;
  clearSeats: () => void;
  clearFlight: () => void;

  startHotel: (criteria: HotelDraft["criteria"], hotelId: string, quote: RoomQuote, contact?: Contact, serverQuote?: import("@cheaperfly/api-contracts/hotels").HotelQuote) => void;
  patchHotel: (patch: Partial<HotelDraft>) => void;
  clearHotel: () => void;

  startUmrah: (packageId: string, config: UmrahConfig, contact?: Contact, serverQuote?: import("@cheaperfly/api-contracts/umrah").UmrahQuote) => void;
  patchUmrah: (patch: Partial<UmrahDraft>) => void;
  /** Changing the party size resets the traveller forms. */
  updateUmrahConfig: (patch: Partial<UmrahConfig>) => void;
  clearUmrah: () => void;
}

/** In-progress checkouts, persisted in `cf.drafts` so a refresh doesn't lose the booking. */
export const useDraftsStore = create<DraftsState>()(
  persist(
    (set) => {
      const updateFlight = (fn: (f: FlightDraft) => Partial<FlightDraft>) => set((s) => (s.flight ? { flight: { ...s.flight, quote: undefined, ...fn(s.flight) } } : s));
      return {
        flight: null,
        hotel: null,
        umrah: null,
        active: null,
        setActive: (active) => set({ active }),

        startFlight: (criteria, searchId, offer, contact) =>
          set((s) => {
            const existing = s.flight && s.flight.offer.id === offer.id && s.flight.searchId === searchId ? s.flight : null;
            if (existing) return { flight: { ...existing, criteria }, active: "flight" };
            return {
              flight: {
                criteria,
                searchId,
                offer,
                fareId: null,
                passengers: blankPassengers(criteria.pax),
                contact: contact ?? EMPTY_CONTACT,
                extras: { baggage: {}, meals: {}, seats: {}, assistance: {}, seatsSkipped: false },
                termsAccepted: false,
                startedAt: new Date().toISOString(),
              },
              active: "flight",
            };
          }),
        selectFare: (fareId) =>
          updateFlight((f) => ({
            fareId,
            extras: f.fareId && f.fareId !== fareId ? { ...f.extras, seats: {}, seatsSkipped: false } : f.extras,
          })),
        patchFlight: (patch) => updateFlight(() => patch),
        setPassengers: (passengers) => updateFlight(() => ({ passengers })),
        setContact: (contact) => updateFlight(() => ({ contact })),
        setBaggage: (paxId, legIndex, optionId) =>
          updateFlight((f) => {
            const baggage = { ...f.extras.baggage, [paxId]: { ...(f.extras.baggage[paxId] ?? {}) } };
            if (optionId) baggage[paxId][legIndex] = optionId;
            else delete baggage[paxId][legIndex];
            return { extras: { ...f.extras, baggage } };
          }),
        setMeal: (paxId, legIndex, mealId) =>
          updateFlight((f) => ({
            extras: { ...f.extras, meals: { ...f.extras.meals, [paxId]: { ...(f.extras.meals[paxId] ?? {}), [legIndex]: mealId } } },
          })),
        setSeat: (segmentId, paxId, choice) =>
          updateFlight((f) => {
            const seg = { ...(f.extras.seats[segmentId] ?? {}) };
            if (choice) {
              for (const [otherPax, s] of Object.entries(seg)) if (s.seat === choice.seat && otherPax !== paxId) delete seg[otherPax];
              seg[paxId] = choice;
            } else delete seg[paxId];
            return { extras: { ...f.extras, seats: { ...f.extras.seats, [segmentId]: seg }, seatsSkipped: false } };
          }),
        setAssistance: (paxId, request) => updateFlight((f) => ({ extras: { ...f.extras, assistance: { ...f.extras.assistance, [paxId]: request } } })),
        setSeatsSkipped: (skipped) => updateFlight((f) => ({ extras: { ...f.extras, seatsSkipped: skipped, seats: skipped ? {} : f.extras.seats } })),
        clearSeats: () => updateFlight((f) => ({ extras: { ...f.extras, seats: {} } })),
        clearFlight: () => set((s) => ({ flight: null, active: s.active === "flight" ? null : s.active })),

        startHotel: (criteria, hotelId, quote, contact, serverQuote) =>
          set((s) => ({
            hotel: {
              criteria,
              hotelId,
              quote,
              searchId:serverQuote?.searchId,
              hotel:serverQuote?.hotel,
              serverQuote,
              guests: Array.from({ length: Math.max(1, criteria.occupancy.rooms) }, (_, i) => ({ title: "", firstName: "", lastName: "", isLead: i === 0 })),
              contact: s.hotel?.hotelId === hotelId && s.hotel.contact.email ? s.hotel.contact : (contact ?? EMPTY_CONTACT),
              specialRequests: [],
              requestNotes: "",
              arrivalTime: "15:00",
              termsAccepted: false,
              startedAt: new Date().toISOString(),
            },
            active: "hotel",
          })),
        patchHotel: (patch) => set((s) => (s.hotel ? { hotel: { ...s.hotel, ...patch } } : s)),
        clearHotel: () => set((s) => ({ hotel: null, active: s.active === "hotel" ? null : s.active })),

        startUmrah: (packageId, config, contact, serverQuote) =>
          set((s) => ({
            umrah: {
              packageId,
              config,
              serverQuote,
              travellers: blankTravellers(config),
              contact: s.umrah?.contact.email ? s.umrah.contact : (contact ?? EMPTY_CONTACT),
              notes: "",
              termsAccepted: false,
              startedAt: new Date().toISOString(),
            },
            active: "umrah",
          })),
        patchUmrah: (patch) => set((s) => (s.umrah ? { umrah: { ...s.umrah, ...patch } } : s)),
        updateUmrahConfig: (patch) =>
          set((s) => {
            if (!s.umrah) return s;
            const config = { ...s.umrah.config, ...patch };
            const partyChanged =
              config.adults !== s.umrah.config.adults || config.children !== s.umrah.config.children || config.infants !== s.umrah.config.infants;
            return { umrah: { ...s.umrah, documents:undefined, serverQuote:undefined, config, travellers: partyChanged ? blankTravellers(config) : s.umrah.travellers } };
          }),
        clearUmrah: () => set((s) => ({ umrah: null, active: s.active === "umrah" ? null : s.active })),
      };
    },
    { name: "cf.drafts", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

export type { HotelCriteria };

/** Per-tab replay payload; card numbers and CVV never enter this store. */
export interface PendingPayment {
  product:"flight"|"hotel"|"umrah";
  request:import("@cheaperfly/api-contracts/checkout").CheckoutRequest;
}

interface CheckoutState {
  /** Payment in flight between /checkout/payment and /checkout/processing. */
  pending: PendingPayment | null;
  lastRef: string | null;
  failure: { code: string; message: string } | null;
  setPending: (p: PendingPayment | null) => void;
  setLastRef: (ref: string | null) => void;
  setFailure: (f: CheckoutState["failure"]) => void;
}

/** Per-tab payment hand-off, persisted in sessionStorage (`cf.checkout`). */
export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      pending: null,
      lastRef: null,
      failure: null,
      setPending: (pending) => set({ pending }),
      setLastRef: (lastRef) => set({ lastRef }),
      setFailure: (failure) => set({ failure }),
    }),
    { name: "cf.checkout", version: 1, migrate: () => ({pending:null,lastRef:null,failure:null}), storage: createJSONStorage(() => sessionStorage), skipHydration: true },
  ),
);

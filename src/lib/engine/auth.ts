/**
 * Simulated accounts. Everything lives in localStorage; no real account is created and no email is sent.
 * The verification code is shown on screen in a "Demo inbox".
 */
import { DESTINATIONS, getHotel } from "@/data/hotels";
import { addDaysISO, todayISO } from "@/lib/engine/dates";
import { generateOffers } from "@/lib/engine/flights/offers";
import { bestQuote, quoteRoom } from "@/lib/engine/hotels";
import { newId } from "@/lib/engine/refs";
import { createRng } from "@/lib/engine/rng";
import { sleep } from "@/lib/engine/service";
import { defaultUmrahConfig, getUmrahPackage } from "@/lib/engine/umrah";
import { createFlightBooking, createHotelBooking, createUmrahBooking, type CreateBookingOptions } from "@/lib/engine/bookings/service";
import { useAccountStore, useBookingsStore } from "@/lib/stores/bookings";
import { useSessionStore, useUiStore, type Profile, type User } from "@/lib/stores/session";
import type {
  AccountNotification,
  Contact,
  FlightCriteria,
} from "@/lib/types";
import type { FlightPassenger, SavedTraveller, ServiceRequest, SupportCase, UmrahTraveller } from "@/lib/types/booking";

export const DEMO_EMAIL = "demo@cheaperfly.com";
export const DEMO_PASSWORD = "Demo@1234";

export type AuthResult = { ok: true; user?: User } | { ok: false; error: string; code?: "invalid" | "unverified" | "not_found" };

const DEMO_TRAVELLERS: SavedTraveller[] = [
  { id: "trv_amira", type: "adult", title: "Ms", firstName: "Amira", lastName: "Khan", dob: "1988-04-12", gender: "female", nationality: "GB", passportNo: "533871204", passportCountry: "GB", passportExpiry: "2031-06-18", relationship: "Myself" },
  { id: "trv_yusuf", type: "adult", title: "Mr", firstName: "Yusuf", lastName: "Khan", dob: "1986-09-02", gender: "male", nationality: "GB", passportNo: "512004419", passportCountry: "GB", passportExpiry: "2029-11-30", relationship: "Spouse", frequentFlyer: "EK 7781 2290" },
  { id: "trv_zayan", type: "child", title: "Master", firstName: "Zayan", lastName: "Khan", dob: "2018-05-21", gender: "male", nationality: "GB", passportNo: "548120037", passportCountry: "GB", passportExpiry: "2030-03-01", relationship: "Son" },
  { id: "trv_layla", type: "adult", title: "Mrs", firstName: "Layla", lastName: "Hussain", dob: "1958-01-30", gender: "female", nationality: "GB", passportNo: "498877102", passportCountry: "GB", passportExpiry: "2028-08-14", relationship: "Mother" },
];

function asPassenger(t: SavedTraveller, id: string): FlightPassenger {
  return {
    id,
    type: t.type,
    title: t.title,
    firstName: t.firstName,
    middleName: t.middleName ?? "",
    lastName: t.lastName,
    dob: t.dob,
    gender: t.gender,
    nationality: t.nationality,
    passportNo: t.passportNo,
    passportCountry: t.passportCountry,
    passportExpiry: t.passportExpiry,
    frequentFlyer: t.frequentFlyer ?? "",
    savedTravellerId: t.id,
  };
}

const demoPayment = (last4 = "4242"): CreateBookingOptions["payment"] => ({
  method: "card",
  brand: "Visa",
  last4,
  cardholder: "AMIRA KHAN",
  transactionId: `TXN-${last4}${Math.floor(9e4 * Math.random() + 1e4)}`,
  status: "captured",
  paidAt: new Date().toISOString(),
});

/** A moment `days` from today at `hour`:12 local time. */
const at = (days: number, hour = 10) => new Date(`${addDaysISO(todayISO(), days)}T${String(hour).padStart(2, "0")}:12:00`);

/** Gives the demo account a realistic history: past, refunded, upcoming hotel and Umrah trips, requests and notifications. */
function seedDemoAccount(user: User) {
  const bookings = useBookingsStore.getState();
  if (bookings.seededFor.includes(user.id)) return;
  const contact: Contact = { email: user.email, countryCode: "+44", mobile: "7700900123" };
  const base = { currency: "GBP" as const, member: true, userId: user.id, demoSeed: true, notify: false };

  // Completed Istanbul trip, 62 days ago.
  {
    const dep = addDaysISO(todayISO(), -62);
    const criteria: FlightCriteria = {
      trip: "return",
      legs: [
        { from: "MAN", to: "IST", date: dep },
        { from: "IST", to: "MAN", date: addDaysISO(dep, 5) },
      ],
      pax: { adults: 1, children: 0, infants: 0 },
      cabin: "economy",
    };
    const offer = generateOffers(criteria).sort((a, b) => a.fares[1].farePerAdult - b.fares[1].farePerAdult)[0];
    createFlightBooking(
      {
        criteria,
        searchId: "seed",
        offer,
        fareId: offer.fares[1].id,
        passengers: [asPassenger(DEMO_TRAVELLERS[0], "adult-1")],
        contact,
        extras: { baggage: {}, meals: { "adult-1": { 0: "halal", 1: "halal" } }, seats: {}, assistance: {}, seatsSkipped: true },
        termsAccepted: true,
        startedAt: at(-90).toISOString(),
      },
      { ...base, payment: demoPayment(), now: at(-88, 14), status: "completed" },
    );
  }

  // Refunded Dubai trip.
  let refundedRef = "";
  {
    const dep = addDaysISO(todayISO(), 34);
    const criteria: FlightCriteria = {
      trip: "return",
      legs: [
        { from: "LHR", to: "DXB", date: dep },
        { from: "DXB", to: "LHR", date: addDaysISO(dep, 8) },
      ],
      pax: { adults: 2, children: 0, infants: 0 },
      cabin: "economy",
    };
    const offer = generateOffers(criteria).find((o) => o.airlineCode === "EK") ?? generateOffers(criteria)[0];
    const b = createFlightBooking(
      {
        criteria,
        searchId: "seed",
        offer,
        fareId: offer.fares[1].id,
        passengers: [asPassenger(DEMO_TRAVELLERS[0], "adult-1"), asPassenger(DEMO_TRAVELLERS[1], "adult-2")],
        contact,
        extras: { baggage: { "adult-1": { 0: "bag10" } }, meals: {}, seats: {}, assistance: {}, seatsSkipped: true },
        termsAccepted: true,
        startedAt: at(-30).toISOString(),
      },
      { ...base, payment: demoPayment("4242"), now: at(-21, 9), status: "refunded" },
    );
    refundedRef = b.id;
    useBookingsStore.getState().updateBooking(b.id, (x) => ({
      ...x,
      payment: { ...x.payment, status: "refunded" },
      timeline: [
        ...x.timeline,
        { id: "t-cx", label: "Cancellation requested", detail: "RF-10482 · Change of plans", at: at(-12, 11).toISOString(), done: true },
        { id: "t-rf", label: "Refund processed", detail: "Refund issued to the original card", at: at(-5, 15).toISOString(), done: true },
      ],
    }));
  }

  // Upcoming Dubai hotel stay.
  {
    const hotel = getHotel("jumeirah-sands")!;
    const dest = DESTINATIONS.find((d) => d.id === "dubai")!;
    const criteria = {
      destination: dest.id,
      destinationLabel: dest.label,
      checkIn: addDaysISO(todayISO(), 75),
      checkOut: addDaysISO(todayISO(), 79),
      occupancy: { rooms: 1, adults: 2, children: 0, childAges: [] },
    };
    const quote = quoteRoom(hotel, hotel.rooms[1], "breakfast", criteria) ?? bestQuote(hotel, criteria)!;
    createHotelBooking(
      {
        criteria,
        hotelId: hotel.id,
        quote,
        guests: [{ title: "Ms", firstName: "Amira", lastName: "Khan", isLead: true }],
        contact,
        specialRequests: ["High floor", "Late arrival"],
        requestNotes: "Celebrating an anniversary — a quiet room would be lovely.",
        arrivalTime: "20:00",
        termsAccepted: true,
        startedAt: at(-16).toISOString(),
      },
      { ...base, payment: demoPayment(), now: at(-14, 19) },
    );
  }

  // Family Umrah, ~110 days out.
  {
    const pkg = getUmrahPackage("family-umrah-10-nights");
    if (pkg && pkg.departures.length) {
      const target = addDaysISO(todayISO(), 110);
      const departure = pkg.departures.find((d) => d.date >= target) ?? pkg.departures[pkg.departures.length - 1];
      const config = defaultUmrahConfig(pkg, { departureDate: departure.date, adults: 2, children: 1, infants: 0, roomType: "triple" });
      const traveller = (id: string, type: UmrahTraveller["type"], t: SavedTraveller): UmrahTraveller => ({
        id,
        type,
        title: t.title,
        firstName: t.firstName,
        lastName: t.lastName,
        dob: t.dob,
        gender: t.gender,
        nationality: t.nationality,
        passportNo: t.passportNo,
        passportExpiry: t.passportExpiry,
        mahram: "",
      });
      createUmrahBooking(
        {
          packageId: pkg.id,
          config,
          travellers: [traveller("adult-1", "adult", DEMO_TRAVELLERS[0]), traveller("adult-2", "adult", DEMO_TRAVELLERS[1]), traveller("child-1", "child", DEMO_TRAVELLERS[2])],
          contact,
          notes: "Please arrange wheelchair assistance at Madinah airport for my father-in-law's stopover.",
          termsAccepted: true,
          startedAt: at(-9).toISOString(),
        },
        { ...base, payment: demoPayment(), now: at(-8, 13) },
      );
    }
  }

  const all = useBookingsStore.getState().bookings;
  const refunded = all.find((b) => b.id === refundedRef);
  const requests: ServiceRequest[] = [
    {
      id: "RF-10482",
      kind: "refund",
      bookingId: refundedRef,
      product: "flight",
      bookingTitle: "London ⇄ Dubai",
      passengers: ["Amira Khan", "Yusuf Khan"],
      reason: "Change of plans",
      explanation: "We are no longer able to travel on these dates because of a family commitment.",
      status: "processed",
      createdAt: at(-12, 11).toISOString(),
      currency: refunded?.currency ?? "GBP",
      refundEstimate: refunded ? { gross: refunded.pricing.total, fee: 40, net: refunded.pricing.total - 40 } : { gross: 0, fee: 0, net: 0 },
      timeline: [
        { id: "1", label: "Submitted", at: at(-12, 11).toISOString(), done: true },
        { id: "2", label: "Under review", detail: "Checked against fare rules", at: at(-11, 9).toISOString(), done: true },
        { id: "3", label: "Approved", detail: "Airline approved the refund", at: at(-8, 16).toISOString(), done: true },
        { id: "4", label: "Processed", detail: "Refunded to the card ending 4242", at: at(-5, 15).toISOString(), done: true },
      ],
    },
  ];
  const umrah = all.find((b) => b.product === "umrah");
  const hotel = all.find((b) => b.product === "hotel");
  if (hotel)
    requests.unshift({
      id: "CH-20931",
      kind: "change",
      bookingId: hotel.id,
      product: "hotel",
      bookingTitle: hotel.title,
      passengers: ["Amira Khan"],
      reason: "Change dates",
      explanation: "Would like to arrive one day earlier if the same room is available.",
      status: "under_review",
      createdAt: at(-3, 10).toISOString(),
      currency: hotel.currency,
      changeDetails: { preferredDate: addDaysISO(todayISO(), 74), notes: "Extend by one night at the start." },
      timeline: [
        { id: "1", label: "Submitted", at: at(-3, 10).toISOString(), done: true },
        { id: "2", label: "Under review", detail: "Waiting for the hotel to confirm availability", at: at(-2, 12).toISOString(), done: true },
        { id: "3", label: "Decision", at: at(0).toISOString(), done: false },
      ],
    });
  const cases: SupportCase[] = [
    {
      id: "SP-40218",
      topic: "Baggage",
      subject: "Extra baggage allowance for Istanbul flight",
      status: "resolved",
      createdAt: at(-75, 12).toISOString(),
      channel: "message",
      messages: [
        { from: "customer", text: "Can I add an extra 10kg to my Istanbul booking?", at: at(-75, 12).toISOString() },
        {
          from: "agent",
          text: "Hi Amira, yes — you can add baggage from Manage Booking. We've also applied a 10% goodwill credit to your account.",
          at: at(-75, 13).toISOString(),
        },
      ],
    },
  ];
  const notifications: AccountNotification[] = [
    {
      id: "n1",
      kind: "refund",
      title: "Refund processed",
      body: "Your refund for London ⇄ Dubai (RF-10482) has been sent to the card ending 4242.",
      at: at(-5, 15).toISOString(),
      read: false,
      href: "/account/refunds",
    },
    ...(umrah
      ? [
          {
            id: "n2",
            kind: "trip" as const,
            title: "Action needed: visa documents",
            body: "Upload passport copies for all travellers so we can apply for your Umrah visas.",
            at: at(-1, 9).toISOString(),
            read: false,
            href: `/account/bookings/${umrah.id}`,
          },
        ]
      : []),
    ...(hotel
      ? [
          {
            id: "n3",
            kind: "support" as const,
            title: "Change request received",
            body: "CH-20931: we're checking availability with the hotel and will update you within 24 hours.",
            at: at(-2, 12).toISOString(),
            read: false,
            href: "/account/refunds",
          },
        ]
      : []),
    {
      id: "n4",
      kind: "promo",
      title: "Dubai flights from £345",
      body: "Fares to Dubai just dropped for October departures. Search now to see the latest deals.",
      at: at(-3, 8).toISOString(),
      read: true,
      href: "/flights",
    },
    {
      id: "n5",
      kind: "trip",
      title: "How was Istanbul?",
      body: "Your trip ended on " + addDaysISO(todayISO(), -57) + ". Download your invoice or leave a review.",
      at: at(-56, 10).toISOString(),
      read: true,
      href: "/account/bookings",
    },
  ];
  useAccountStore.getState().seed(user.id, { travellers: DEMO_TRAVELLERS, notifications, requests, cases });
  useBookingsStore.getState().markSeeded(user.id);
}

function startSession(user: User, profile: Profile) {
  useSessionStore.getState().setSession(user, profile);
  useUiStore.getState().setCurrency(useSessionStore.getState().preferences.currency);
  if (user.isDemo) seedDemoAccount(user);
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  await sleep(700);
  const e = email.trim().toLowerCase();
  if (e === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const user: User = { id: "usr_demo", email: DEMO_EMAIL, firstName: "Amira", lastName: "Khan", memberSince: "2024-03-11", verified: true, isDemo: true };
    startSession(user, {
      title: "Ms",
      firstName: "Amira",
      lastName: "Khan",
      dob: "1988-04-12",
      gender: "female",
      nationality: "GB",
      email: DEMO_EMAIL,
      countryCode: "+44",
      mobile: "7700900123",
      address: { line1: "24 Kingsley Road", line2: "Flat 3", city: "London", postcode: "N4 2QR", country: "United Kingdom" },
      passportNo: "533871204",
      passportCountry: "GB",
      passportExpiry: "2031-06-18",
    });
    return { ok: true, user };
  }
  const cred = useSessionStore.getState().credentials.find((c) => c.email === e);
  if (!cred) return { ok: false, error: "We couldn't find an account with that email. Check the address or create an account.", code: "not_found" };
  if (cred.password !== password) return { ok: false, error: "That password doesn't match. Try again or reset your password.", code: "invalid" };
  if (!cred.user.verified) {
    await requestOtp("signup", e);
    return { ok: false, error: "Your email isn't verified yet. We've sent you a new code.", code: "unverified" };
  }
  startSession(cred.user, cred.profile);
  return { ok: true, user: cred.user };
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  mobile: string;
  password: string;
  marketing: boolean;
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  await sleep(800);
  const email = input.email.trim().toLowerCase();
  const session = useSessionStore.getState();
  if (email === DEMO_EMAIL || session.credentials.some((c) => c.email === email && c.user.verified))
    return { ok: false, error: "An account with this email already exists. Try signing in instead." };
  const user: User = {
    id: newId("usr"),
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    memberSince: new Date().toISOString().slice(0, 10),
    verified: false,
  };
  const profile: Profile = {
    title: "",
    firstName: user.firstName,
    lastName: user.lastName,
    dob: "",
    gender: "",
    nationality: "",
    email,
    countryCode: input.countryCode,
    mobile: input.mobile,
    address: { line1: "", city: "", postcode: "", country: "" },
    passportNo: "",
    passportCountry: "",
    passportExpiry: "",
  };
  session.addCredential({ email, password: input.password, user, profile });
  session.updatePreferences({ marketing: input.marketing });
  await requestOtp("signup", email);
  return { ok: true };
}

/** Issues a fresh 6-digit code (shown in the demo inbox). */
export async function requestOtp(purpose: "signup" | "reset", email: string): Promise<string> {
  await sleep(400);
  const code = String(createRng(`${Date.now()}-${Math.random()}`).int(100000, 999999));
  useSessionStore.getState().setOtp({ purpose, email: email.trim().toLowerCase(), code, createdAt: new Date().toISOString() });
  return code;
}

export async function verifyOtp(code: string): Promise<AuthResult> {
  await sleep(700);
  const session = useSessionStore.getState();
  const otp = session.otp;
  if (!otp) return { ok: false, error: "Your code has expired. Request a new one.", code: "invalid" };
  if (code.replace(/\s/g, "") !== otp.code) return { ok: false, error: "That code isn't right. Check the digits and try again.", code: "invalid" };
  const cred = session.credentials.find((c) => c.email === otp.email);
  if (!cred) return { ok: false, error: "We couldn't find that account.", code: "not_found" };
  const user = { ...cred.user, verified: true };
  session.addCredential({ ...cred, user });
  session.setOtp(null);
  startSession(user, cred.profile);
  return { ok: true, user };
}

export async function requestPasswordReset(email: string): Promise<{ ok: true; exists: boolean }> {
  await sleep(700);
  const e = email.trim().toLowerCase();
  const exists = e === DEMO_EMAIL || useSessionStore.getState().credentials.some((c) => c.email === e);
  if (exists) await requestOtp("reset", e);
  return { ok: true, exists };
}

export async function resetPassword(email: string, password: string): Promise<AuthResult> {
  await sleep(700);
  const e = email.trim().toLowerCase();
  const session = useSessionStore.getState();
  if (e === DEMO_EMAIL) return { ok: false, error: "The demo account password can't be changed. Use the demo credentials from /demo." };
  if (!session.credentials.some((c) => c.email === e)) return { ok: false, error: "That reset link is no longer valid." };
  session.updateCredentialPassword(e, password);
  session.setOtp(null);
  return { ok: true };
}

export function signOut() {
  useSessionStore.getState().clearSession();
}

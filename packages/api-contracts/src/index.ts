import {validInquiryData} from "./inquiries";
import { validBookingData } from "./bookings";
import { validCheckoutData } from "./checkout";
import { validUmrahData } from "./umrah";
import { validHotelData } from "./hotels";
import { validFlightData } from "./flights";
import { isWebsiteContent, isWebsiteFeatures } from "./configuration";
/** Shared wire contracts only. Never import server configuration or credentials here. */
export const API_VERSION = "2026-10-16.v1" as const;
export const CUSTOMER_COOKIE = "cf_customer_session";
export const CUSTOMER_SESSION_HEADER = "x-cheaperfly-customer-session";
export const MAX_JSON_BYTES = 1_048_576;
export const featureKeys = [
  "flights",
  "hotels",
  "umrah",
  "b2b",
  "customerSignup",
  "promoCodes",
  "whatsappSupport",
  "telephony",
  "aiFeatures",
] as const;
export type Features = Record<(typeof featureKeys)[number], boolean>;
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type Currency = "GBP" | "USD" | "EUR" | "AED" | "SAR";
/** Integer minor units (pence/cents/fils/halalas); never whole display units. */
export type Money = { currency: Currency; minorUnits: number };
export type FxSnapshot = {
  baseCurrency: "GBP";
  quoteCurrency: Currency;
  rate: string;
  capturedAt: string;
  source: "simulated";
};
export type Pagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};
export type Meta = {
  apiVersion: typeof API_VERSION;
  providerMode: "simulated";
  requestId: string;
};
export type Success<T> = { data: T; meta: Meta; pagination?: Pagination };
export type ErrorCode =
  | "conflict"
  | "invalid_request"
  | "validation_error"
  | "email_unverified"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "not_implemented"
  | "rate_limited"
  | "payload_too_large"
  | "unsupported_media_type"
  | "service_unavailable"
  | "upstream_error"
  | "timeout";
export type Failure = {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    fields?: Record<string, string[]>;
  };
};
export type Health = {
  status: "ok";
  database: "sqlite";
  service: "cheaperfly-admin";
};
export type PublicConfiguration = {
  source: "bootstrap" | "published";
  version: number;
  content: import("./configuration").WebsiteContent;
  features: Features;
};
export type Customer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  verified: boolean;
  memberSince: string;
};
export type Session = { customer: Customer; expiresAt: string };
/** Private backend-to-BFF response. The BFF must consume token and never send it to browser JavaScript. */
export type InternalSession = Session & { token: string };
export type Quote = {
  id: string;
  product: "flight" | "hotel" | "umrah";
  expiresAt: string;
  total: Money;
  accountingTotal: Money & { currency: "GBP" };
  fx: FxSnapshot;
  revision: number;
};
export type CheckoutInput = import("./checkout").CheckoutRequest;
export type CheckoutResult = import("./checkout").CheckoutState;
export type HttpMethod =
  "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "HEAD" | "OPTIONS";
export type Scope = "public" | "customer";
export type Endpoint = {
  scope: Scope;
  path: string;
  methods: readonly HttpMethod[];
  active: boolean;
  step: number;
};
// Exact path templates; planned endpoints are denied locally, never proxied speculatively.
const plannedEndpoints: readonly Endpoint[] = [
  { scope: "public", path: "health", methods: ["GET"], active: true, step: 3 },
  {
    scope: "public",
    path: "configuration",
    methods: ["GET"],
    active: true,
    step: 3,
  },
  ...[
    "flights/airports",
    "flights/previews",
    "flights/search",
    "flights/quotes",
    "flights/seat-maps",
    "flights/revalidate",
  ].map((path) => ({
    scope: "public" as const,
    path,
    methods: ["POST" as const],
    active: false,
    step: 8,
  })),
  ...["hotels/search", "hotels/availability", "hotels/previews", "hotels/quotes"].map((path) => ({
    scope: "public" as const,
    path,
    methods: ["POST" as const],
    active: false,
    step: 9,
  })),
  {
    scope: "public",
    path: "hotels/:id",
    methods: ["GET"],
    active: false,
    step: 9,
  },
  {
    scope: "public",
    path: "umrah/packages",
    methods: ["GET"],
    active: false,
    step: 10,
  },
  {
    scope: "public",
    path: "umrah/packages/:id",
    methods: ["GET"],
    active: false,
    step: 10,
  },
  ...["umrah/search","umrah/configurations","umrah/travellers"].map(path=>({scope:"public" as const,path,methods:["POST" as const],active:false,step:10})),
  {
    scope: "public",
    path: "umrah/quotes",
    methods: ["POST"],
    active: false,
    step: 10,
  },
  {
    scope: "public",
    path: "inquiries",
    methods: ["POST"],
    active: false,
    step: 14,
  },
  {
    scope: "public",
    path: "newsletter",
    methods: ["POST"],
    active: false,
    step: 14,
  },
  {
    scope: "public",
    path: "guest-access",
    methods: ["POST"],
    active: false,
    step: 12,
  },
  {
    scope: "customer",
    path: "session",
    methods: ["GET", "POST", "DELETE"],
    active: false,
    step: 5,
  },
  ...[
    "registration",
    "verification",
    "verification/resend",
    "password/reset-request",
    "password/reset",
  ].map((path) => ({
    scope: "customer" as const,
    path,
    methods: ["POST" as const],
    active: false,
    step: 5,
  })),
  {
    scope: "customer",
    path: "password",
    methods: ["POST"],
    active: false,
    step: 5,
  },
  ...["profile", "preferences"].map((path) => ({
    scope: "customer" as const,
    path,
    methods: ["GET" as const, "PATCH" as const],
    active: false,
    step: 6,
  })),
  ...["travellers", "notifications"].flatMap((path) => [
    {
      scope: "customer" as const,
      path,
      methods:
        path === "travellers"
          ? ["GET" as const, "POST" as const]
          : ["GET" as const],
      active: false,
      step: 6,
    },
    {
      scope: "customer" as const,
      path: path + "/:id",
      methods: ["PATCH" as const, "DELETE" as const],
      active: false,
      step: 6,
    },
  ]),
  {
    scope: "customer",
    path: "notifications/read-all",
    methods: ["POST"],
    active: false,
    step: 6,
  },
  ...["customer","public"].map(scope=>({scope:scope as Scope,path:"support/:id",methods:["GET" as const],active:false,step:13})),
  ...["bookings/:id/stay"].map(path=>({scope:"customer" as const,path,methods:["PATCH" as const],active:false,step:13})),
  ...["bookings/:id/contact","bookings/:id/stay"].map(path=>({scope:"public" as const,path,methods:["PATCH" as const],active:false,step:13})),
  ...["requests","support","support/:id/messages"].map(path=>({scope:"public" as const,path,methods:["POST" as const],active:false,step:13})),
  ...["bookings/:id","bookings/:id/documents/:kind"].map(path=>({scope:"public" as const,path,methods:["GET" as const],active:false,step:12})),
  {scope:"public",path:"payment-tokens",methods:["POST"],active:false,step:11},
  ...(["public","customer"] as const).flatMap(scope=>[
    {scope,path:"checkouts/confirmation/:reference",methods:["GET" as const],active:false,step:11},
    {scope,path:"checkouts/:id/resume",methods:["POST" as const],active:false,step:11},
  ]),
  {scope:"public",path:"checkouts",methods:["POST"],active:false,step:11},
  {scope:"public",path:"checkouts/:id",methods:["GET"],active:false,step:11},
  {
    scope: "customer",
    path: "checkouts",
    methods: ["POST"],
    active: false,
    step: 11,
  },
  {
    scope: "customer",
    path: "checkouts/:id",
    methods: ["GET"],
    active: false,
    step: 11,
  },
  {
    scope: "customer",
    path: "bookings",
    methods: ["GET"],
    active: false,
    step: 12,
  },
  {
    scope: "customer",
    path: "bookings/:id",
    methods: ["GET"],
    active: false,
    step: 12,
  },
  {
    scope: "customer",
    path: "bookings/:id/documents/:kind",
    methods: ["GET"],
    active: false,
    step: 12,
  },
  {
    scope: "customer",
    path: "bookings/:id/contact",
    methods: ["PATCH"],
    active: false,
    step: 13,
  },
  {
    scope: "customer",
    path: "bookings/:id/extras",
    methods: ["PATCH"],
    active: false,
    step: 13,
  },
  {
    scope: "customer",
    path: "requests",
    methods: ["GET", "POST"],
    active: false,
    step: 13,
  },
  {
    scope: "customer",
    path: "support",
    methods: ["GET", "POST"],
    active: false,
    step: 13,
  },
  {
    scope: "customer",
    path: "support/:id/messages",
    methods: ["POST"],
    active: false,
    step: 13,
  },
];
export const endpoints: readonly Endpoint[] = plannedEndpoints.map((endpoint) => [5, 6, 8, 9, 10, 11, 12, 13, 14].includes(endpoint.step) ? { ...endpoint, active: true } : endpoint);
export function resolveEndpoint(
  scope: Scope,
  path: string,
): Endpoint | undefined {
  if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path) || path.length > 512)
    return;
  const parts = path.split("/");
  return (
    endpoints.find((e) => e.scope === scope && e.path === path) ??
    endpoints.find(
      (e) =>
        e.scope === scope &&
        e.path.split("/").length === parts.length &&
        e.path
          .split("/")
          .every((part, i) => part.startsWith(":") || part === parts[i]),
    )
  );
}
export const messages: Record<ErrorCode, string> = {
  conflict: "This request conflicts with an earlier action. Please refresh and try again.",
  invalid_request: "Please check your request and try again.",
  validation_error: "Please check the highlighted fields.",
  email_unverified: "Please verify your email before signing in.",
  unauthenticated: "Please sign in to continue.",
  forbidden: "You cannot perform this action.",
  not_found: "This service could not be found.",
  method_not_allowed: "This action is not supported.",
  not_implemented: "This service is not connected yet.",
  rate_limited: "Too many requests. Please try again later.",
  payload_too_large: "The request is too large.",
  unsupported_media_type: "This service requires JSON.",
  service_unavailable:
    "The service is temporarily unavailable. Please try again.",
  upstream_error: "We could not complete your request. Please try again.",
  timeout: "The service took too long to respond. Please try again.",
};
export function failure(
  code: ErrorCode,
  requestId: string,
  fields?: Record<string, string[]>,
): Failure {
  return {
    error: {
      code,
      message: messages[code],
      requestId,
      ...(fields ? { fields } : {}),
    },
  };
}
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export function isMeta(value: unknown): value is Meta {
  return (
    isRecord(value) &&
    value.apiVersion === API_VERSION &&
    value.providerMode === "simulated" &&
    typeof value.requestId === "string" &&
    /^[A-Za-z0-9_-]{1,80}$/.test(value.requestId)
  );
}
export function validFields(value: unknown): value is Record<string, string[]> {
  return (
    isRecord(value) &&
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(
      ([key, errors]) =>
        /^[A-Za-z0-9_.-]{1,100}$/.test(key) &&
        Array.isArray(errors) &&
        errors.length <= 10 &&
        errors.every((e) => typeof e === "string" && e.length <= 500),
    )
  );
}
export function isFailure(value: unknown): value is Failure {
  if (!isRecord(value) || !isRecord(value.error)) return false;
  const e = value.error;
  return (
    (e.fields === undefined || validFields(e.fields)) &&
    typeof e.code === "string" &&
    Object.hasOwn(messages, e.code) &&
    typeof e.message === "string" &&
    typeof e.requestId === "string" &&
    e.requestId.length <= 80
  );
}
export function isPublicData(path: string, value: unknown): boolean {
  if(path === "inquiries" || path === "newsletter")return validInquiryData(path,value);
  if (path === "guest-access" || path.startsWith("bookings/")) return validBookingData(path,value);
  if (path === "payment-tokens" || path === "checkouts" || path.startsWith("checkouts/")) return validCheckoutData(path,value);
  if (path.startsWith("umrah/")) return validUmrahData(path,value);
  if (path.startsWith("hotels/")) return validHotelData(path,value);
  if (path.startsWith("flights/")) return validFlightData(path,value);
  if (!isRecord(value)) return false;
  if (path === "health")
    return (
      Object.keys(value).length === 3 &&
      value.status === "ok" &&
      value.database === "sqlite" &&
      value.service === "cheaperfly-admin"
    );
  if (path !== "configuration") return false;
  return (
    Object.keys(value).length === 4 &&
    ["bootstrap", "published"].includes(String(value.source)) &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) > 0 &&
    isWebsiteContent(value.content) &&
    isWebsiteFeatures(value.features) &&
    isRecord(value.features) &&
    Object.keys(value.features).length === featureKeys.length &&
    featureKeys.every(
      (k) =>
        typeof (value.features as Record<string, unknown>)[k] === "boolean",
    )
  );
}
export class WireError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(messages[code]);
  }
}
export async function readJson(input: Request | Response): Promise<unknown> {
  if (Number(input.headers.get("content-length") ?? 0) > MAX_JSON_BYTES)
    throw new WireError("payload_too_large", 413);
  if (
    !input.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    throw new WireError("unsupported_media_type", 415);
  const reader = input.body?.getReader();
  if (!reader) throw new WireError("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    length += result.value.length;
    if (length > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new WireError("payload_too_large", 413);
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new WireError("invalid_request", 400);
  }
}
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${request.headers.get("host") ?? url.host}`;
}
export function checkOrigin(request: Request) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== requestOrigin(request)
  )
    throw new WireError("forbidden", 403);
}
export const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};

// Planned customer/provider requests. Validation and handlers activate in their checklist steps.
export type LoginInput = { email: string; password: string; remember?: boolean };
export type RegistrationInput = LoginInput & { firstName: string; lastName: string; countryCode: string; mobile: string; marketing: boolean; terms: true };
export type VerificationInput = { challengeId: string; code: string };
export type PasswordResetInput = { challengeId: string; token: string; password: string };
export type ProfilePatch = Partial<Omit<import("./account").AccountProfile, "address">> & { address?: Partial<import("./account").AccountProfile["address"]> };
export type PreferencesPatch = Partial<import("./account").AccountPreferences>;
export type FlightSearchInput = { trip: "oneway" | "return" | "multicity"; legs: { from: string; to: string; date: string }[]; pax: { adults: number; children: number; infants: number }; cabin: "economy" | "premium_economy" | "business" | "first" };
export type HotelSearchInput = { destination: string; checkIn: string; checkOut: string; occupancy: { rooms: number; adults: number; children: number; childAges: number[] } };
export type QuoteSelection = { searchId: string; itemId: string; optionId: string; currency: Currency; revision?: number };
export type ServiceRequestInput = { bookingReference: string; kind: "change" | "cancellation" | "refund"; travellerIds: string[]; reason: string; explanation: string; preferredDate?: string };
export const customerSessionPolicy = { cookie: CUSTOMER_COOKIE, path: "/", httpOnly: true, sameSite: "Lax", secureOnHttps: true, lifetimeSeconds: 28800, databaseNamespace: "customer_sessions" } as const;
export const contractSchemas = {
 Money: { type:"object",additionalProperties:false,required:["currency","minorUnits"],properties:{currency:{enum:["GBP","USD","EUR","AED","SAR"]},minorUnits:{type:"integer",minimum:0,maximum:Number.MAX_SAFE_INTEGER}} },
 Pagination: { type:"object",additionalProperties:false,required:["page","perPage","total","totalPages"],properties:{page:{type:"integer",minimum:1},perPage:{type:"integer",minimum:1,maximum:100},total:{type:"integer",minimum:0},totalPages:{type:"integer",minimum:0}} },
 Health: {type:"object",additionalProperties:false,required:["status","database","service"],properties:{status:{const:"ok"},database:{const:"sqlite"},service:{const:"cheaperfly-admin"}}},
} as const;

/** Simulated delivery is explicitly gated on the backend; production never includes demo secrets. */
export type ChallengeReceipt = { accepted: true; challengeId: string; demo?: { challengeId: string; code?: string; token?: string } };

export * from "./account";

export * from "./configuration";

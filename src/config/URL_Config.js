import "server-only";

/**
 * Single source of truth for every backend (cheaperfly-admin-next) API URL the website calls.
 *
 * Server-only: the backend origin must never reach browser code. Browsers call the same-origin
 * adapters `/api/public/v1/<path>` and `/api/customer/v1/<path>`; src/server/api-transport.ts
 * forwards each one to `BACKEND_URL + API_PREFIX/<scope>/<path>` using the helpers below.
 *
 * The backend origin comes only from CHEAPERFLY_BACKEND_URL in .env (.env.local overrides it).
 */

/** Backend origin from the env file, e.g. `http://localhost:3001`. */
export const BACKEND_URL = process.env.CHEAPERFLY_BACKEND_URL;

/** Versioned website API prefix on the backend. */
export const API_PREFIX = "/api/website/v1";

/** Same-origin browser adapter prefix for a scope, e.g. `/api/public/v1`. */
export const browserApiPrefix = (scope) => `/api/${scope}/v1`;

/**
 * Backend origin from CHEAPERFLY_BACKEND_URL, or undefined when the env file does not set it.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | undefined}
 */
export function backendBaseUrl(env = process.env) {
  return env.CHEAPERFLY_BACKEND_URL;
}

/**
 * Full backend URL for one call, e.g. `http://localhost:3001/api/website/v1/public/flights/search`.
 * @param {string} origin validated backend origin
 * @param {"public" | "customer"} scope
 * @param {string} path concrete path such as `bookings/CF-123456`
 * @param {string} [query] already-encoded search string including `?`, or ""
 */
export const backendApiUrl = (origin, scope, path, query = "") =>
  `${origin}${API_PREFIX}/${scope}/${path}${query}`;

/**
 * Every backend endpoint the website uses, by scope. `:name` segments are path parameters.
 * Must match `endpoints` in @cheaperfly/api-contracts (enforced by tests/integration/url-config.test.ts).
 */
export const API_ENDPOINTS = {
  public: {
    bookingsById: { path: "bookings/:id", methods: ["GET"] },
    bookingsByIdContact: { path: "bookings/:id/contact", methods: ["PATCH"] },
    bookingsByIdDocumentsByKind: { path: "bookings/:id/documents/:kind", methods: ["GET"] },
    bookingsByIdStay: { path: "bookings/:id/stay", methods: ["PATCH"] },
    checkouts: { path: "checkouts", methods: ["POST"] },
    checkoutsById: { path: "checkouts/:id", methods: ["GET"] },
    checkoutsByIdResume: { path: "checkouts/:id/resume", methods: ["POST"] },
    checkoutsConfirmationByReference: { path: "checkouts/confirmation/:reference", methods: ["GET"] },
    configuration: { path: "configuration", methods: ["GET"] },
    flightsAirports: { path: "flights/airports", methods: ["POST"] },
    flightsPreviews: { path: "flights/previews", methods: ["POST"] },
    flightsQuotes: { path: "flights/quotes", methods: ["POST"] },
    flightsRevalidate: { path: "flights/revalidate", methods: ["POST"] },
    flightsSearch: { path: "flights/search", methods: ["POST"] },
    flightsSeatMaps: { path: "flights/seat-maps", methods: ["POST"] },
    guestAccess: { path: "guest-access", methods: ["POST"] },
    health: { path: "health", methods: ["GET"] },
    hotelsById: { path: "hotels/:id", methods: ["GET"] },
    hotelsAvailability: { path: "hotels/availability", methods: ["POST"] },
    hotelsPreviews: { path: "hotels/previews", methods: ["POST"] },
    hotelsQuotes: { path: "hotels/quotes", methods: ["POST"] },
    hotelsSearch: { path: "hotels/search", methods: ["POST"] },
    inquiries: { path: "inquiries", methods: ["POST"] },
    newsletter: { path: "newsletter", methods: ["POST"] },
    paymentTokens: { path: "payment-tokens", methods: ["POST"] },
    requests: { path: "requests", methods: ["POST"] },
    support: { path: "support", methods: ["POST"] },
    supportById: { path: "support/:id", methods: ["GET"] },
    supportByIdMessages: { path: "support/:id/messages", methods: ["POST"] },
    umrahConfigurations: { path: "umrah/configurations", methods: ["POST"] },
    umrahPackages: { path: "umrah/packages", methods: ["GET"] },
    umrahPackagesById: { path: "umrah/packages/:id", methods: ["GET"] },
    umrahQuotes: { path: "umrah/quotes", methods: ["POST"] },
    umrahSearch: { path: "umrah/search", methods: ["POST"] },
    umrahTravellers: { path: "umrah/travellers", methods: ["POST"] },
  },
  customer: {
    bookings: { path: "bookings", methods: ["GET"] },
    bookingsById: { path: "bookings/:id", methods: ["GET"] },
    bookingsByIdContact: { path: "bookings/:id/contact", methods: ["PATCH"] },
    bookingsByIdDocumentsByKind: { path: "bookings/:id/documents/:kind", methods: ["GET"] },
    bookingsByIdExtras: { path: "bookings/:id/extras", methods: ["PATCH"] },
    bookingsByIdStay: { path: "bookings/:id/stay", methods: ["PATCH"] },
    checkouts: { path: "checkouts", methods: ["POST"] },
    checkoutsById: { path: "checkouts/:id", methods: ["GET"] },
    checkoutsByIdResume: { path: "checkouts/:id/resume", methods: ["POST"] },
    checkoutsConfirmationByReference: { path: "checkouts/confirmation/:reference", methods: ["GET"] },
    notifications: { path: "notifications", methods: ["GET"] },
    notificationsById: { path: "notifications/:id", methods: ["PATCH", "DELETE"] },
    notificationsReadAll: { path: "notifications/read-all", methods: ["POST"] },
    password: { path: "password", methods: ["POST"] },
    passwordReset: { path: "password/reset", methods: ["POST"] },
    passwordResetRequest: { path: "password/reset-request", methods: ["POST"] },
    preferences: { path: "preferences", methods: ["GET", "PATCH"] },
    profile: { path: "profile", methods: ["GET", "PATCH"] },
    registration: { path: "registration", methods: ["POST"] },
    requests: { path: "requests", methods: ["GET", "POST"] },
    session: { path: "session", methods: ["GET", "POST", "DELETE"] },
    support: { path: "support", methods: ["GET", "POST"] },
    supportById: { path: "support/:id", methods: ["GET"] },
    supportByIdMessages: { path: "support/:id/messages", methods: ["POST"] },
    travellers: { path: "travellers", methods: ["GET", "POST"] },
    travellersById: { path: "travellers/:id", methods: ["PATCH", "DELETE"] },
    verification: { path: "verification", methods: ["POST"] },
    verificationResend: { path: "verification/resend", methods: ["POST"] },
  },
};

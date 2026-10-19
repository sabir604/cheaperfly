import type { Currency, Quote } from "./index";
import type { FlightPrice } from "./flights";
import type {
  UmrahPackage,
  UmrahConfig,
  UmrahPricingInput,
} from "./umrah-types";
export type UmrahConfiguration = {
  pkg: UmrahPackage;
  config: UmrahConfig;
  input: UmrahPricingInput;
  breakdown: FlightPrice;
  adultPrice: number;
  departurePrices: Record<string, number>;
};
export type UmrahQuote = Quote & UmrahConfiguration & { product: "umrah" };
export type UmrahDocuments = {
  accepted: true;
  quoteId: string;
  visaStatus: "not_submitted";
  providerMode: "simulated";
  travellers: {
    id: string;
    type: "adult" | "child" | "infant";
    passportLastThree: string;
    passportCountry: string;
    passportExpiry: string;
    status: "provided";
  }[];
};
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => typeof v === "string" && v.length <= 5000;
const num = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  Math.abs(v) <= Number.MAX_SAFE_INTEGER;
function safe(v: unknown, depth = 0): boolean {
  if (depth > 22) return false;
  if (v === null || typeof v === "boolean" || str(v) || num(v)) return true;
  if (Array.isArray(v))
    return v.length <= 2000 && v.every((x) => safe(x, depth + 1));
  return (
    obj(v) &&
    Object.keys(v).length <= 120 &&
    Object.entries(v).every(
      ([k, x]) =>
        ![
          "token",
          "guestToken",
          "password",
          "customerId",
          "passportNo",
          "__proto__",
          "constructor",
        ].includes(k) && safe(x, depth + 1),
    )
  );
}
const pkg = (v: unknown) =>
  obj(v) &&
  str(v.id) &&
  str(v.name) &&
  Array.isArray(v.departures) &&
  v.departures.every(
    (d) => obj(d) && str(d.date) && num(d.seatsLeft) && num(d.priceFactor),
  ) &&
  Array.isArray(v.itinerary) &&
  obj(v.options) &&
  Array.isArray(v.options.hotels) &&
  Array.isArray(v.options.flights) &&
  Array.isArray(v.options.transfers) &&
  Array.isArray(v.options.extras) &&
  obj(v.fromPrices) &&
  ["GBP", "USD", "EUR", "AED", "SAR"].every(
    (c) => obj(v.fromPrices) && obj(v.fromPrices[c]),
  );
export function validUmrahData(path: string, v: unknown): boolean {
  if (!safe(v)) return false;
  if (path === "umrah/packages" || path === "umrah/search")
    return Array.isArray(v) && v.every(pkg);
  if (!obj(v)) return false;
  if (path === "umrah/travellers")
    return (
      v.accepted === true &&
      str(v.quoteId) &&
      v.visaStatus === "not_submitted" &&
      v.providerMode === "simulated" &&
      Array.isArray(v.travellers) &&
      v.travellers.every(
        (t) =>
          obj(t) &&
          str(t.id) &&
          str(t.passportLastThree) &&
          t.status === "provided",
      )
    );
  if (path === "umrah/configurations" || path === "umrah/quotes") {
    const valid =
      pkg(v.pkg) &&
      obj(v.config) &&
      obj(v.input) &&
      obj(v.breakdown) &&
      num(v.breakdown.total) &&
      Array.isArray(v.breakdown.lines) &&
      num(v.adultPrice) &&
      obj(v.departurePrices);
    return (
      !!valid &&
      (path === "umrah/configurations" ||
        (v.product === "umrah" &&
          str(v.id) &&
          str(v.expiresAt) &&
          Number.isSafeInteger(v.revision) &&
          obj(v.total) &&
          num(v.total.minorUnits) &&
          obj(v.accountingTotal) &&
          num(v.accountingTotal.minorUnits) &&
          obj(v.fx) &&
          str(v.fx.rate)))
    );
  }
  return /^umrah\/packages\/[A-Za-z0-9_-]+$/.test(path) && pkg(v);
}

import type { Currency } from "./index";
import countries from "./account-countries.json";
export const accountCountries = countries;
export type AccountProfile = {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  email: string;
  countryCode: string;
  mobile: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  passportNo: string;
  passportCountry: string;
  passportExpiry: string;
};
export type AccountPreferences = {
  currency: Currency;
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  marketing: boolean;
  defaultMeal: string;
  seatPreference: string;
};
export const accountPreferenceDefaults: AccountPreferences = {
  currency: "GBP",
  language: "English (UK)",
  emailNotifications: true,
  smsNotifications: false,
  whatsappNotifications: true,
  marketing: false,
  defaultMeal: "standard",
  seatPreference: "any",
};
export type CustomerTraveller = {
  id: string;
  type: "adult" | "child" | "infant";
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
  frequentFlyer?: string;
  relationship?: string;
};
export type CustomerNotification = {
  id: string;
  kind:
    "booking" | "payment" | "ticket" | "trip" | "refund" | "support" | "promo";
  title: string;
  body: string;
  href?: string;
  at: string;
  read: boolean;
};
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
function fields(
  v: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): v is Record<string, unknown> {
  return (
    record(v) &&
    required.every((k) => typeof v[k] === "string") &&
    optional.every((k) => v[k] === undefined || typeof v[k] === "string") &&
    Object.keys(v).every((k) => required.includes(k) || optional.includes(k))
  );
}
export function isAccountProfile(v: unknown): v is AccountProfile {
  if (!record(v) || !record(v.address)) return false;
  const { address, ...rest } = v;
  return (
    fields(rest, [
      "title",
      "firstName",
      "lastName",
      "dob",
      "gender",
      "nationality",
      "email",
      "countryCode",
      "mobile",
      "passportNo",
      "passportCountry",
      "passportExpiry",
    ]) && fields(address, ["line1", "city", "postcode", "country"], ["line2"])
  );
}
export function isAccountPreferences(v: unknown): v is AccountPreferences {
  return (
    record(v) &&
    Object.keys(v).length === 8 &&
    ["GBP", "USD", "EUR", "AED", "SAR"].includes(String(v.currency)) &&
    ["language", "defaultMeal", "seatPreference"].every(
      (k) => typeof v[k] === "string",
    ) &&
    [
      "emailNotifications",
      "smsNotifications",
      "whatsappNotifications",
      "marketing",
    ].every((k) => typeof v[k] === "boolean")
  );
}
export function isCustomerTraveller(v: unknown): v is CustomerTraveller {
  return (
    fields(
      v,
      [
        "id",
        "type",
        "title",
        "firstName",
        "lastName",
        "dob",
        "gender",
        "nationality",
        "passportNo",
        "passportCountry",
        "passportExpiry",
      ],
      ["middleName", "frequentFlyer", "relationship"],
    ) && ["adult", "child", "infant"].includes(String(v.type))
  );
}
export function isCustomerNotification(v: unknown): v is CustomerNotification {
  if (!record(v) || typeof v.read !== "boolean") return false;
  const { read, ...rest } = v;
  void read;
  return (
    fields(rest, ["id", "kind", "title", "body", "at"], ["href"]) &&
    [
      "booking",
      "payment",
      "ticket",
      "trip",
      "refund",
      "support",
      "promo",
    ].includes(String(v.kind)) &&
    (!v.href ||
      (typeof v.href === "string" && /^\/(?![/\\])[^\\\r\n]*$/.test(v.href)))
  );
}
export function isPagination(v: unknown): boolean {
  return (
    record(v) &&
    Object.keys(v).length === 4 &&
    ["page", "perPage", "total", "totalPages"].every((k) =>
      Number.isSafeInteger(v[k]),
    ) &&
    Number(v.page) >= 1 &&
    Number(v.perPage) >= 1 &&
    Number(v.perPage) <= 100 &&
    Number(v.total) >= 0 &&
    Number(v.totalPages) === Math.ceil(Number(v.total) / Number(v.perPage))
  );
}
export function validAccountData(
  path: string,
  method: string,
  data: unknown,
): boolean {
  if (path === "profile") return isAccountProfile(data);
  if (path === "preferences") return isAccountPreferences(data);
  if (method === "DELETE" || path === "notifications/read-all")
    return (
      record(data) && Object.keys(data).length === 1 && data.accepted === true
    );
  if (path === "travellers" && method === "GET")
    return Array.isArray(data) && data.every(isCustomerTraveller);
  if (path.startsWith("travellers")) return isCustomerTraveller(data);
  if (path === "notifications")
    return Array.isArray(data) && data.every(isCustomerNotification);
  if (path.startsWith("notifications/")) return isCustomerNotification(data);
  return false;
}
/** Only collection reads accept bounded pagination; all other query parameters fail closed. */
export function accountQuery(
  scope: string,
  path: string,
  method: string,
  search: string,
): string {
  const params = new URLSearchParams(search);
  if (!search) return "";
  if (
    scope !== "customer" ||
    method !== "GET" ||
    !["travellers", "notifications", "bookings", "requests", "support"].includes(path) ||
    [...params.keys()].some((k) => !["page", "perPage"].includes(k))
  )
    throw new Error("Invalid query");
  for (const key of ["page", "perPage"])
    if (
      params.has(key) &&
      (params.getAll(key).length !== 1 ||
        !/^[1-9][0-9]{0,5}$/.test(params.get(key)!) ||
        Number(params.get(key)) > (key === "perPage" ? 100 : 100000))
    )
      throw new Error("Invalid pagination");
  return "?" + params.toString();
}

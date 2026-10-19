import { validBookingData } from "./bookings";
export function validServicingData(path: string, data: unknown): boolean {
  const record = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (path.startsWith("bookings/") && !path.endsWith("/extras"))
    return validBookingData("bookings/ref", data);
  const valid = (v: unknown) =>
    record(v) &&
    typeof v.id === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.status === "string" &&
    (path.startsWith("requests") || path.endsWith("/extras")
      ? Array.isArray(v.timeline) &&
        [
          "submitted",
          "under_review",
          "approved",
          "rejected",
          "processed",
        ].includes(String(v.status))
      : Array.isArray(v.messages) &&
        ["open", "resolved"].includes(String(v.status)));
  return Array.isArray(data) ? data.every(valid) : valid(data);
}

export const NEWSLETTER_POLICY_VERSION = "newsletter-2026-10-19";
export const NEWSLETTER_CONSENT_TEXT =
  "By subscribing, I consent to receive Cheaperfly travel deals by email. I can withdraw consent at any time.";
export type WebsiteInquiry = {
  idempotencyKey: string;
  name: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
  bookingRef?: string;
};
export type InquiryReceipt = {
  accepted: true;
  reference: string;
  providerMode: "simulated";
  emailSent: false;
};
export type NewsletterReceipt = {
  accepted: true;
  providerMode: "simulated";
  emailSent: false;
};
export function validInquiryData(path: string, v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const data = v as Record<string, unknown>;
  return (
    data.accepted === true &&
    data.providerMode === "simulated" &&
    data.emailSent === false &&
    Object.keys(data).length === (path === "inquiries" ? 4 : 3) &&
    (path !== "inquiries" ||
      (typeof data.reference === "string" && /^INQ-\d+$/.test(data.reference)))
  );
}

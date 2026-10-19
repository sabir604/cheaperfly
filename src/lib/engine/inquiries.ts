import { apiRequest } from "@/lib/api/client";
import {
  NEWSLETTER_POLICY_VERSION,
  type WebsiteInquiry,
  type InquiryReceipt,
  type NewsletterReceipt,
} from "@cheaperfly/api-contracts/inquiries";
export async function submitWebsiteInquiry(
  values: Omit<WebsiteInquiry, "idempotencyKey">,
  idempotencyKey: string,
) {
  return (
    await apiRequest<InquiryReceipt>("public", "inquiries", {
      method: "POST",
      body: JSON.stringify({ ...values, idempotencyKey }),
    })
  ).data;
}
export async function subscribeNewsletter(email: string) {
  return (
    await apiRequest<NewsletterReceipt>("public", "newsletter", {
      method: "POST",
      body: JSON.stringify({
        email,
        consent: true,
        policyVersion: NEWSLETTER_POLICY_VERSION,
      }),
    })
  ).data;
}

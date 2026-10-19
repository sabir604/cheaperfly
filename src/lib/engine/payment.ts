/** Legacy local simulation retained for regression fixtures. Production checkout uses the backend checkout service. */
import { newTxnId } from "@/lib/engine/refs";
import { ServiceError, sleep } from "@/lib/engine/service";
import type { CurrencyCode } from "@/lib/engine/currency";
import type { PaymentMethod, PaymentRecord } from "@/lib/types/booking";

/** Test cards shown in the Demo & QA panel. */
export const QA_CARDS = [
  { number: "4242 4242 4242 4242", label: "Succeeds" },
  { number: "4000 0000 0000 0002", label: "Card declined" },
  { number: "4000 0000 0000 9995", label: "Insufficient funds" },
] as const;

export type CardOutcome = "ok" | "declined" | "insufficient";

export function detectCardBrand(number: string): string {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  if (/^(6011|65)/.test(n)) return "Discover";
  return "Card";
}

/** Luhn checksum on 12–19 digits. */
export function luhnValid(number: string): boolean {
  const n = number.replace(/\s/g, "");
  if (!/^\d{12,19}$/.test(n)) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let digit = Number(n[i]);
    if (double && (digit *= 2) > 9) digit -= 9;
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function outcomeForCard(number: string): CardOutcome {
  const n = number.replace(/\s/g, "");
  if (n === "4000000000000002") return "declined";
  if (n === "4000000000009995") return "insufficient";
  return "ok";
}

export interface ChargeRequest {
  method: PaymentMethod;
  amount: number;
  currency: CurrencyCode;
  brand?: string;
  last4?: string;
  cardholder?: string;
  outcome?: CardOutcome;
  /** "Force the next payment to fail" from the QA panel. */
  forceFailure?: boolean;
  /** Progress callback for the processing screen: 0 authorising, 1 confirming with supplier, 2 issuing. */
  onStage?: (stage: 0 | 1 | 2) => void;
}

export const paymentService = {
  async charge(req: ChargeRequest): Promise<PaymentRecord & { amount: number; currency: CurrencyCode }> {
    const stage = async (s: 0 | 1 | 2, ms: number) => {
      req.onStage?.(s);
      await sleep(ms);
    };
    await stage(0, 1300);
    if (req.forceFailure || req.outcome === "declined")
      throw new ServiceError("card_declined", "Your bank declined the payment. No money has been taken. Try another card or contact your bank.");
    if (req.outcome === "insufficient")
      throw new ServiceError("insufficient_funds", "The card has insufficient funds. No money has been taken. Please try a different payment method.");
    await stage(1, 1200);
    await stage(2, 1200);
    return {
      method: req.method,
      brand: req.brand ?? (req.method === "apple_pay" ? "Apple Pay" : req.method === "google_pay" ? "Google Pay" : "Card"),
      last4: req.last4 ?? (req.method === "apple_pay" ? "4242" : "1881"),
      cardholder: req.cardholder,
      transactionId: newTxnId(),
      status: "captured",
      amount: req.amount,
      currency: req.currency,
      paidAt: new Date().toISOString(),
    };
  },
};

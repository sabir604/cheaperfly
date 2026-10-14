import currencies from "@/data/json/CURRENCIES.json";
import fxRates from "@/data/json/FX_RATES.json";

export type CurrencyCode = "GBP" | "USD" | "EUR" | "AED" | "SAR";

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

export const CURRENCIES = currencies as Currency[];
/** Indicative rates from GBP. All prices are generated in GBP and converted for display. */
export const FX_RATES = fxRates as Record<CurrencyCode, number>;

const formatters = new Map<string, Intl.NumberFormat>();

/** "£1,302" / "$1,654" / "AED 6,067". GBP, USD and EUR use symbols; AED and SAR use the code. */
export function formatCurrency(amount: number, currency: CurrencyCode, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 0;
  const key = `${currency}-${decimals}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: currency === "GBP" || currency === "USD" || currency === "EUR" ? "narrowSymbol" : "code",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(key, f);
  }
  return f.format(amount).replace(/ /g, " ");
}

/** Converts a GBP amount to `currency`, rounded to whole units. */
export function toCurrency(gbp: number, currency: CurrencyCode): number {
  return Math.round(gbp * FX_RATES[currency]);
}

"use client";

import { useMemo } from "react";
import { formatCurrency, toCurrency, type CurrencyCode } from "@/lib/engine/currency";
import { useUiStore } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

export function Money({ amount, currency, decimals = 0, className }: { amount: number; currency: CurrencyCode; decimals?: number; className?: string }) {
  return <span className={cn("tnum", className)}>{formatCurrency(amount, currency, { decimals })}</span>;
}

/** Display-currency helpers. `fmtGbp` converts a GBP amount first. */
export function useCurrency() {
  const currency = useUiStore((s) => s.currency);
  return useMemo(
    () => ({
      currency,
      gbp: (amount: number) => toCurrency(amount, currency),
      fmt: (amount: number, decimals = 0) => formatCurrency(amount, currency, { decimals }),
      fmtGbp: (amount: number, decimals = 0) => formatCurrency(toCurrency(amount, currency), currency, { decimals }),
    }),
    [currency],
  );
}

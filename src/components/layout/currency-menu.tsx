"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { CURRENCIES } from "@/lib/engine/currency";
import { useSessionStore, useUiStore } from "@/lib/stores/session";
import { savePreferences } from "@/lib/engine/account";
import { cn } from "@/lib/utils";

export function CurrencyMenu({ className, variant = "header" }: { className?: string; variant?: "header" | "footer" }) {
  const currency = useUiStore((s) => s.currency);
  const setCurrency = useUiStore((s) => s.setCurrency);
  const user = useSessionStore((s) => s.user);
  const current = CURRENCIES.find((c) => c.code === currency)!;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors",
            variant === "header" ? "text-slate-700 hover:bg-slate-100" : "border border-white/20 text-white hover:bg-white/10",
            className,
          )}
          aria-label={`Currency: ${current.name}`}
        >
          <Globe className="h-4 w-4" aria-hidden />
          <span className="tnum">
            {current.code} <span className="font-normal opacity-70">{current.symbol}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="end">
        <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Display currency</p>
        {CURRENCIES.map((c) => (
          <PopoverClose asChild key={c.code}>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (user) await savePreferences({ currency:c.code }); else setCurrency(c.code);
                  toast.info(`Prices now shown in ${c.code}`);
                } catch(error) { toast.error(error instanceof Error ? error.message : "Please try again."); }
              }}
              className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-50", c.code === currency && "bg-brand-50")}
            >
              <span className="w-10 font-bold text-navy-900">{c.code}</span>
              <span className="flex-1 text-slate-600">{c.name}</span>
              {c.code === currency && <Check className="h-4 w-4 text-brand-600" aria-hidden />}
            </button>
          </PopoverClose>
        ))}
        <p className="px-2.5 pb-2 pt-2 text-xs text-slate-500">Rates are indicative. You’re charged in the currency shown at checkout.</p>
      </PopoverContent>
    </Popover>
  );
}

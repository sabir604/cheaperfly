"use client";

import { create } from "zustand";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "error";

let nextId = 0;

const useToasts = create<{
  items: { id: number; tone: Tone; message: string }[];
  push: (tone: Tone, message: string) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  items: [],
  push: (tone, message) => {
    const id = ++nextId;
    set((s) => ({ items: [...s.items, { id, tone, message }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToasts.getState().push("success", message),
  info: (message: string) => useToasts.getState().push("info", message),
  error: (message: string) => useToasts.getState().push("error", message),
};

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex max-w-md animate-pop items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-pop",
            t.tone === "error" ? "bg-red-600" : "bg-navy-900",
          )}
        >
          {t.tone === "success" && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />}
          {t.tone === "info" && <Info className="h-5 w-5 shrink-0 text-brand-300" aria-hidden />}
          {t.tone === "error" && <XCircle className="h-5 w-5 shrink-0" aria-hidden />}
          <span>{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} className="ml-2 text-white/70 hover:text-white" aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

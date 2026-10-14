import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/form";

export function KeyValue({ items, cols = 2 }: { items: { label: string; value: ReactNode }[]; cols?: 2 | 3 | 4 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-3 ${cols === 4 ? "sm:grid-cols-4" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-navy-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Review card with an optional "Edit" link back to the step that owns the data. */
export function ReviewSection({ title, editHref, editLabel = "Edit", children, id }: { title: ReactNode; editHref?: string; editLabel?: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <h2 id={id} className="text-[16px] font-bold text-navy-900">
          {title}
        </h2>
        {editHref && (
          <Link href={editHref} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-bold text-brand-600 hover:bg-brand-50">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> {editLabel}
          </Link>
        )}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function TermsBox({ checked, onChange, error, children }: { checked: boolean; onChange: (v: boolean) => void; error: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-xl border bg-white p-5 sm:p-6 ${error ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"}`}>
      <Checkbox
        id="terms"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={error || undefined}
        aria-describedby={error ? "terms-error" : undefined}
        label={<span className="text-sm font-medium leading-relaxed text-slate-700">{children}</span>}
      />
      {error && (
        <p id="terms-error" role="alert" className="mt-2 text-xs font-semibold text-red-600">
          Please accept the terms to continue to payment.
        </p>
      )}
    </div>
  );
}

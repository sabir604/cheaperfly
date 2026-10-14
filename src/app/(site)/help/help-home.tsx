"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, SearchX } from "lucide-react";
import { HelpIcon } from "@/components/help/help-icon";
import { SupportContactOptions, openWhatsAppCase } from "@/components/support/support";
import { Accordion } from "@/components/ui/disclosure";
import { StateView } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { HELP_TOPICS, POPULAR_QUESTIONS, searchHelp } from "@/data/help";
import { useSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const QUICK_SEARCHES = ["refund status", "add baggage", "umrah visa", "change dates", "declined payment"];

export function HelpHome() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchHelp(query), [query]);
  const extraFaqs = useSiteConfig().faqs.filter((f) => f.visible);
  const searching = query.trim().length >= 2;

  return (
    <div>
      <section className="bg-navy-900 py-14 text-white">
        <div className="container-page">
          <h1 className="!text-white text-[34px] font-extrabold sm:text-[42px]" style={{ letterSpacing: "-0.02em" }}>
            How can we help?
          </h1>
          <p className="mt-2 max-w-xl text-[16px] text-slate-300">Search our help centre or browse by topic. Still stuck? Our team is available 24/7.</p>
          <div className="relative mt-7 max-w-2xl">
            <label htmlFor="help-q" className="sr-only">
              Search the help centre
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              id="help-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. baggage, refund, Umrah visa"
              className="h-14 rounded-xl pl-12 text-[16px]"
              autoComplete="off"
            />
          </div>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {QUICK_SEARCHES.map((q) => (
              <li key={q}>
                <button type="button" onClick={() => setQuery(q)} className="rounded-full border border-white/20 px-3 py-1 text-slate-200 hover:bg-white/10">
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page py-12">
        {searching ? (
          <section aria-live="polite" aria-labelledby="sr-h">
            <h2 id="sr-h" className="mb-4 text-xl font-bold">
              {results.length} result{results.length === 1 ? "" : "s"} for “{query.trim()}”
            </h2>
            {results.length === 0 ? (
              <StateView
                compact
                icon={<SearchX className="h-7 w-7" />}
                title="No matching articles"
                description="Try different words, browse a topic below, or message our team."
                actions={
                  <Link href="/help/contact" className="font-bold text-brand-600 hover:underline">
                    Contact support
                  </Link>
                }
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-6">
                {results.map((r) => (
                  <Accordion key={r.article.q} title={r.article.q} meta={<span className="hidden text-xs font-semibold text-slate-400 sm:block">{r.topic.title}</span>}>
                    {r.article.a}
                    <Link href={`/help/${r.topic.slug}`} className="mt-2 block text-sm font-bold text-brand-600 hover:underline">
                      More in {r.topic.title}
                    </Link>
                  </Accordion>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <h2 className="mb-5 text-xl font-bold">Browse by topic</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {HELP_TOPICS.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/help/${t.slug}`}
                    className="group flex h-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-card"
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                        t.slug === "umrah" ? "bg-umrah-50 text-umrah-800" : "bg-brand-50 text-brand-600",
                      )}
                    >
                      <HelpIcon icon={t.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-[16px] font-bold text-navy-900">
                        {t.title}{" "}
                        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{t.blurb}</span>
                      <span className="mt-1.5 block text-xs text-slate-400">{t.articles.length} articles</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1fr]">
              <section aria-labelledby="pop-h">
                <h2 id="pop-h" className="mb-3 text-xl font-bold">
                  Popular questions
                </h2>
                <div className="rounded-xl border border-slate-200 bg-white px-6">
                  {POPULAR_QUESTIONS.map((a) => (
                    <Accordion key={a.q} title={a.q}>
                      {a.a}
                    </Accordion>
                  ))}
                  {extraFaqs.map((f) => (
                    <Accordion key={f.id} title={f.q}>
                      {f.a}
                    </Accordion>
                  ))}
                </div>
              </section>
              <section aria-labelledby="ct-h">
                <h2 id="ct-h" className="mb-3 text-xl font-bold">
                  Contact us
                </h2>
                <SupportContactOptions stacked onWhatsApp={() => openWhatsAppCase()} />
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-[15px] font-bold">Message support</h3>
                  <p className="mt-1 text-sm text-slate-600">Tell us about your booking and we’ll create a support case.</p>
                  <Link href="/help/contact" className="mt-3 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
                    Open contact form
                  </Link>
                  <Link
                    href="/manage-booking"
                    className="ml-2 inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-navy-900 hover:bg-slate-50"
                  >
                    Manage a booking
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

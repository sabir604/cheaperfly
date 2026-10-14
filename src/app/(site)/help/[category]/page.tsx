import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpIcon } from "@/components/help/help-icon";
import { ButtonLink } from "@/components/ui/button";
import { Accordion } from "@/components/ui/disclosure";
import { HELP_TOPICS, getHelpTopic } from "@/data/help";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return HELP_TOPICS.map((t) => ({ category: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/help/[category]">): Promise<Metadata> {
  const { category } = await params;
  const topic = getHelpTopic(category);
  return { title: topic ? `${topic.title} help` : "Help" };
}

export default async function HelpTopicPage({ params }: PageProps<"/help/[category]">) {
  const { category } = await params;
  const topic = getHelpTopic(category);
  if (!topic) notFound();
  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-500">
        <Link className="hover:text-brand-600" href="/help">
          Help centre
        </Link>{" "}
        / <span className="text-slate-700">{topic.title}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Help topics">
          <ul className="space-y-1">
            {HELP_TOPICS.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/help/${t.slug}`}
                  aria-current={t.slug === topic.slug ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold",
                    t.slug === topic.slug ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <HelpIcon icon={t.icon} className="h-4 w-4" /> {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div>
          <div className="mb-6 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <HelpIcon icon={topic.icon} className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-[30px] font-extrabold">{topic.title}</h1>
              <p className="text-slate-600">{topic.blurb}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-6">
            {topic.articles.map((a, i) => (
              <Accordion key={a.q} title={a.q} defaultOpen={i === 0}>
                {a.a}
              </Accordion>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-900 p-6 text-white">
            <div>
              <p className="text-lg font-bold">Didn’t find your answer?</p>
              <p className="text-sm text-slate-300">Message our team — we reply 24/7.</p>
            </div>
            <div className="flex gap-2">
              <ButtonLink href={`/help/contact?topic=${encodeURIComponent(topic.title)}`} variant="white">
                Contact support
              </ButtonLink>
              <ButtonLink href="/manage-booking" variant="ghost" className="text-white hover:bg-white/10">
                Manage booking
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

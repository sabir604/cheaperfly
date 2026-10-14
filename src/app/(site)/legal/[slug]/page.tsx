import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, getLegalDoc } from "@/data/legal";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getLegalDoc(slug)?.title };
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const doc = getLegalDoc(slug);
  if (!doc) notFound();
  return (
    <div className="container-page py-12">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Legal documents" className="text-sm">
          <ul className="space-y-1">
            {LEGAL_DOCS.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/legal/${d.slug}`}
                  aria-current={d.slug === slug ? "page" : undefined}
                  className={cn("block rounded-lg px-3 py-2 font-semibold", d.slug === slug ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100")}
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="text-[32px] font-extrabold">{doc.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Last updated {doc.updated}</p>
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.heading} className="mt-8">
              <h2 className="text-xl font-bold">{s.heading}</h2>
              {s.body.map((b, i) => (
                <p key={i} className="mt-2 text-[15px] leading-relaxed text-slate-700">
                  {b.text}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Photo } from "@/components/photo";

export const metadata: Metadata = { title: "Image credits" };

/** Wikimedia Commons images require attribution (CC BY / CC BY-SA). Keep this page. */
const WIKIMEDIA_CREDITS = [
  {
    image: "/images/jeddah-mosque.jpg",
    title: "Floating Mosque, Jeddah",
    author: "Sammy Six",
    licence: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Floating_Mosque,_Jeddah_(6573494757).jpg",
  },
  {
    image: "/images/jeddah-corniche.jpg",
    title: "Jeddah",
    author: "xiquinhosilva",
    licence: "CC BY 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Jeddah_-_55362179623.jpg",
  },
  {
    image: "/images/jeddah-albalad.jpg",
    title: "Old Jeddah",
    author: "xiquinhosilva",
    licence: "CC BY 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Old_Jeddah_-_55362214124.jpg",
  },
  {
    image: "/images/jeddah-old.jpg",
    title: "Old Jeddah (Makkah Gate)",
    author: "xiquinhosilva",
    licence: "CC BY 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Old_Jeddah_-_55362181118.jpg",
  },
  {
    image: "/images/madinah-night.jpg",
    title: "Alharam in Madinah at night",
    author: "Osmanzain",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Alharam_in_madinah_at_night.jpg",
  },
];

export default function CreditsPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-[32px] font-extrabold">Image credits</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        Photography in this prototype comes from{" "}
        <a className="font-bold text-brand-600 underline" href="https://unsplash.com" target="_blank" rel="noreferrer">
          Unsplash
        </a>{" "}
        (used under the Unsplash licence) and from Wikimedia Commons where credited below. Thank you to all the photographers.
      </p>
      <h2 className="mb-3 mt-8 text-lg font-bold">Wikimedia Commons</h2>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {WIKIMEDIA_CREDITS.map((c) => (
          <li key={c.image} className="flex items-center gap-4 p-4">
            <Photo src={c.image} className="relative h-14 w-20 shrink-0 rounded-md" sizes="80px" />
            <div className="min-w-0 text-sm">
              <p className="font-bold text-navy-900">{c.title}</p>
              <p className="text-slate-600">
                by {c.author} · {c.licence} ·{" "}
                <a href={c.source} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 underline">
                  source
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

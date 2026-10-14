import legal from "./json/LEGAL.json";

export interface LegalDoc {
  slug: string;
  title: string;
  /** e.g. "1 September 2026" */
  updated: string;
  /** Shown in the amber "this is a prototype" callout. */
  intro: string;
  sections: { heading: string; body: { type: "p" | "li"; text: string }[] }[];
}

/** Sample legal copy from the prototype. Replace with the client's real policies before launch. */
export const LEGAL_DOCS = legal as LegalDoc[];

export const getLegalDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);

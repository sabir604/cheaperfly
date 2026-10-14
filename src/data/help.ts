import topics from "./json/HELP_TOPICS.json";

export type HelpIcon = "plane" | "hotel" | "moon" | "ticket" | "card" | "calendar" | "undo" | "luggage" | "user";

export interface HelpTopic {
  slug: string;
  title: string;
  icon: HelpIcon;
  blurb: string;
  articles: { q: string; a: string }[];
}

/** 9 help topics, 40 articles, recovered verbatim from the original help centre. */
export const HELP_TOPICS = topics as HelpTopic[];

export const getHelpTopic = (slug: string) => HELP_TOPICS.find((t) => t.slug === slug);

/** "Popular questions" on the help home: refunds#0, changes#0, umrah#0, payments#1, bookings#0. */
export const POPULAR_QUESTIONS = [HELP_TOPICS[6].articles[0], HELP_TOPICS[5].articles[0], HELP_TOPICS[2].articles[0], HELP_TOPICS[4].articles[1], HELP_TOPICS[3].articles[0]];

/** Every query word must appear in the question or answer. Needs 2+ characters. */
export function searchHelp(query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  return HELP_TOPICS.flatMap((topic) =>
    topic.articles.filter((a) => words.every((w) => `${a.q} ${a.a}`.toLowerCase().includes(w))).map((article) => ({ topic, article })),
  );
}

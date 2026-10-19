import defaults from "./default-site.json";
import assetMap from "./site-assets.json";
import routes from "./site-routes.json";
export const siteAssets = assetMap;
export type WebsiteContent = Omit<
  typeof defaults,
  "homepage" | "navigation" | "faqs"
> & {
  homepage: Omit<typeof defaults.homepage, "banners" | "offers"> & {
    banners: {
      id: string;
      enabled: boolean;
      tone: "info" | "promo" | "umrah";
      title: string;
      body?: string;
      ctaLabel?: string;
      ctaHref?: string;
    }[];
    offers: {
      id: string;
      enabled: boolean;
      title: string;
      image: string;
      description?: string;
      href?: string;
      badge?: string;
    }[];
  };
  navigation: {
    items: {
      id: string;
      label: string;
      href: string;
      visible: boolean;
      feature?: string;
    }[];
  };
  faqs: {
    id: string;
    q: string;
    a: string;
    visible: boolean;
    category?: string;
  }[];
};
const flags = [
  "flights",
  "hotels",
  "umrah",
  "b2b",
  "customerSignup",
  "promoCodes",
  "whatsappSupport",
  "telephony",
  "aiFeatures",
] as const;
type Test = (value: unknown) => boolean;
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const text: Test = (v) =>
  typeof v === "string" &&
  v.length <= 2000 &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
const label: Test = (v) =>
  text(v) && String(v).trim().length > 0 && String(v).length <= 200;
const bool: Test = (v) => typeof v === "boolean";
const id: Test = (v) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(v);
const choice =
  (values: readonly string[]): Test =>
  (v) =>
    typeof v === "string" && values.includes(v);
const asset: Test = (v) => typeof v === "string" && Object.hasOwn(assetMap, v);
const email: Test = (v) =>
  typeof v === "string" &&
  v.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const date: Test = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
function shape(
  v: unknown,
  required: Record<string, Test>,
  optional: Record<string, Test> = {},
): boolean {
  return (
    record(v) &&
    Object.keys(v).every(
      (k) => Object.hasOwn(required, k) || Object.hasOwn(optional, k),
    ) &&
    Object.entries(required).every(([k, test]) => test(v[k])) &&
    Object.entries(optional).every(
      ([k, test]) => v[k] === undefined || test(v[k]),
    )
  );
}
function list(test: Test, key?: string, max = 50): Test {
  return (v) =>
    Array.isArray(v) &&
    v.length <= max &&
    v.every(test) &&
    (!key ||
      new Set(v.map((item) => (record(item) ? item[key] : item))).size ===
        v.length);
}
export function validSiteTarget(value: unknown, empty = false): boolean {
  if (value === "") return empty;
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^\/(?![/\\])/.test(value) ||
    /[\\\r\n\u0000]/.test(value)
  )
    return false;
  try {
    const raw = decodeURIComponent(value.split(/[?#]/)[0]);
    if (
      raw.split("/").some((part) => part === "." || part === "..") ||
      /[\\\u0000-\u001f]/.test(raw)
    )
      return false;
    const path = decodeURIComponent(
      new URL(value, "https://website.invalid").pathname,
    );
    return routes.some((route) => {
      const expected = route.split("/"),
        actual = path.split("/");
      return (
        expected.length === actual.length &&
        expected.every((part, i) =>
          part.startsWith(":")
            ? /^[A-Za-z0-9_*.-]+$/.test(actual[i])
            : part === actual[i],
        )
      );
    });
  } catch {
    return false;
  }
}
const target: Test = (v) => validSiteTarget(v);
const optionalTarget: Test = (v) => validSiteTarget(v, true);
const social =
  (host: string): Test =>
  (v) => {
    if (v === "") return true;
    if (typeof v !== "string" || v.length > 2048) return false;
    try {
      const u = new URL(v);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        (u.hostname === host || u.hostname === `www.${host}`)
      );
    } catch {
      return false;
    }
  };
const cta = (v: unknown) => record(v) && !!v.ctaLabel === !!v.ctaHref;
export function isWebsiteContent(v: unknown): v is WebsiteContent {
  return shape(v, {
    homepage: (x) =>
      shape(x, {
        hero: (y) =>
          shape(y, {
            eyebrow: text,
            titleLine1: label,
            titleLine2: text,
            subtitle: text,
            ctaLabel: text,
            ctaHref: optionalTarget,
            image: asset,
          }) && cta(y),
        banners: list(
          (y) =>
            shape(
              y,
              {
                id,
                enabled: bool,
                tone: choice(["info", "promo", "umrah"]),
                title: label,
              },
              { body: text, ctaLabel: text, ctaHref: optionalTarget },
            ) && cta(y),
          "id",
          12,
        ),
        featuredDestinations: list(
          (y) => typeof y === "string" && /^[A-Z]{3}\*?$/.test(y),
          undefined,
          20,
        ),
        offers: list(
          (y) =>
            shape(
              y,
              { id, enabled: bool, title: label, image: asset },
              { description: text, href: optionalTarget, badge: text },
            ),
          "id",
          24,
        ),
        sections: list(
          (y) =>
            shape(y, {
              id: choice(defaults.homepage.sections.map((s) => s.id)),
              visible: bool,
            }),
          "id",
          20,
        ),
      }),
    navigation: (x) =>
      shape(x, {
        items: list(
          (y) =>
            shape(
              y,
              { id, label, href: target, visible: bool },
              { feature: choice(flags) },
            ),
          "id",
          20,
        ),
      }),
    footer: (x) =>
      shape(x, {
        tagline: text,
        showPaymentBadges: bool,
        columns: list(
          (y) =>
            shape(y, {
              id,
              title: label,
              links: list(
                (z) => shape(z, { label, href: target }),
                undefined,
                30,
              ),
            }),
          "id",
          12,
        ),
      }),
    announcement: (x) =>
      shape(x, {
        enabled: bool,
        text,
        href: optionalTarget,
        tone: choice(["info", "warning", "promo"]),
        dismissible: bool,
      }) &&
      record(x) &&
      (!x.enabled || label(x.text)),
    contact: (x) =>
      shape(x, {
        phone: text,
        phoneHours: text,
        email,
        whatsapp: text,
        address: text,
        social: (y) =>
          shape(y, {
            facebook: social("facebook.com"),
            instagram: social("instagram.com"),
            x: social("x.com"),
            youtube: social("youtube.com"),
          }),
      }),
    faqs: list(
      (x) =>
        shape(x, { id, q: label, a: text, visible: bool }, { category: text }),
      "id",
      100,
    ),
    policies: list(
      (x) =>
        shape(x, {
          id,
          title: label,
          href: target,
          summary: text,
          lastReviewed: date,
        }),
      "id",
      20,
    ),
    branding: (x) =>
      shape(x, {
        displayName: label,
        logoRef: choice(["default-wordmark"]),
        faviconRef: choice(["default-favicon"]),
        supportEmail: email,
        supportPhone: text,
        defaultLocale: choice(["en-GB"]),
        defaultCurrency: choice(["GBP", "USD", "EUR", "AED", "SAR"]),
      }),
    seo: (x) =>
      shape(x, {
        pages: list(
          (y) =>
            shape(y, {
              path: target,
              title: label,
              description: text,
              index: bool,
              canonical: optionalTarget,
              ogTitle: text,
              ogDescription: text,
              ogImage: asset,
            }),
          "path",
          100,
        ),
      }),
  });
}
export function isWebsiteFeatures(
  v: unknown,
): v is Record<(typeof flags)[number], boolean> {
  return shape(v, Object.fromEntries(flags.map((key) => [key, bool])));
}

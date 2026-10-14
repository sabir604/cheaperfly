// Visual parity: screenshots our build and pixel-diffs it against the archived screenshots of the original site.
// Usage: node tests/visual/compare.mjs [baseUrl] [slugPrefix]   (default http://localhost:3100, all pages)
// Output: tests/visual/out/<page>.<viewport>.{ours,diff,side}.png and a summary table.
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE = path.resolve(here, "../../../archive");
const OUT = path.join(here, "out");
const BASE = process.argv[2] ?? "http://localhost:3100";
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };

/**
 * [route, archived screenshot slug, extra settle ms for pages with simulated search latency].
 * A slug starting with "flows/" compares against that recorded flow step instead (desktop only): its
 * localStorage snapshot (`<step>.storage.json`) is loaded first so the page renders the same bookings and session.
 * An optional 4th element `{ at }` freezes the browser clock at that instant (for relative dates and greetings);
 * account pages also load the archiver's signed-in state.
 */
const PAGES = [
  ["/about", "about"],
  ["/credits", "credits"],
  ["/legal/terms", "legal__terms"],
  ["/legal/privacy", "legal__privacy"],
  ["/legal/cookies", "legal__cookies"],
  ["/legal/refund-policy", "legal__refund-policy"],
  ["/help", "help"],
  ["/help/baggage", "help__baggage"],
  ["/help/umrah", "help__umrah"],
  ["/help/contact", "help__contact"],
  ["/hotels", "hotels"],
  ["/hotels/search?dest=dubai&in=2026-10-11&out=2026-10-15&rooms=1&adt=2&chd=0", "hotels__search__q_b8437fcc", 2500],
  ["/hotels/marina-crest?dest=dubai&in=2026-10-11&out=2026-10-15&rooms=1&adt=2&chd=0", "hotels__marina-crest__q_b8437fcc"],
  ["/umrah", "umrah"],
  ["/umrah/packages", "umrah__packages", 1500],
  ["/umrah/packages/essential-umrah-7-nights", "umrah__packages__essential-umrah-7-nights"],
  ["/sign-in", "sign-in"],
  ["/sign-up", "sign-up"],
  ["/forgot-password", "forgot-password"],
  ["/manage-booking", "manage-booking"],
  ["/manage-booking/CF-056587", "flows/postbooking/01-mb-detail"],
  ["/manage-booking/CF-056587/cancel?type=cancellation", "flows/postbooking/02-mb-cancellation-form"],
  ["/manage-booking/CF-056587/cancel?type=change", "flows/postbooking/04-mb-change-form"],
  ["/manage-booking/CF-056587", "flows/mb-requests/04-detail-after"],
  ...[
    ["/account", "account", "2026-09-25T19:08:23Z"],
    ["/account/bookings/CF-056587", "account__bookings__CF-056587", "2026-09-25T19:08:30Z"],
    ["/account/bookings/CF-056587/manage", "account__bookings__CF-056587__manage", "2026-09-25T19:08:38Z"],
    ["/account/bookings/CF-056587/manage?tab=change", "account__bookings__CF-056587__manage__q_def1fdbf", "2026-09-25T19:09:49Z"],
    ["/account/bookings/CF-056587/cancel?type=cancellation", "account__bookings__CF-056587__cancel__q_78e552cc", "2026-09-25T19:09:57Z"],
    ["/account/bookings/CF-056587/cancel?type=refund", "account__bookings__CF-056587__cancel__q_0e9af6ca", "2026-09-25T19:10:04Z"],
    ["/account/trips", "account__trips", "2026-09-25T19:08:45Z"],
    ["/account/bookings", "account__bookings", "2026-09-25T19:08:53Z"],
    ["/account/travellers", "account__travellers", "2026-09-25T19:09:00Z"],
    ["/account/refunds", "account__refunds", "2026-09-25T19:09:08Z"],
    ["/account/documents", "account__documents", "2026-09-25T19:09:15Z"],
    ["/account/profile", "account__profile", "2026-09-25T19:09:23Z"],
    ["/account/preferences", "account__preferences", "2026-09-25T19:09:29Z"],
    ["/account/notifications", "account__notifications", "2026-09-25T19:09:35Z"],
    ["/account/support", "account__support", "2026-09-25T19:09:42Z"],
  ].map(([route, slug, at]) => [route, slug, 0, { at, signedIn: true }]),
];

/** The archiver's signed-in browser state, re-pointed at the server under test. */
function signedInState() {
  const state = JSON.parse(fs.readFileSync(path.resolve(here, "../../../tools/archiver/logged-in-state.json"), "utf8"));
  const origin = new URL(BASE).origin;
  return { cookies: [], origins: state.origins.map((o) => ({ ...o, origin })) };
}

function crop(png, height) {
  const out = new PNG({ width: png.width, height });
  PNG.bitblt(png, out, 0, 0, png.width, height, 0, 0);
  return out;
}

function sideBySide(a, b, d) {
  const gap = 12;
  const out = new PNG({ width: a.width * 3 + gap * 2, height: a.height });
  out.data.fill(255);
  PNG.bitblt(a, out, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, out, 0, 0, b.width, b.height, a.width + gap, 0);
  PNG.bitblt(d, out, 0, 0, d.width, d.height, (a.width + gap) * 2, 0);
  return out;
}

const browser = await chromium.launch();
const rows = [];
const only = process.argv[3];
for (const [route, slug, settle = 0, opts = {}] of PAGES) {
  if (only && !slug.startsWith(only)) continue;
  const flow = slug.startsWith("flows/");
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    if (flow && vpName !== "desktop") continue;
    const archived = flow ? path.join(ARCHIVE, `${slug}.png`) : path.join(ARCHIVE, "screens", `${slug}.${vpName}.png`);
    if (!fs.existsSync(archived)) continue;
    const ctx = await browser.newContext({ viewport: vp, ...(opts.signedIn ? { storageState: signedInState() } : {}) });
    const page = await ctx.newPage();
    if (opts.at) await page.clock.setFixedTime(new Date(opts.at));
    if (flow) {
      const { local } = JSON.parse(fs.readFileSync(path.join(ARCHIVE, `${slug}.storage.json`), "utf8"));
      const entries = Object.entries(local).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]);
      await page.addInitScript((kv) => {
        if (sessionStorage.getItem("__seeded")) return;
        localStorage.clear();
        for (const [k, v] of kv) localStorage.setItem(k, v);
        sessionStorage.setItem("__seeded", "1");
      }, entries);
    }
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.waitForTimeout(800 + settle);
    await page.evaluate(() => document.fonts.ready);
    // Same settle routine as the archiver: scroll through to trigger lazy images, then back to top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight + 600; y += 600) {
        window.scrollBy(0, 600);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const name = slug.replaceAll("/", "__");
    const oursFile = path.join(OUT, `${name}.${vpName}.ours.png`);
    await page.screenshot({ path: oursFile, fullPage: true });
    await ctx.close();

    const a = PNG.sync.read(fs.readFileSync(archived));
    const b = PNG.sync.read(fs.readFileSync(oursFile));
    const h = Math.min(a.height, b.height);
    const width = Math.min(a.width, b.width);
    const ac = crop(a, h);
    const bc = crop(b, h);
    const diff = new PNG({ width, height: h });
    const changed = width === a.width && width === b.width ? pixelmatch(ac.data, bc.data, diff.data, width, h, { threshold: 0.1 }) : NaN;
    fs.writeFileSync(path.join(OUT, `${name}.${vpName}.diff.png`), PNG.sync.write(diff));
    fs.writeFileSync(path.join(OUT, `${name}.${vpName}.side.png`), PNG.sync.write(sideBySide(ac, bc, diff)));
    rows.push({ page: flow ? `${route} (${path.basename(slug)})` : route, viewport: vpName, originalHeight: a.height, oursHeight: b.height, diffPixels: changed, diffPercent: +((100 * changed) / (width * h)).toFixed(4) });
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(rows, null, 2));
console.table(rows);

// Functional test for Task 3 (hotels and Umrah journeys) against a running build.
// Replays the recorded hotel (£987) and Umrah (£1,495) bookings from archive/flows and compares
// results and prices with pages archived from the original site.
// Usage: node tests/e2e/task3.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
const ARCHIVE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../archive/pages");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ check: name, result: "PASS" });
  } catch (e) {
    results.push({ check: name, result: "FAIL", detail: e.message.split("\n")[0].slice(0, 200) });
    await page.screenshot({ path: path.join(OUT, `task3-fail-${results.length}.png`), fullPage: true }).catch(() => {});
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
/** Pairs of regex captures from an archived page, e.g. hotel names and nightly prices. */
const archived = (file, ...patterns) => {
  const html = fs.readFileSync(path.join(ARCHIVE, file), "utf8");
  return patterns.map((re) => [...html.matchAll(re)].map((m) => decode(m[1])));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/404|Failed to load resource/.test(m.text()) && !/caret-color/.test(m.text()) && errors.push(`${page.url()}: ${m.text()}`));
const go = async (p) => {
  await page.goto(BASE + p, { waitUntil: "load" });
  await page.waitForTimeout(600);
};
const shot = (name) => page.screenshot({ path: path.join(OUT, `task3-${name}.png`), fullPage: true });
const text = (loc) => loc.allInnerTexts().then((a) => a.map((t) => t.trim()));

const Q = "dest=dubai&in=2026-10-11&out=2026-10-15&rooms=1&adt=2&chd=0";

// ---------------- Hotels ----------------

await check("Hotels landing: hero, hotel tab, destinations, recommended stays, FAQ", async () => {
  await go("/hotels");
  assert(await page.getByRole("heading", { level: 1, name: /Stay somewhere/ }).isVisible(), "hero");
  assert((await page.getByRole("tab", { name: "Hotels" }).getAttribute("aria-selected")) === "true", "hotels tab not selected");
  assert((await page.locator("#home-hs-dest").inputValue()) === "Dubai, United Arab Emirates", "default destination");
  for (const h of ["Where to stay", "Hotels guests love", "Why book hotels with Cheaperfly", "Hotel questions, answered"])
    assert(await page.getByRole("heading", { name: h }).isVisible(), h);
  for (const city of ["Dubai", "London", "Istanbul", "Makkah", "Madinah", "Jeddah"]) assert(await page.getByRole("heading", { level: 3, name: city, exact: true }).isVisible(), city);
  await shot("hotels-landing");
});

await check("Hotels landing: ?dest=makkah pre-fills the destination", async () => {
  await go("/hotels?dest=makkah");
  assert((await page.locator("#home-hs-dest").inputValue()).startsWith("Makkah"), "makkah not pre-filled");
});

await check("Hotel results (Dubai): same hotels, order and nightly prices as the original", async () => {
  await go(`/hotels/search?${Q}`);
  await page.locator('section[aria-label="Hotel results"]').waitFor({ timeout: 15000 });
  const [names, prices] = archived("hotels__search__q_b8437fcc.html", /<h3 class="mt-1 text-\[18px\][^>]*><a[^>]*>([^<]+)<\/a>/g, /text-\[26px\][^>]*>([^<]+)</g);
  const gotNames = await text(page.locator('section[aria-label="Hotel results"] article h3'));
  const gotPrices = await text(page.locator('section[aria-label="Hotel results"] article p.text-\\[26px\\]'));
  assert(JSON.stringify(gotNames) === JSON.stringify(names), `names ${JSON.stringify(gotNames)}`);
  assert(JSON.stringify(gotPrices) === JSON.stringify(prices), `prices ${JSON.stringify(gotPrices)} vs ${JSON.stringify(prices)}`);
  assert(await page.getByText("7 of 7 properties").isVisible(), "filter count");
  await shot("hotel-results");
});

await check("Hotel results (Makkah): same hotels and prices as the original", async () => {
  await go("/hotels/search?dest=makkah&in=2026-10-11&out=2026-10-15&rooms=1&adt=2&chd=0");
  await page.locator('section[aria-label="Hotel results"]').waitFor({ timeout: 15000 });
  const [names, prices] = archived("hotels__search__q_4911fe65.html", /<h3 class="mt-1 text-\[18px\][^>]*><a[^>]*>([^<]+)<\/a>/g, /text-\[26px\][^>]*>([^<]+)</g);
  assert(JSON.stringify(await text(page.locator('section[aria-label="Hotel results"] article h3'))) === JSON.stringify(names), "names differ");
  assert(JSON.stringify(await text(page.locator('section[aria-label="Hotel results"] article p.text-\\[26px\\]'))) === JSON.stringify(prices), "prices differ");
});

await check("Hotel results: star filter, sort by price, reset and map view", async () => {
  await go(`/hotels/search?${Q}`);
  await page.locator('section[aria-label="Hotel results"]').waitFor({ timeout: 15000 });
  const filters = page.locator('aside[aria-label="Filters"]');
  await filters.getByRole("button", { name: /^5/ }).click();
  const fiveStar = await page.locator('section[aria-label="Hotel results"] article').count();
  assert(fiveStar > 0 && fiveStar < 7, `5-star count ${fiveStar}`);
  assert(await page.getByText(/\(filtered from 7\)/).isVisible(), "filtered note");
  await shot("hotel-results-5star");
  await filters.getByRole("button", { name: "Reset all" }).click();
  await page.locator("#hsort").selectOption("price");
  const prices = (await text(page.locator('section[aria-label="Hotel results"] article p.text-\\[26px\\]'))).map((p) => Number(p.replace(/[^\d]/g, "")));
  assert(prices.every((p, i) => i === 0 || prices[i - 1] <= p), `not sorted ${prices}`);
  await page.getByRole("button", { name: "Map" }).click();
  const pins = page.locator('[aria-label="Map of hotels"] button');
  assert((await pins.count()) === 7, "7 map pins");
  await pins.first().click();
  assert(await page.getByText(/Selected:/).isVisible(), "selected hotel note");
  await shot("hotel-map");
});

await check("Hotel results: invalid link shows the 'isn't valid' state", async () => {
  await go("/hotels/search?dest=atlantis");
  assert(await page.getByText("That search link isn't valid").isVisible(), "invalid state");
});

await check("Hotel page (Marina Crest): sections, gallery and rate prices match the original", async () => {
  await go(`/hotels/marina-crest?${Q}`);
  assert(await page.getByRole("heading", { level: 1, name: "The Marina Crest" }).isVisible(), "title");
  assert((await page.title()).startsWith("The Marina Crest"), `title ${await page.title()}`);
  const [prices] = archived("hotels__marina-crest__q_b8437fcc.html", /text-\[22px\][^>]*>([^<]+)</g);
  const got = await text(page.locator("#sec-rooms p.text-\\[22px\\]"));
  assert(JSON.stringify(got) === JSON.stringify(prices), `rates ${JSON.stringify(got)} vs ${JSON.stringify(prices)}`);
  for (const s of ["About this property", "Choose your room", "Facilities & services", "Location", "Policies & property rules", "Guest reviews"])
    assert(await page.getByRole("heading", { name: s }).isVisible(), s);
  await page.getByRole("button", { name: /Show all \d+ photos/ }).click();
  assert(await page.getByRole("dialog").isVisible(), "gallery dialog");
  await page.getByRole("button", { name: "Next photo" }).click();
  assert(await page.getByRole("dialog").getByText(/^2 \/ \d+$/).isVisible(), "gallery step");
  await page.keyboard.press("Escape");
  await shot("hotel-detail");
});

await check("Hotel page: unknown hotel is a 404", async () => {
  const res = await page.goto(`${BASE}/hotels/does-not-exist`);
  assert(res.status() === 404, `status ${res.status()}`);
  assert(await page.getByText("We can’t find that page").isVisible(), "404 view");
});

await check("Hotel booking: reserve → guest validation → review terms → pay → confirmation £987", async () => {
  await ctx.clearCookies();
  await go(`/hotels/marina-crest?${Q}`);
  await page.getByRole("button", { name: "Reserve Deluxe King Room, Breakfast included" }).click();
  await page.waitForURL(/\/hotels\/book\/guest/);
  await page.getByRole("button", { name: "Continue to review" }).click();
  assert(await page.getByText("Select a title").first().isVisible(), "title validation");
  assert(await page.getByText("Enter your email address").isVisible(), "email validation");
  await shot("hotel-guest-validation");
  await page.locator("#g0-title").selectOption("Ms");
  await page.locator("#g0-first").fill("Aisha");
  await page.locator("#g0-last").fill("Khan");
  await page.locator("#contact-email").fill("test.traveller@example.com");
  await page.locator("#contact-mobile").fill("7700900123");
  await page.locator("#notes").fill("Quiet room please");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.waitForURL(/\/hotels\/book\/review/);
  assert(await page.getByRole("heading", { name: "Review your stay" }).isVisible(), "review heading");
  assert(await page.getByText("Free cancellation until 8 Oct 2026. After that, the full stay is charged.").isVisible(), "cancellation terms");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  assert(await page.getByText("Please accept the terms to continue to payment.").isVisible(), "terms error");
  await page.locator("#terms").check();
  await shot("hotel-review");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/checkout\/payment/);
  assert(await page.getByText("£987.00").first().isVisible(), "payment total");
  await page.locator("#cc-name").fill("AISHA KHAN");
  await page.locator("#cc-number").fill("4242424242424242");
  await page.locator("#cc-exp").fill("1230");
  await page.locator("#cc-cvv").fill("123");
  await page.locator("#bill-addr").fill("1 High Street");
  await page.locator("#bill-city").fill("London");
  await page.locator("#bill-zip").fill("SW1A 1AA");
  await page.getByRole("button", { name: "Pay £987.00" }).click();
  await page.waitForURL(/\/checkout\/confirmation\//, { timeout: 20000 });
  await page.getByRole("heading", { name: "Booking confirmed" }).waitFor();
  for (const t of ["Your stay", "Room & rate", "Guests & requests", "Hotel policies"]) assert(await page.getByRole("heading", { name: t }).isVisible(), t);
  const body = await page.locator("main").innerText();
  for (const t of ["£876.00", "£105.00", "£6.00", "£987.00", "Quiet room please", "Ms Aisha Khan"]) assert(body.includes(t), `missing ${t}`);
  await shot("hotel-confirmation");
});

await check("Hotel documents: voucher and invoice", async () => {
  const ref = page.url().split("/").pop();
  await go(`/documents/voucher/${ref}`);
  assert(await page.getByRole("heading", { name: "The Marina Crest" }).isVisible(), "voucher hotel");
  const v = await page.locator("main").innerText();
  for (const t of ["HOTEL BOOKING VOUCHER", "Ms Aisha Khan", "Deluxe King Room", "Prepaid £987.00", "Free cancellation until 8 Oct 2026"]) assert(v.includes(t), `voucher missing ${t}`);
  await shot("hotel-voucher");
  await go(`/documents/invoice/${ref}`);
  const inv = await page.locator("main").innerText();
  for (const t of ["Accommodation", "£987.00", "Total paid"]) assert(inv.includes(t), `invoice missing ${t}`);
});

await check("Hotel checkout: steps without a draft show 'session expired'", async () => {
  await go("/hotels/book/guest");
  assert(await page.getByText("Your booking session has expired").isVisible(), "expired");
});

// ---------------- Umrah ----------------

await check("Umrah landing: hero, search, featured packages, holy-city hotels, FAQ", async () => {
  await go("/umrah");
  assert(await page.getByRole("heading", { level: 1, name: /Your Umrah/ }).isVisible(), "hero");
  for (const h of ["Find your package", "Choose the journey that fits your family", "Hotels close to Masjid al-Haram", "Stay near Al-Masjid an-Nabawi", "Umrah questions, answered"])
    assert(await page.getByRole("heading", { name: h }).isVisible(), h);
  assert((await page.locator("#fp-h ~ ul > li").count()) === 6, "6 featured packages");
  const hotels = await text(page.locator("#mk-h ~ ul h3"));
  assert(JSON.stringify(hotels) === JSON.stringify(["Ajyad Royal Suites", "Marwa Gate Hotel", "Safa Heights Makkah"]), `makkah hotels ${hotels}`);
  await shot("umrah-landing");
});

await check("Umrah landing: holy-city hotel opens the hotel page with default dates", async () => {
  await go("/umrah");
  await page.getByRole("link", { name: /Nabawi Gate Royal/ }).click();
  await page.waitForURL(/\/hotels\/nabawi-gate-royal/);
  assert(await page.getByRole("heading", { level: 1, name: "Nabawi Gate Royal" }).isVisible(), "hotel page");
});

await check("Umrah packages: list, prices vs original, filters and search", async () => {
  await go("/umrah/packages");
  await page.locator('section[aria-label="Umrah packages"]').waitFor({ timeout: 15000 });
  const [names, prices] = archived("umrah__packages.html", /text-\[19px\][^>]*><a[^>]*>([^<]+)</g, /text-\[28px\][^>]*>([^<]+)</g);
  const got = await text(page.locator('section[aria-label="Umrah packages"] article h3'));
  const gotPrices = await text(page.locator('section[aria-label="Umrah packages"] article p.text-\\[28px\\]'));
  assert(JSON.stringify(got) === JSON.stringify(names), `packages ${JSON.stringify(got)}`);
  // "From" prices use the cheapest departure, whose dates move with today; record any drift.
  if (JSON.stringify(gotPrices) !== JSON.stringify(prices)) results.push({ check: "  note: from-prices differ from 25 Sep capture", result: "INFO", detail: `${gotPrices} vs ${prices}` });
  await page.locator('aside[aria-label="Filters"]').getByText("Up to 7 nights").click();
  const short = await page.locator('section[aria-label="Umrah packages"] article').count();
  assert(short > 0 && short < 8, `short count ${short}`);
  await shot("umrah-packages");
  await go("/umrah/packages?from=London&month=any&nights=14&adt=2&chd=0&inf=0");
  await page.locator('section[aria-label="Umrah packages"]').waitFor({ timeout: 15000 });
  const fourteen = await text(page.locator('section[aria-label="Umrah packages"] article h3'));
  assert(fourteen.length > 0 && fourteen.every((n) => /1[345] Nights|Extended/.test(n)), `14-night search ${fourteen}`);
});

await check("Umrah package page: sections, departures table and unknown package 404", async () => {
  await go("/umrah/packages/essential-umrah-7-nights?from=Manchester&month=any&nights=any&adt=3&chd=0&inf=0");
  assert(await page.getByRole("heading", { level: 1, name: "Essential Umrah — 7 Nights" }).isVisible(), "title");
  // The booking card renders twice (mobile + desktop sidebar), as in the original; check the desktop one.
  assert((await page.locator("#ud-city").last().inputValue()) === "Manchester", "seeded city");
  assert(await page.getByRole("button", { name: /Passengers: 3 passengers/ }).last().isVisible(), "seeded party");
  for (const s of ["Package overview", "Day-by-day itinerary", "Your hotels", "Flights", "Transfers", "What’s included", "Not included", "Important information"])
    assert(await page.locator("main").getByRole("heading", { level: 2, name: s, exact: true }).isVisible(), s);
  assert((await page.locator("#u-overview tbody tr").count()) === 12, "12 departures");
  await shot("umrah-detail");
  const res = await page.goto(`${BASE}/umrah/packages/nope`);
  assert(res.status() === 404, `status ${res.status()}`);
});

await check("Umrah booking: customise → travellers → review → pay → confirmation £1,495", async () => {
  await go("/umrah/packages/essential-umrah-7-nights");
  await page.getByRole("button", { name: "Customise & book" }).click();
  await page.waitForURL(/\/umrah\/book\/customize/);
  const perAdult = page.locator("aside").getByText(/^£[\d,]+$/).first();
  const quad = await perAdult.innerText();
  await page.getByRole("radio", { name: /Double room/ }).click();
  assert((await perAdult.innerText()) !== quad, "room change didn't reprice");
  await page.getByRole("radio", { name: /Quad room/ }).click();
  assert((await perAdult.innerText()) === quad, "quad price not restored");
  assert(quad === "£651", `per adult ${quad} (original £651)`);
  await page.getByText("Makkah ziyarat tour").click();
  await page.getByText("Saudi eSIM (20 GB)").click();
  await shot("umrah-customize");
  await page.getByRole("button", { name: "Continue to traveller details" }).click();
  await page.waitForURL(/\/umrah\/book\/travellers/);
  await page.getByRole("button", { name: "Continue to review" }).click();
  assert(await page.getByText("Please check the highlighted fields").isVisible(), "validation summary");
  const fill = async (i, t) => {
    await page.locator(`#travellers-${i}-title`).selectOption(t.title);
    await page.locator(`#travellers-${i}-first`).fill(t.first);
    await page.locator(`#travellers-${i}-last`).fill("Khan");
    await page.locator(`#travellers-${i}-dob`).fill(t.dob);
    await page.locator(`#travellers-${i}-gender`).selectOption(t.gender);
    await page.locator(`#travellers-${i}-nat`).selectOption("GB");
    await page.locator(`#travellers-${i}-pp`).fill(t.pp);
    await page.locator(`#travellers-${i}-ppc`).selectOption("GB");
    await page.locator(`#travellers-${i}-ppe`).fill("2031-05-14");
  };
  await fill(0, { title: "Mr", first: "Omar", dob: "1985-02-01", gender: "male", pp: "533871200" });
  await fill(1, { title: "Mrs", first: "Aisha", dob: "1990-05-14", gender: "female", pp: "533871201" });
  await page.locator("#um-with-1").fill("Husband: Omar Khan");
  await page.locator("#contact-email").fill("test.traveller@example.com");
  await page.locator("#contact-mobile").fill("7700900123");
  await page.locator("#um-notes").fill("Wheelchair for elderly parent");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.waitForURL(/\/umrah\/book\/review/);
  const review = await page.locator("main").innerText();
  for (const t of ["Essential Umrah — 7 Nights", "Aziziyah Comfort Residence", "Makkah ziyarat tour, Saudi eSIM (20 GB)", "Mr Omar Khan", "with Husband: Omar Khan", "Passport ••••••201"])
    assert(review.includes(t), `review missing ${t}`);
  await page.locator("#terms").check();
  await shot("umrah-review");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/checkout\/payment/);
  await page.locator("#cc-name").fill("OMAR KHAN");
  await page.locator("#cc-number").fill("4242424242424242");
  await page.locator("#cc-exp").fill("1230");
  await page.locator("#cc-cvv").fill("123");
  await page.locator("#bill-addr").fill("1 High Street");
  await page.locator("#bill-city").fill("London");
  await page.locator("#bill-zip").fill("SW1A 1AA");
  await page.getByRole("button", { name: "Pay £1,495.00" }).click();
  await page.waitForURL(/\/checkout\/confirmation\//, { timeout: 20000 });
  await page.getByRole("heading", { name: "Booking confirmed" }).waitFor();
  const body = await page.locator("main").innerText();
  for (const t of ["£1,302.00", "£65.00", "£70.00", "£28.00", "£30.00", "£1,495.00", "Visa progress", "Documents requested", "Wheelchair for elderly parent"]) assert(body.includes(t), `missing ${t}`);
  await shot("umrah-confirmation");
});

await check("Umrah documents: voucher and invoice", async () => {
  const ref = page.url().split("/").pop();
  await go(`/documents/voucher/${ref}`);
  const v = await page.locator("main").innerText();
  for (const t of ["UMRAH BOOKING VOUCHER", "Essential Umrah — 7 Nights", "Aziziyah Comfort Residence", "Mr Omar Khan", "Day 1"]) assert(v.includes(t), `voucher missing ${t}`);
  await shot("umrah-voucher");
  await go(`/documents/invoice/${ref}`);
  const inv = await page.locator("main").innerText();
  for (const t of ["Package", "£1,495.00"]) assert(inv.includes(t), `invoice missing ${t}`);
});

await check("Umrah checkout: steps without a draft show 'session expired'", async () => {
  await go("/umrah/book/review");
  assert(await page.getByText("Your booking session has expired").isVisible(), "expired");
});

await check("Mobile (390px): hotel results filters drawer and Umrah package page", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`/hotels/search?${Q}`);
  await page.locator('section[aria-label="Hotel results"]').waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /^Filters/ }).click();
  assert(await page.getByRole("dialog", { name: "Filters" }).isVisible(), "filters drawer");
  await page.getByRole("button", { name: "Show 7 properties" }).click();
  await shot("mobile-hotel-results");
  await go("/umrah/packages/family-umrah-10-nights");
  assert(await page.getByRole("button", { name: "Customise & book" }).isVisible(), "booking card on mobile");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 0, `horizontal overflow ${overflow}px`);
  await shot("mobile-umrah-detail");
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check("No runtime or console errors", async () => {
  assert(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
console.table(results);
const failed = results.filter((r) => r.result === "FAIL").length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

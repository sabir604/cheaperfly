// Functional smoke test for Task 1 (site shell + content pages) against a running build.
// Usage: node tests/e2e/task1.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ check: name, result: "PASS" });
  } catch (e) {
    results.push({ check: name, result: "FAIL", detail: e.message.split("\n")[0].slice(0, 140) });
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/404|Failed to load resource/.test(m.text()) && errors.push(m.text()));
const go = async (p) => {
  await page.goto(BASE + p, { waitUntil: "load" });
  await page.waitForTimeout(600);
};

await check("Header shows nav, currency and Sign in / Register after hydration", async () => {
  await go("/about");
  for (const label of ["Flights", "Hotels", "Umrah", "Manage Booking", "Help"]) assert(await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: label }).isVisible(), label);
  assert(await page.getByRole("link", { name: "Register" }).isVisible(), "Register");
});

await check("Currency switch to USD shows toast and persists across reload", async () => {
  await go("/help");
  await page.getByRole("button", { name: /Currency:/ }).first().click();
  await page.getByRole("button", { name: /USD\s*US Dollar/ }).click();
  await page.getByText("Prices now shown in USD").waitFor();
  await page.screenshot({ path: path.join(OUT, "currency-toast.png") });
  await page.reload();
  await page.waitForTimeout(800);
  assert(await page.getByRole("button", { name: "Currency: US Dollar" }).first().isVisible(), "USD not persisted");
  const ui = await page.evaluate(() => JSON.parse(localStorage.getItem("cf.ui")).state.currency);
  assert(ui === "USD", `cf.ui currency = ${ui}`);
  await page.getByRole("button", { name: /Currency:/ }).first().click();
  await page.getByRole("button", { name: /GBP\s*British Pound/ }).click();
});

await check("Active nav item is highlighted on /help pages", async () => {
  await go("/help/refunds");
  assert((await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Help" }).getAttribute("aria-current")) === "page", "Help not current");
});

await check("Help search finds articles and 'no results' state works", async () => {
  await go("/help");
  await page.getByRole("button", { name: "umrah visa", exact: true }).click();
  await page.getByText(/\d+ results? for “umrah visa”/).waitFor();
  await page.screenshot({ path: path.join(OUT, "help-search.png") });
  await page.getByLabel("Search the help centre").fill("zzzz qqq");
  await page.getByText("No matching articles").waitFor();
});

await check("Accordion opens and closes", async () => {
  await go("/help");
  const btn = page.getByRole("button", { name: "Is the Umrah visa included?" });
  await btn.click();
  assert((await btn.getAttribute("aria-expanded")) === "true", "not expanded");
  await page.getByText("Every Cheaperfly Umrah package includes").waitFor();
  await btn.click();
  assert((await btn.getAttribute("aria-expanded")) === "false", "not collapsed");
});

await check("Help topic page: first answer open, sidebar, contact link carries topic", async () => {
  await go("/help/baggage");
  assert((await page.getByRole("button", { name: "What baggage is included in my fare?" }).getAttribute("aria-expanded")) === "true", "first not open");
  assert((await page.getByRole("main").getByRole("link", { name: "Contact support" }).getAttribute("href")) === "/help/contact?topic=Baggage", "topic link");
});

await check("WhatsApp button creates a local SP- support case", async () => {
  await go("/help/contact");
  await page.getByRole("button", { name: /WhatsApp/ }).click();
  await page.getByText(/Case SP-\d{5} created locally/).waitFor();
  const cases = await page.evaluate(() => JSON.parse(localStorage.getItem("cf.account")).state.cases);
  assert(cases.length === 1 && cases[0].channel === "whatsapp", "case not stored");
});

await check("Contact form shows validation messages", async () => {
  await go("/help/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  for (const msg of ["Enter your name", "Enter your email address", "Choose a topic", "Please give us a little more detail (at least 15 characters)"]) await page.getByRole("alert").filter({ hasText: msg }).waitFor({ timeout: 3000 });
  await page.screenshot({ path: path.join(OUT, "contact-validation.png"), fullPage: true });
});

await check("Contact form submits and shows the case reference", async () => {
  await go("/help/contact?booking=CF-123456");
  assert((await page.locator("#sp-booking").inputValue()) === "CF-123456", "booking not prefilled");
  await page.locator("#sp-name").fill("Aisha Khan");
  await page.locator("#sp-email").fill("aisha@example.com");
  await page.locator("#sp-topic").selectOption("Refunds");
  await page.locator("#sp-msg").fill("Please check the status of my refund request.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText("Support case created").waitFor();
  await page.screenshot({ path: path.join(OUT, "contact-success.png") });
  const c = await page.evaluate(() => JSON.parse(localStorage.getItem("cf.account")).state.cases[0]);
  assert(c.subject === "Refunds — CF-123456" && c.bookingRef === "CF-123456", `case ${JSON.stringify(c).slice(0, 80)}`);
});

await check("Legal pages: side nav switches documents", async () => {
  await go("/legal/terms");
  await page.getByRole("navigation", { name: "Legal documents" }).getByRole("link", { name: "Cookie policy" }).click();
  await page.waitForURL("**/legal/cookies");
  await page.getByRole("heading", { level: 1, name: "Cookie policy" }).waitFor();
});

await check("Page titles follow '<page> · Cheaperfly'", async () => {
  for (const [p, t] of [
    ["/about", "About Cheaperfly · Cheaperfly"],
    ["/credits", "Image credits · Cheaperfly"],
    ["/help", "Help centre · Cheaperfly"],
    ["/help/baggage", "Baggage help · Cheaperfly"],
    ["/help/contact", "Contact support · Cheaperfly"],
    ["/legal/refund-policy", "Refund & cancellation policy · Cheaperfly"],
  ]) {
    await go(p);
    assert((await page.title()) === t, `${p}: ${await page.title()}`);
  }
});

await check("Unknown URL shows the custom 404", async () => {
  const res = await page.goto(BASE + "/this-page-does-not-exist");
  assert(res.status() === 404, `status ${res.status()}`);
  await page.getByRole("heading", { name: "We can’t find that page" }).waitFor();
  await page.screenshot({ path: path.join(OUT, "404.png") });
});

await check("Mobile: menu drawer opens with nav, currency and sign-in", async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await go("/about");
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Menu" });
  await drawer.waitFor();
  assert(await drawer.getByRole("link", { name: "Manage Booking" }).isVisible(), "nav");
  assert(await drawer.getByRole("link", { name: "Create an account" }).isVisible(), "sign-up");
  await page.screenshot({ path: path.join(OUT, "mobile-menu.png") });
  await drawer.getByRole("link", { name: "Help" }).click();
  await page.waitForURL("**/help");
  await page.waitForTimeout(500);
  assert(!(await drawer.isVisible()), "drawer did not close after navigation");
});

await check("Announcement bar appears when the admin publishes one (cf-config)", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await go("/about");
  await page.evaluate(() =>
    localStorage.setItem(
      "cf-config",
      JSON.stringify({ state: { content: { announcement: { enabled: true, text: "Eid sale: 10% off Umrah packages", href: "/umrah", tone: "promo", dismissible: true } }, meta: null, features: {} }, version: 0 }),
    ),
  );
  await go("/about");
  await page.getByRole("region", { name: "Announcement" }).getByText("Eid sale").waitFor();
  await page.screenshot({ path: path.join(OUT, "announcement.png") });
  await page.getByRole("button", { name: "Dismiss announcement" }).click();
  assert(!(await page.getByRole("region", { name: "Announcement" }).count()), "not dismissed");
  await page.evaluate(() => localStorage.removeItem("cf-config"));
});

await check("Feature flag: telephony off hides the phone option", async () => {
  await page.evaluate(() => localStorage.setItem("cf-config", JSON.stringify({ state: { content: null, meta: null, features: { telephony: false } }, version: 0 })));
  await go("/help/contact");
  assert((await page.getByText("Call us").count()) === 0, "phone still shown");
  await page.evaluate(() => localStorage.removeItem("cf-config"));
});

await check("No runtime errors in the browser console", async () => {
  assert(errors.length === 0, errors.join(" | "));
});

await browser.close();
console.table(results);
process.exit(results.some((r) => r.result === "FAIL") ? 1 : 0);

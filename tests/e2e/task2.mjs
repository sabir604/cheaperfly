// Functional test for Task 2 (home, flight search, booking steps, checkout, documents) against a running build.
// Replays the recorded booking from archive/flows/flight-return and checks it totals £721 like the original.
// Usage: node tests/e2e/task2.mjs [baseUrl]
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
    results.push({ check: name, result: "FAIL", detail: e.message.split("\n")[0].slice(0, 160) });
    await page.screenshot({ path: path.join(OUT, `task2-fail-${results.length}.png`), fullPage: true }).catch(() => {});
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const SEARCH = "/flights/search?trip=return&from=LON&to=DXB&dep=2026-10-16&ret=2026-10-23&adt=1&chd=0&inf=0&cabin=economy";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const errorLog = [];
page.on("console", (m) => m.type() === "error" && errorLog.push(`${page.url()}\n${m.text()}`));
// Playwright's screenshot injects `caret-color: transparent`, which React reports as a hydration mismatch.
page.on("console", (m) => m.type() === "error" && !/404|Failed to load resource/.test(m.text()) && !/caret-color/.test(m.text()) && errors.push(m.text()));
const go = async (p) => {
  await page.goto(BASE + p, { waitUntil: "load" });
  await page.waitForTimeout(600);
};
const shot = (name) => page.screenshot({ path: path.join(OUT, `task2-${name}.png`), fullPage: true });
const waitResults = () => page.getByRole("region", { name: "Flight results" }).or(page.locator('section[aria-label="Flight results"]')).first().waitFor({ timeout: 15000 });

await check("Home: hero, booking engine tabs and all sections render", async () => {
  await go("/");
  assert(await page.getByRole("heading", { level: 1, name: /Travel further/ }).isVisible(), "hero");
  for (const t of ["Flights", "Hotels", "Umrah"]) assert(await page.getByRole("tab", { name: t }).isVisible(), `tab ${t}`);
  for (const h of ["Where will you go next?", "Fares that caught our eye", "Hotels guests love", "Umrah, arranged from door to Haram", "Ideas for your next trip"])
    assert(await page.getByRole("heading", { name: h }).isVisible(), h);
  await shot("home");
});

await check("Home: airport autocomplete finds Jeddah and the search lands on results", async () => {
  await go("/");
  await page.locator("#home-fs-to").click();
  await page.locator("#home-fs-to").fill("jed");
  await page.getByRole("option", { name: /JED/ }).first().click();
  assert((await page.locator("#home-fs-to").inputValue()) === "Jeddah (JED)", "Jeddah not picked");
  await page.getByRole("button", { name: /^Search$/ }).click();
  await page.waitForURL(/\/flights\/search\?.*to=JED/);
  await waitResults();
  const recent = await page.evaluate(() => JSON.parse(localStorage.getItem("cf.ui")).state.recent[0]);
  assert(recent?.label === "London ⇄ Jeddah", `recent search ${JSON.stringify(recent)}`);
});

await check("Home: passenger picker, one-way and multi-city tabs", async () => {
  await go("/");
  await page.getByRole("button", { name: /Passengers: 1 passenger/ }).click();
  await page.getByRole("button", { name: "Increase Children" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  assert(await page.getByRole("button", { name: /Passengers: 2 passengers/ }).isVisible(), "2 passengers");
  await page.getByRole("radio", { name: "One way" }).click();
  assert(!(await page.locator("#home-fs-ret").count()), "return date shown on one way");
  await page.getByRole("radio", { name: "Multi-city" }).click();
  assert(await page.getByText("Flight 2 · From").isVisible(), "second leg");
  await page.getByRole("tab", { name: "Umrah" }).click();
  assert(await page.getByRole("button", { name: "Find packages" }).isVisible(), "umrah form");
});

await check("Flights landing page renders search, deals, fare types and FAQ", async () => {
  await go("/flights");
  assert(await page.getByRole("heading", { level: 1, name: /The right flight/ }).isVisible(), "hero");
  assert(await page.getByRole("heading", { name: "Fare types, explained simply" }).isVisible(), "fare types");
  assert(await page.getByRole("button", { name: "Are taxes and fees included in the price I see?" }).getAttribute("aria-expanded") === "true", "first FAQ open");
});

// Fares depend on days to departure, so pin the browser's "today" to when the original booking was recorded
// (26 Sep 2026). Done after the home checks: their server-rendered default dates would otherwise mismatch on hydration.
await ctx.clock.setFixedTime(new Date("2026-09-25T19:04:00Z"));

await check("Results: 33 offers, EK 37 first at £556, strip of 7 dates", async () => {
  await go(SEARCH);
  await waitResults();
  assert(await page.getByText("33 flights", { exact: true }).first().isVisible(), "33 flights");
  const first = page.locator("article").first();
  assert((await first.getAttribute("aria-label")) === "Emirates flight, £556 per person", await first.getAttribute("aria-label"));
  assert((await page.getByRole("navigation", { name: "Compare nearby dates" }).getByRole("button").count()) === 7, "7 dates");
  await shot("results");
});

await check("Results: direct filter, cheapest sort, show more and flight details", async () => {
  await page.getByRole("checkbox", { name: "Direct" }).first().check({ force: true });
  await page.getByText(/filtered from 33/).waitFor();
  await page.getByRole("radio", { name: /Cheapest/ }).click();
  assert((await page.locator("article").first().getAttribute("aria-label")).startsWith("flydubai"), "cheapest first");
  await page.getByRole("button", { name: "Reset all" }).first().click();
  await page.getByRole("button", { name: /Show more flights \(21 more\)/ }).click();
  assert((await page.locator("article").count()) === 24, "24 after show more");
  await page.getByRole("button", { name: "Flight details" }).first().click();
  assert(await page.getByText("Fare notes").isVisible(), "details");
});

await check("Invalid search link shows the 'isn't valid' state", async () => {
  await go("/flights/search?trip=return&from=LON&to=XXX&dep=2026-10-16&ret=2026-10-23&adt=1&chd=0&inf=0&cabin=economy");
  assert(await page.getByRole("heading", { name: "That search link isn't valid" }).isVisible(), "invalid state");
});

await check("Multi-city search returns results", async () => {
  await go("/flights/search?trip=multicity&seg=LON~DXB~2026-10-16,DXB~IST*~2026-10-20&adt=1&chd=0&inf=0&cabin=economy");
  await waitResults();
  assert(await page.getByRole("heading", { level: 1, name: "London → Dubai → Istanbul" }).isVisible(), "multicity title");
});

let reference = "";
await check("Booking: fare step shows Saver/Flex/Flex Plus at £556/£678/£852", async () => {
  await go(SEARCH);
  await waitResults();
  await page.locator("article").first().getByRole("button", { name: "Select" }).click();
  await page.waitForURL(/\/flights\/fare\//);
  await page.getByRole("heading", { name: "Review your flight and choose a fare" }).waitFor();
  for (const [name, price] of [["Economy Saver", "£556"], ["Economy Flex", "£678"], ["Economy Flex Plus", "£852"]])
    assert(await page.getByRole("radio", { name: `Select ${name}, ${price} per person` }).isVisible(), `${name} ${price}`);
  await page.getByRole("radio", { name: /Select Economy Flex, / }).click();
  await shot("fare");
  await page.getByRole("button", { name: "Continue with Economy Flex" }).first().click();
  await page.waitForURL(/\/flights\/book\/passengers/);
});

await check("Booking: passenger validation, then details", async () => {
  await page.getByRole("button", { name: "Continue to extras" }).click();
  await page.getByText("Please check the highlighted fields").waitFor();
  assert(await page.getByText("Select a title").isVisible(), "title error");
  assert(await page.getByText("Enter first name as shown on the passport").isVisible(), "name error");
  await page.locator("#passengers-0-title").selectOption("Ms");
  await page.locator("#passengers-0-first").fill("Aisha");
  await page.locator("#passengers-0-last").fill("Khan");
  await page.locator("#passengers-0-dob").fill("1990-05-14");
  await page.locator("#passengers-0-gender").selectOption("female");
  await page.locator("#passengers-0-nat").selectOption("GB");
  await page.locator("#passengers-0-pp").fill("533871204");
  await page.locator("#passengers-0-ppc").selectOption("GB");
  await page.locator("#passengers-0-ppe").fill("2031-05-14");
  await page.locator("#contact-email").fill("test.traveller@example.com");
  await page.locator("#contact-mobile").fill("7700900123");
  await page.getByRole("button", { name: "Continue to extras" }).click();
  await page.waitForURL(/\/flights\/book\/extras/);
});

await check("Booking: +10 kg bag and halal meal on the outbound", async () => {
  await page.getByRole("radiogroup", { name: /Extra baggage for Aisha Khan, flight 1/ }).getByRole("radio", { name: /\+10 kg/ }).click();
  await page.getByRole("button", { name: "Next: Meals" }).click();
  await page.getByRole("radiogroup", { name: /Meal for Aisha Khan, flight 1/ }).getByRole("radio", { name: /Halal meal/ }).click();
  await page.getByRole("button", { name: "Next: Assistance" }).click();
  assert(await page.getByRole("radio", { name: /No assistance needed/ }).isVisible(), "assistance tab");
  await page.getByRole("button", { name: "Continue to seats" }).click();
  await page.waitForURL(/\/flights\/book\/seats/);
});

await check("Booking: seats 35A outbound and 40G return, zoom works", async () => {
  await page.getByRole("gridcell", { name: /^Seat 35A,/ }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  assert(await page.getByText("110%").isVisible(), "zoom");
  await page.getByRole("tab", { name: /DXB → LHR/ }).click();
  await page.getByRole("gridcell", { name: /^Seat 40G,/ }).click();
  assert(await page.getByRole("button", { name: "Remove seat 40G" }).isVisible(), "seat in summary");
  await shot("seats");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.waitForURL(/\/flights\/book\/review/);
});

await check("Booking: review requires terms, total £721.00", async () => {
  assert(await page.getByText("£721.00").first().isVisible(), "review total");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByText("Please accept the terms to continue to payment.").waitFor();
  await page.locator("#terms").check({ force: true });
  await shot("review");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/checkout\/payment/);
});

await check("Payment: card validation and Luhn check", async () => {
  await page.getByRole("button", { name: "Pay £721.00" }).click();
  await page.getByText("Enter the name shown on the card").waitFor();
  await page.locator("#cc-number").fill("4242424242424241");
  await page.locator("#cc-number").blur();
  await page.getByText("Enter a valid card number").waitFor();
});

await check("Payment: declined test card returns with an error, no booking", async () => {
  await page.getByText("Demo & QA controls").click();
  await page.getByRole("button", { name: /4000 0000 0000 0002/ }).click();
  await page.locator("#cc-name").fill("AISHA KHAN");
  await page.locator("#cc-exp").fill("1229");
  await page.locator("#cc-cvv").fill("123");
  await page.locator("#bill-addr").fill("1 Test Street");
  await page.locator("#bill-city").fill("London");
  await page.locator("#bill-zip").fill("SW1A 1AA");
  await page.getByRole("button", { name: "Pay £721.00" }).click();
  await page.waitForURL(/\/checkout\/processing/);
  await page.waitForURL(/\/checkout\/payment/, { timeout: 15000 });
  await page.getByText("Payment unsuccessful").waitFor();
  assert(await page.getByText(/Your bank declined the payment/).isVisible(), "declined message");
  const bookings = await page.evaluate(() => JSON.parse(localStorage.getItem("cf.bookings") ?? '{"state":{"bookings":[]}}').state.bookings.length);
  assert(bookings === 0, `bookings after decline = ${bookings}`);
});

await check("Payment: 4242 card succeeds → processing → confirmation with ref, PNR, ticket", async () => {
  await page.getByRole("button", { name: "Try another card" }).click();
  await page.locator("#cc-number").fill("4242 4242 4242 4242");
  await page.locator("#cc-name").fill("AISHA KHAN");
  await page.locator("#cc-exp").fill("1229");
  await page.locator("#cc-cvv").fill("123");
  await page.locator("#bill-addr").fill("1 Test Street");
  await page.locator("#bill-city").fill("London");
  await page.locator("#bill-zip").fill("SW1A 1AA");
  await page.getByRole("button", { name: "Pay £721.00" }).click();
  await page.getByText("Securing your fare with the airline").waitFor();
  await page.waitForURL(/\/checkout\/confirmation\/CF-\d{6}/, { timeout: 20000 });
  reference = page.url().split("/").pop();
  await page.getByRole("heading", { name: "Booking confirmed" }).waitFor();
  assert(await page.getByText(reference, { exact: true }).first().isVisible(), "reference");
  assert(await page.getByText("£721.00").first().isVisible(), "total paid");
  assert(await page.getByText(/^176-\d{10}$/).first().isVisible(), "ticket number");
  const drafts = await page.evaluate(() => JSON.parse(localStorage.getItem("cf.drafts")).state.flight);
  assert(drafts === null, "draft not cleared");
  await shot("confirmation");
});

await check("Confirmation: email confirmation logs a simulated email", async () => {
  await page.getByRole("button", { name: "Email confirmation" }).click();
  await page.getByText(/Confirmation sent to test.traveller@example.com/).waitFor();
  assert(await page.getByText(/Booking confirmation \(resent\)/).isVisible(), "email log");
});

await check("E-ticket document renders passenger, ticket and Print button", async () => {
  await go(`/documents/eticket/${reference}`);
  await page.getByText("Electronic ticket · itinerary / receipt").waitFor();
  assert(await page.getByText("KHAN / AISHA", { exact: false }).isVisible(), "passenger");
  assert(await page.getByRole("button", { name: "Print / Save as PDF" }).isVisible(), "print");
  assert(await page.getByText("Seat 35A").isVisible(), "seat on ticket");
  await shot("eticket");
});

await check("Invoice document lists lines and total £721.00", async () => {
  await go(`/documents/invoice/${reference}`);
  await page.getByText("Tax invoice").waitFor();
  assert(await page.getByText("£721.00").isVisible(), "invoice total");
  assert(await page.getByText("Extra baggage").isVisible(), "bag line");
  await shot("invoice");
});

await check("Fare link opened without a draft says the fare is no longer available", async () => {
  const other = await browser.newPage();
  await other.goto(`${BASE}/flights/fare/EK37-whatever`, { waitUntil: "load" });
  await other.getByText("This fare is no longer available").waitFor();
  await other.goto(`${BASE}/checkout/processing`, { waitUntil: "load" });
  await other.waitForURL(`${BASE}/`);
  await other.close();
});

await check("No uncaught page errors", async () => {
  assert(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
fs.writeFileSync(path.join(OUT, "task2-console-errors.txt"), errorLog.join("\n\n"));
console.table(results);
const failed = results.filter((r) => r.result === "FAIL").length;
console.log(`${results.length - failed}/${results.length} passed${reference ? ` · booking ${reference}` : ""}`);
process.exit(failed ? 1 : 0);

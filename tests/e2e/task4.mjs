// Functional test for Task 4 (accounts, manage booking, request wizards, account area) against a running build.
// Replays the recorded flows from archive/flows/{misc-auth,postbooking,mb-requests,misc-account}.
// Usage: node tests/e2e/task4.mjs [baseUrl]
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
    await page.screenshot({ path: path.join(OUT, `task4-fail-${results.length}.png`), fullPage: true }).catch(() => {});
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
// Playwright's screenshot injects `caret-color: transparent`, which React reports as a hydration mismatch.
page.on("console", (m) => m.type() === "error" && !/404|Failed to load resource/.test(m.text()) && !/caret-color/.test(m.text()) && errors.push(m.text()));
const go = async (p) => {
  await page.goto(BASE + p, { waitUntil: "load" });
  await page.waitForTimeout(600);
};
const shot = (name) => page.screenshot({ path: path.join(OUT, `task4-${name}.png`), fullPage: true });
const text = (t) => page.getByText(t, { exact: false }).first();
const visible = async (t, msg) => assert(await text(t).isVisible(), msg ?? `missing: ${t}`);
const storage = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null")?.state, key);
/** Signs out like the app does: clears user, profile and OTP but keeps registered credentials. */
const signOutAll = () =>
  page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("cf.session") ?? "null");
    if (!raw) return;
    Object.assign(raw.state, { user: null, profile: null, otp: null });
    localStorage.setItem("cf.session", JSON.stringify(raw));
  });

const NEW_USER = { first: "Aisha", last: "Khan", email: "test.traveller@example.com", mobile: "7700900456", password: "Travel2026" };

// ---- Auth ----

await check("Sign-in: empty submit shows field errors", async () => {
  await go("/sign-in");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await visible("Enter your email address");
  await visible("Enter your password");
  await visible("Your trips, in one place");
  await shot("signin-validation");
});

await check("Sign-in: unknown email shows the original error", async () => {
  await go("/sign-in");
  await page.locator("#si-email").fill("nobody@example.com");
  await page.locator("#si-pass").fill("whatever1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await text("We couldn't sign you in").waitFor({ timeout: 5000 });
  await visible("We couldn't find an account with that email. Check the address or create an account.");
});

await check("Sign-up: empty submit shows field errors and terms error", async () => {
  await go("/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();
  for (const t of ["Enter your first name", "Enter your last name", "Enter a valid mobile number", "You need to accept the terms to create an account"]) await visible(t);
  await shot("signup-validation");
});

await check("Sign-up → verify: demo inbox shows the code, entering it signs in and lands on /account", async () => {
  await go("/sign-up");
  await page.locator("#su-first").fill(NEW_USER.first);
  await page.locator("#su-last").fill(NEW_USER.last);
  await page.locator("#su-email").fill(NEW_USER.email);
  await page.locator("#su-mobile").fill(NEW_USER.mobile);
  await page.locator("#su-pass").fill(NEW_USER.password);
  await page.getByText("I agree to the").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/verify\?email=test\.traveller%40example\.com/, { timeout: 8000 });
  await visible("Demo inbox");
  const code = (await page.locator("b.font-mono").innerText()).trim();
  assert(/^\d{6}$/.test(code), `code not shown: ${code}`);
  await visible(NEW_USER.email);
  await shot("verify");
  await page.getByLabel("Digit 1").click();
  await page.keyboard.type(code);
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page.waitForURL(/\/account$/, { timeout: 8000 });
  const s = await storage("cf.session");
  assert(s.user?.email === NEW_USER.email && s.user.verified, "session not verified");
});

await check("Verify: pasting the code fills all boxes and submits", async () => {
  await signOutAll();
  await go("/sign-in");
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("cf.session"));
    raw.state.otp = { purpose: "signup", email: "x@example.com", code: "123456", createdAt: new Date().toISOString() };
    localStorage.setItem("cf.session", JSON.stringify(raw));
  });
  await go("/verify?email=x%40example.com");
  await page.getByLabel("Digit 1").focus();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text", "987654");
    document.activeElement.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
  });
  assert((await page.getByLabel("Digit 6").inputValue()) === "4", "paste did not fill boxes");
  await text("That code isn't right").waitFor({ timeout: 5000 });
});

await check("Verify: wrong code shows an error", async () => {
  await signOutAll();
  await go("/sign-in");
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("cf.session"));
    raw.state.otp = { purpose: "signup", email: "x@example.com", code: "123456", createdAt: new Date().toISOString() };
    localStorage.setItem("cf.session", JSON.stringify(raw));
  });
  await go("/verify?email=x%40example.com");
  await page.getByLabel("Digit 1").click();
  await page.keyboard.type("000000");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await text("That code isn't right").waitFor({ timeout: 5000 });
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("cf.session"));
    raw.state.otp = null;
    localStorage.setItem("cf.session", JSON.stringify(raw));
  });
});

await check("Sign-in: registered user with wrong password, then right password honours ?next=", async () => {
  await signOutAll();
  await go("/sign-in?next=/manage-booking");
  await page.locator("#si-email").fill(NEW_USER.email);
  await page.locator("#si-pass").fill("Wrong1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await text("That password doesn't match").waitFor({ timeout: 5000 });
  await page.locator("#si-pass").fill(NEW_USER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/manage-booking$/, { timeout: 8000 });
  await text("Welcome back, Aisha").waitFor({ timeout: 3000 });
});

await check("Sign-in: an external ?next= is ignored", async () => {
  await signOutAll();
  await go("/sign-in?next=//evil.example");
  await page.locator("#si-email").fill(NEW_USER.email);
  await page.locator("#si-pass").fill(NEW_USER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/account$/, { timeout: 8000 });
});

await check("Forgot → reset: demo inbox link opens reset form, new password works", async () => {
  await signOutAll();
  await go("/forgot-password");
  await page.locator("#fp-email").fill(NEW_USER.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await text("Check your inbox").waitFor({ timeout: 5000 });
  await shot("forgot-sent");
  await page.getByRole("link", { name: "Open reset link" }).click();
  await page.waitForURL(/\/reset-password\?email=/);
  await page.locator("#rp-pass").fill("Newpass2026");
  await page.locator("#rp-confirm").fill("Different1");
  await page.getByRole("button", { name: "Update password" }).click();
  await visible("Passwords don't match");
  await page.locator("#rp-confirm").fill("Newpass2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await text("Password updated").waitFor({ timeout: 5000 });
  const s = await storage("cf.session");
  assert(s.credentials.find((c) => c.email === NEW_USER.email)?.password === "Newpass2026", "password not stored");
  NEW_USER.password = "Newpass2026";
});

await check("Forgot: unknown email says no link would be sent", async () => {
  await go("/forgot-password");
  await page.locator("#fp-email").fill("ghost@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await text("No account exists for that address").waitFor({ timeout: 5000 });
  assert(!(await page.getByRole("link", { name: "Open reset link" }).count()), "reset link shown for unknown email");
});

await check("Reset: link without an email is invalid", async () => {
  await go("/reset-password?token=abc");
  await visible("This reset link isn't valid");
});

// ---- Manage booking lookup ----

let demoRef = null;
await check("Demo sign-in seeds bookings", async () => {
  await signOutAll();
  await go("/sign-in");
  await page.locator("#si-email").fill("demo@cheaperfly.com");
  await page.locator("#si-pass").fill("Demo@1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/account$/, { timeout: 8000 });
  const b = await storage("cf.bookings");
  assert(b.bookings.length >= 3, `only ${b.bookings.length} bookings seeded`);
  demoRef = b.bookings.find((x) => x.product === "flight").id;
});

await check("Lookup: validation, not-found, wrong surname and found", async () => {
  await signOutAll();
  await go("/manage-booking");
  await page.getByRole("button", { name: "Find my booking" }).click();
  await visible("Enter your booking reference, e.g. CF-847291");
  await visible("Enter the last name on the booking");
  await page.locator("#lk-ref").fill("CF-000001");
  await page.locator("#lk-last").fill("Nobody");
  await page.getByRole("button", { name: "Find my booking" }).click();
  await text("We couldn't find a booking with those details").waitFor({ timeout: 5000 });
  await shot("lookup-notfound");
  await page.locator("#lk-ref").fill(demoRef);
  await page.getByRole("button", { name: "Find my booking" }).click();
  await text("The last name doesn't match that booking").waitFor({ timeout: 5000 });
  await page.locator("#lk-last").fill("khan");
  await page.getByRole("button", { name: "Find my booking" }).click();
  await page.waitForURL(new RegExp(`/manage-booking/${demoRef}$`), { timeout: 8000 });
  const b = await storage("cf.bookings");
  assert(b.guestRefs.includes(demoRef), "guest access not granted");
});

// ---- Booking detail, manage tabs and request wizard (archived booking CF-056587, £721) ----

const ARCHIVE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../archive");
/** Replaces this browser's localStorage with a recorded flow step's snapshot. */
async function loadSnapshot(step) {
  const { local } = JSON.parse(fs.readFileSync(path.join(ARCHIVE, "flows", `${step}.storage.json`), "utf8"));
  if (!page.url().startsWith(BASE)) await go("/");
  await page.evaluate((kv) => {
    localStorage.clear();
    for (const [k, v] of kv) localStorage.setItem(k, v);
  }, Object.entries(local).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
}
const REF = "CF-056587";
const wizard = (type) => go(`/manage-booking/${REF}/cancel?type=${type}`);
const button = (name) => page.getByRole("button", { name, exact: true });

await check("Detail: header, references and manage actions match the recording", async () => {
  await loadSnapshot("mb-requests/00-start");
  await go(`/manage-booking/${REF}`);
  for (const t of ["London ⇄ Dubai", "Booked 26 Sep 2026, 00:04 · 1 traveller", "Ticketed", "£721.00", "A5ZMX4", "176-8333758147"]) await visible(t);
  for (const l of ["Request change", "Request cancellation", "Request refund"]) assert(await page.getByRole("link", { name: l }).isVisible(), l);
  assert((await page.getByRole("link", { name: "Request change" }).getAttribute("href")) === `/manage-booking/${REF}/manage?tab=change`, "change link");
});

await check("Wizard: cancellation validates each step and submits RF-##### with a £562.00 estimate", async () => {
  await loadSnapshot("mb-requests/00-start");
  await wizard("cancellation");
  await page.getByRole("heading", { name: "Request cancellation" }).waitFor();
  await page.getByText("Ms Aisha Khan").click();
  await button("Continue").click();
  await visible("Select at least one passenger.");
  await page.getByText("Ms Aisha Khan").click();
  await button("Continue").click();
  await button("Review request").click();
  await visible("Choose a reason");
  await visible("Please explain in at least 15 characters");
  await page.locator("#rf-reason").selectOption("Change of plans");
  await page.locator("#rf-expl").fill("Test request created while archiving the prototype.");
  await button("Review request").click();
  for (const t of ["Paid for selected passengers", "£712.00", "−£130.00", "−£20.00", "Your fare is refundable subject to the airline's cancellation fee"]) await visible(t);
  await button("Submit cancellation request").click();
  await visible("Please confirm you understand the conditions.");
  await page.getByText("I understand this is a request").click();
  await button("Submit cancellation request").click();
  await text("Your cancellation request is submitted").waitFor({ timeout: 5000 });
  assert(/Case reference RF-\d{5}/.test(await page.locator("main").innerText()), "no RF case ref");
  await visible("£562.00");
  const acc = await storage("cf.account");
  assert(acc.requests.some((r) => r.kind === "cancellation" && r.bookingId === REF), "request not stored");
  assert((await storage("cf.bookings")).bookings[0].status === "cancellation_requested", "booking status");
});

await check("Wizard: ?type=change runs as a cancellation (original behaviour)", async () => {
  await loadSnapshot("mb-requests/00-start");
  await wizard("change");
  await page.getByRole("heading", { name: "Request cancellation" }).waitFor();
  await visible("Who is this cancellation for?");
});

await check("Wizard: refund request lands on the same £562.00 estimate", async () => {
  await loadSnapshot("mb-requests/00-start");
  await wizard("refund");
  await page.getByRole("heading", { name: "Request a refund" }).waitFor();
  await button("Continue").click();
  await page.locator("#rf-reason").selectOption("Change of plans");
  await page.locator("#rf-expl").fill("Test request created while archiving the prototype.");
  await button("Review request").click();
  await page.getByText("I understand this is a request").click();
  await button("Submit refund request").click();
  await text("Your refund request is submitted").waitFor({ timeout: 5000 });
  await visible("£562.00");
});

await check("Detail: open requests show as notices after submitting", async () => {
  await loadSnapshot("mb-requests/04-detail-after");
  await go(`/manage-booking/${REF}`);
  for (const t of ["Cancellation request RF-27103 · submitted", "Refund request RF-53415 · submitted", "We'll email you as it progresses."]) await visible(t);
});

await check("Manage: contact save is disabled until edited, then updates the booking", async () => {
  await loadSnapshot("mb-requests/00-start");
  await go(`/manage-booking/${REF}/manage`);
  const save = button("Save contact details");
  assert(await save.isDisabled(), "save enabled before edit");
  await page.locator("#mg-mobile").fill("7700900999");
  await save.click();
  await text("Contact details updated").waitFor({ timeout: 3000 });
  assert((await storage("cf.bookings")).bookings[0].contact.mobile === "7700900999", "contact not saved");
});

await check("Manage: meals, baggage (charged via dialog) and seat map tabs", async () => {
  await page.getByRole("tab", { name: "Meals" }).click();
  await page.getByRole("radiogroup").first().getByRole("radio", { name: "Vegetarian" }).click();
  await button("Save meal changes").click();
  await text("Meal preferences saved").waitFor({ timeout: 3000 });
  await page.getByRole("tab", { name: "Baggage" }).click();
  await visible("Included: 1 × 30 kg checked");
  await page.getByRole("radiogroup").nth(1).getByRole("radio").nth(1).click();
  await visible("Additional charge:");
  await button("Review & pay").click();
  await page.getByRole("dialog", { name: "Confirm baggage update" }).waitFor();
  await visible("to Visa ending 4242.");
  await button("Confirm & pay").click();
  await text("Baggage added.").waitFor({ timeout: 3000 });
  await page.getByRole("tab", { name: "Seats" }).click();
  await page.getByRole("tab", { name: /LHR → DXB/ }).waitFor();
  await text("Front of aircraft").waitFor({ timeout: 5000 });
  await shot("manage-seats");
});

await check("Manage: ?tab=change opens the change request form, which validates and submits", async () => {
  await loadSnapshot("mb-requests/00-start");
  await go(`/manage-booking/${REF}/manage?tab=change`);
  await button("Submit change request").click();
  await visible("Choose what you'd like to change");
  await visible("Tell us a little more (at least 10 characters)");
  await page.locator("#ch-reason").selectOption("Change travel dates");
  await page.locator("#ch-notes").fill("Please move the return to the 25th.");
  await button("Submit change request").click();
  await text("Change request submitted").waitFor({ timeout: 5000 });
  assert(/Your case reference is \w+-\d{5}/.test(await page.locator("main").innerText()), "no change ref");
  assert((await storage("cf.account")).requests.some((r) => r.kind === "change"), "change request not stored");
});

await check("Access: a booking this browser hasn't unlocked is refused", async () => {
  await loadSnapshot("mb-requests/00-start");
  await page.evaluate(() => {
    const b = JSON.parse(localStorage.getItem("cf.bookings"));
    b.state.guestRefs = [];
    localStorage.setItem("cf.bookings", JSON.stringify(b));
    const s = JSON.parse(localStorage.getItem("cf.session"));
    s.state.user = null;
    localStorage.setItem("cf.session", JSON.stringify(s));
  });
  await go(`/manage-booking/${REF}`);
  await visible("We couldn't open this booking");
  await go("/manage-booking/CF-999999");
  await visible("Booking not found");
});

await check("Closed booking: manage page blocks changes", async () => {
  await signOutAll();
  await go("/sign-in");
  await page.locator("#si-email").fill("demo@cheaperfly.com");
  await page.locator("#si-pass").fill("Demo@1234");
  await button("Sign in").click();
  await page.waitForURL(/\/account$/, { timeout: 8000 });
  const closed = (await storage("cf.bookings")).bookings.find((b) => ["refunded", "completed", "cancelled"].includes(b.status));
  assert(closed, "no closed demo booking");
  await go(`/manage-booking/${closed.id}`);
  await visible("so changes are no longer available.");
  await go(`/manage-booking/${closed.id}/manage`);
  await visible("This booking can no longer be changed");
});

// ---- Account area ----

const account = page.getByRole("navigation", { name: "Account" }).last();

await check("Account: signed-out visitors are sent to sign-in and brought back", async () => {
  await signOutAll();
  await go("/account/travellers");
  await page.waitForURL(/\/sign-in\?next=%2Faccount%2Ftravellers$/, { timeout: 8000 });
  await page.locator("#si-email").fill("demo@cheaperfly.com");
  await page.locator("#si-pass").fill("Demo@1234");
  await button("Sign in").click();
  await page.waitForURL(/\/account\/travellers$/, { timeout: 8000 });
});

await check("Overview: greeting, next journey, quick links and side cards", async () => {
  await go("/account");
  assert(/^Good (morning|afternoon|evening), Amira$/.test(await page.getByRole("heading", { level: 1 }).innerText()), "greeting");
  await visible("Your next journey");
  for (const h of ["Booking status", "Recent activity", "Notifications", "Saved travellers", "Your requests"])
    assert(await page.getByRole("heading", { name: h }).isVisible(), `heading ${h}`);
  for (const l of ["Search flights", "Find a hotel", "Umrah packages", "Find a booking"]) assert(await page.getByRole("link", { name: l }).first().isVisible(), l);
  assert((await account.getByRole("link", { name: "Overview" }).getAttribute("aria-current")) === "page", "nav active state");
  await shot("account-overview");
});

await check("Bookings: tabs, search and a row opening the account booking page", async () => {
  await go("/account/bookings");
  const mine = (await storage("cf.bookings")).bookings.filter((b) => b.userId === "usr_demo");
  const upcoming = page.getByRole("tab", { name: /Upcoming/ });
  assert(/\d/.test(await upcoming.innerText()), "upcoming count");
  await page.locator("#bk-search").fill("zzzz-no-match");
  await visible("No bookings match your search");
  await page.locator("#bk-search").fill("");
  await page.getByRole("tab", { name: /Past/ }).click();
  await page.getByRole("tab", { name: /Cancelled/ }).click();
  await page.getByRole("tab", { name: /Upcoming/ }).click();
  const first = page.getByRole("tabpanel").getByRole("link").first();
  const href = await first.getAttribute("href");
  assert(href?.startsWith("/account/bookings/CF-"), `row href ${href}`);
  await first.click();
  await page.waitForURL(new RegExp(href + "$"));
  await page.getByRole("link", { name: "← My bookings" }).waitFor();
  assert(mine.length >= 3, "demo bookings");
});

await check("Trips: grouped by month with countdowns; past trips toggle", async () => {
  await go("/account/trips");
  await page.getByRole("heading", { name: "My Trips" }).waitFor();
  assert((await page.locator("main section h2").count()) >= 1, "no month groups");
  await visible("In ");
  const toggle = page.getByRole("button", { name: /Show past trips/ });
  await toggle.click();
  assert((await page.getByRole("button", { name: /Hide past trips/ }).getAttribute("aria-expanded")) === "true", "past toggle");
});

await check("Refunds: back-office simulation advances a request and rejecting closes it", async () => {
  await go("/account/refunds");
  const card = page.locator("main li").filter({ has: page.getByRole("button", { name: "Advance to next status" }) }).first();
  const id = (await card.locator("span.font-mono").first().innerText()).trim();
  const statusOf = async () => (await storage("cf.account")).requests.find((r) => r.id === id).status;
  const before = await statusOf();
  await card.getByRole("button", { name: "Advance to next status" }).click();
  await page.waitForTimeout(200);
  const after = await statusOf();
  const FLOW = ["submitted", "under_review", "approved", "processed"];
  assert(FLOW.indexOf(after) === FLOW.indexOf(before) + 1, `${before} → ${after}`);
  const card2 = page.locator("main li").filter({ hasText: id }).first();
  if (after !== "processed") {
    await card2.getByRole("button", { name: "Reject" }).click();
    await page.waitForTimeout(200);
    assert((await statusOf()) === "rejected", "not rejected");
    await card2.getByText("Rejected").first().waitFor();
    assert(!(await card2.getByRole("button", { name: "Reject" }).count()), "controls still shown when closed");
  }
  await page.getByRole("tab", { name: /Changes/ }).click();
});

await check("Travellers: add validates, saves, edits and deletes with confirmation", async () => {
  await go("/account/travellers");
  const before = (await storage("cf.account")).travellers.length;
  await button("Add traveller").click();
  const dialog = page.getByRole("dialog", { name: "Add a traveller" });
  await dialog.getByRole("button", { name: "Save traveller" }).click();
  for (const t of ["Select a title", "Enter first name as shown on the passport", "Enter date of birth", "Select gender", "Select nationality", "Enter expiry date"]) await dialog.getByText(t).first().waitFor();
  await dialog.locator("#tv-title").selectOption("Ms");
  await dialog.locator("#tv-first").fill("Sara");
  await dialog.locator("#tv-last").fill("Malik");
  await dialog.locator("#tv-dob").fill("1995-03-02");
  await dialog.locator("#tv-gender").selectOption("female");
  await dialog.locator("#tv-nat").selectOption("GB");
  await dialog.locator("#tv-pp").fill("123456789");
  await dialog.locator("#tv-ppc").selectOption("GB");
  await dialog.locator("#tv-ppe").fill("2026-12-01");
  await dialog.getByRole("button", { name: "Save traveller" }).click();
  await text("Traveller saved").waitFor({ timeout: 3000 });
  assert((await storage("cf.account")).travellers.length === before + 1, "not added");
  const card = page.locator("main li").filter({ hasText: "Sara" });
  await card.getByText("••••••789").waitFor();
  await card.getByText("Expiring soon").waitFor();
  await card.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog", { name: "Edit traveller" }).locator("#tv-rel").fill("Friend");
  await page.getByRole("button", { name: "Save changes" }).click();
  await text("Traveller updated").waitFor({ timeout: 3000 });
  await card.getByText("adult · Friend").waitFor();
  await card.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this traveller?" }).getByRole("button", { name: "Delete" }).click();
  await text("Traveller deleted").waitFor({ timeout: 3000 });
  assert((await storage("cf.account")).travellers.length === before, "not deleted");
});

await check("Documents: two per booking, filterable", async () => {
  await go("/account/documents");
  const mine = (await storage("cf.bookings")).bookings.filter((b) => b.userId === "usr_demo").length;
  assert((await page.getByRole("link", { name: "View / print" }).count()) === mine * 2, "doc count");
  await page.getByRole("tab", { name: "Invoices" }).click();
  assert((await page.getByRole("link", { name: "View / print" }).count()) === mine, "invoice count");
});

await check("Profile: save is disabled until edited; saving renames the account", async () => {
  await go("/account/profile");
  await visible("All changes saved");
  assert(await button("Save changes").isDisabled(), "enabled before edit");
  await page.locator("#pf-first").fill("Amina");
  await button("Save changes").click();
  await text("Profile saved").waitFor({ timeout: 3000 });
  assert((await storage("cf.session")).user.firstName === "Amina", "user not renamed");
  await page.locator("#pf-first").fill("Amira");
  await button("Save changes").click();
  await text("Profile saved").first().waitFor();
});

await check("Preferences: currency switch applies site-wide; toggles persist", async () => {
  await go("/account/preferences");
  await page.locator("#pr-cur").selectOption("EUR");
  await text("Preferences saved").waitFor({ timeout: 3000 });
  assert((await storage("cf.ui")).currency === "EUR", "ui currency");
  await page.getByRole("switch", { name: "SMS notifications" }).click();
  const prefs = (await storage("cf.session")).preferences;
  assert(prefs.currency === "EUR", "pref currency");
  await page.locator("#pr-cur").selectOption("GBP");
});

await check("Notifications: unread filter, mark all read and delete", async () => {
  await go("/account/notifications");
  const total = (await storage("cf.account")).notifications.length;
  await page.getByRole("tab", { name: /Unread/ }).click();
  await button("Mark all read").click();
  await text("All notifications marked as read").waitFor({ timeout: 3000 });
  await visible("No unread notifications");
  await page.getByRole("tab", { name: /All/ }).click();
  await page.getByRole("button", { name: /^Delete notification/ }).first().click();
  assert((await storage("cf.account")).notifications.length === total - 1, "not deleted");
});

await check("Support: reply to a case gets the simulated acknowledgement", async () => {
  await go("/account/support");
  const caseItem = page.locator("main ul > li").filter({ has: page.locator("button[aria-expanded]") }).first();
  await caseItem.locator("button[aria-expanded]").click();
  const box = caseItem.locator("textarea");
  await box.fill("Any update on this, please?");
  await caseItem.getByRole("button", { name: "Send" }).click();
  await text("Reply added to your case").waitFor({ timeout: 3000 });
  await caseItem.getByText("Automated acknowledgement (prototype)").last().waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: /WhatsApp|Message us/ }).first().click();
  await text("WhatsApp is simulated in this prototype").waitFor({ timeout: 3000 });
});

await check("Account booking: request notices link to refunds; wizard offers 'View my requests'", async () => {
  const req = (await storage("cf.account")).requests[0];
  await go(`/account/bookings/${req.bookingId}`);
  await page.getByRole("link", { name: "View request" }).first().waitFor();
  const open = (await storage("cf.bookings")).bookings.find((b) => b.userId === "usr_demo" && ["confirmed", "ticketed"].includes(b.status));
  await go(`/account/bookings/${open.id}/cancel?type=cancellation`);
  await button("Continue").click();
  await page.locator("#rf-reason").selectOption("Change of plans");
  await page.locator("#rf-expl").fill("Plans changed, need to cancel this one.");
  await button("Review request").click();
  await page.getByText("I understand this is a request").click();
  await button("Submit cancellation request").click();
  await page.getByRole("link", { name: "View my requests" }).waitFor({ timeout: 5000 });
});

// The original lands on sign-in rather than home (archive/flows/misc-account/08-signed-out): the shell's
// signed-out redirect overtakes the push to "/".
await check("Sign out from the sidebar signs out and lands on sign-in, like the original", async () => {
  await go("/account");
  await account.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/sign-in\?next=%2Faccount$/, { timeout: 5000 });
  assert((await storage("cf.session")).user === null, "still signed in");
});

await browser.close();
console.table(results);
if (errors.length) console.log("Page errors:\n" + [...new Set(errors)].join("\n"));
process.exit(results.some((r) => r.result === "FAIL") || errors.length ? 1 : 0);

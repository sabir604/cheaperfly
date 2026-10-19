import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { proxyWebsiteApi } from "@/server/api-transport";
import { API_VERSION, CUSTOMER_COOKIE } from "@cheaperfly/api-contracts";
const customer = {
  id: "customer",
  email: "customer@test.invalid",
  firstName: "Test",
  lastName: "Customer",
  verified: true,
  memberSince: "2026-10-16",
};
const env = {
  NODE_ENV: "production" as const,
  CHEAPERFLY_BACKEND_URL: "http://127.0.0.1:3201",
};
const envelope = (data: unknown) => ({
  data,
  meta: {
    apiVersion: API_VERSION,
    providerMode: "simulated",
    requestId: "test",
  },
});
const request = (
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  headers: HeadersInit = {},
) =>
  new Request(`https://website.test/api/customer/v1/${path}`, {
    method,
    headers: {
      Origin: "https://website.test",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
describe("customer cookie boundary", () => {
  it("overwrites spoofed account redirect headers with the requested deep link", () => {
    const response = proxy(new NextRequest("https://website.test/account/bookings/CF-TEST?tab=details", {
      headers: { "x-cheaperfly-account-path": "https://evil.test" },
    }));
    expect(response.headers.get("x-middleware-request-x-cheaperfly-account-path")).toBe("/account/bookings/CF-TEST?tab=details");
  });
  it("consumes internal tokens into HTTP-only host cookies and validates the outgoing JSON body", async () => {
    const token = "a".repeat(43);
    for (const remember of [true, false]) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            envelope({ customer, expiresAt: "2099-01-01T00:00:00Z", token }),
          ),
        );
      const response = await proxyWebsiteApi(
        request("session", {
          email: customer.email,
          password: "Password123!",
          remember,
        }),
        "customer",
        ["session"],
        { env, fetch: fetcher },
      );
      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie")!;
      expect(cookie).toContain(`${CUSTOMER_COOKIE}=${token}`);
      for (const attribute of ["HttpOnly", "SameSite=Lax", "Path=/", "Secure"])
        expect(cookie).toContain(attribute);
      expect(cookie.includes("Max-Age=")).toBe(remember);
      expect(cookie).not.toContain("Domain=");
      expect(JSON.stringify(await response.json())).not.toContain(token);
      expect(
        JSON.parse(fetcher.mock.calls[0][1]?.body as string).remember,
      ).toBe(remember);
    }
  });
  it("clears the matching cookie after logout, password change and reset", async () => {
    for (const [path, method] of [
      ["session", "DELETE"],
      ["password", "POST"],
      ["password/reset", "POST"],
    ]) {
      const response = await proxyWebsiteApi(
        request(path, method === "POST" ? {} : undefined, method),
        "customer",
        path.split("/"),
        {
          env,
          fetch: vi
            .fn()
            .mockResolvedValue(Response.json(envelope({ accepted: true }))),
        },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    }
  });
  it("rejects malformed bodies, cross-origin mutations and invalid or production demo responses", async () => {
    const fetcher = vi.fn();
    const cross = request("session", {}, "POST", {
      Origin: "https://evil.test",
    });
    expect(
      (
        await proxyWebsiteApi(cross, "customer", ["session"], {
          env,
          fetch: fetcher,
        })
      ).status,
    ).toBe(403);
    const malformed = new Request(
      "https://website.test/api/customer/v1/session",
      {
        method: "POST",
        headers: {
          Origin: "https://website.test",
          "Content-Type": "application/json",
        },
        body: "{",
      },
    );
    expect(
      (
        await proxyWebsiteApi(malformed, "customer", ["session"], {
          env,
          fetch: fetcher,
        })
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    const bad = await proxyWebsiteApi(
      request("session", {}),
      "customer",
      ["session"],
      {
        env,
        fetch: vi
          .fn()
          .mockResolvedValue(
            Response.json(
              envelope({
                customer,
                expiresAt: "2099-01-01T00:00:00Z",
                token: "bad",
              }),
            ),
          ),
      },
    );
    expect(bad.status).toBe(502);
    expect(bad.headers.get("set-cookie")).toBeNull();
    const demo = await proxyWebsiteApi(
      request("registration", {}),
      "customer",
      ["registration"],
      {
        env,
        fetch: vi
          .fn()
          .mockResolvedValue(
            Response.json(
              envelope({
                accepted: true,
                challengeId: "00000000-0000-0000-0000-000000000000",
                demo: {
                  challengeId: "00000000-0000-0000-0000-000000000000",
                  code: "123456",
                },
              }),
            ),
          ),
      },
    );
    expect(demo.status).toBe(502);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  API_VERSION,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_HEADER,
  MAX_JSON_BYTES,
  endpoints,
  failure,
  isFailure,
  resolveEndpoint,
  type Success,
  type Health,
} from "@cheaperfly/api-contracts";
import { bootstrapConfiguration } from "@cheaperfly/api-contracts/defaults";
import { backendConfig } from "@/server/backend-config";
import { buildUpstreamHeaders, proxyWebsiteApi } from "@/server/api-transport";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import { ServiceError } from "@/lib/engine/service";
const env = {
  NODE_ENV: "production" as const,
  CHEAPERFLY_BACKEND_URL: "http://127.0.0.1:3101",
  CHEAPERFLY_API_TIMEOUT_MS: "100",
};
const request = (path = "health", method = "GET", headers: HeadersInit = {}) =>
  new Request(`http://website.example/api/public/v1/${path}`, {
    method,
    headers,
  });
const envelope = (data: unknown) => ({
  data,
  meta: {
    apiVersion: API_VERSION,
    providerMode: "simulated",
    requestId: "backend-test",
  },
});
const healthy = {
  status: "ok",
  database: "sqlite",
  service: "cheaperfly-admin",
};

describe("website API boundary", () => {
  it("validates server origins and timeouts without reading public-prefixed variables", () => {
    expect(backendConfig(env)).toEqual({
      origin: "http://127.0.0.1:3101",
      timeoutMs: 100,
    });
    for (const url of [
      "https://user:pass@example.test",
      "https://example.test/api",
      "https://example.test/?x=y",
      "http://external.example",
      "file:///tmp/a",
      "https://example.test/#fragment",
    ])
      expect(() =>
        backendConfig({ ...env, CHEAPERFLY_BACKEND_URL: url }),
      ).toThrow();
    expect(() => backendConfig({ NODE_ENV: "production" })).toThrow();
    expect(() =>
      backendConfig({ ...env, CHEAPERFLY_API_TIMEOUT_MS: "NaN" }),
    ).toThrow();
    expect(() => backendConfig({ NODE_ENV: "development" })).toThrow();
  });
  it("resolves active operations and exact actions before ID templates", async () => {
    expect(endpoints.filter((e) => e.active && e.scope === "public").map((e) => e.path)).toEqual([
      "health",
      "configuration",
      "flights/airports",
      "flights/previews",
      "flights/search",
      "flights/quotes",
      "flights/seat-maps",
      "flights/revalidate",
      "hotels/search",
      "hotels/availability",
      "hotels/previews",
      "hotels/quotes",
      "hotels/:id",
      "umrah/packages",
      "umrah/packages/:id",
      "umrah/search",
      "umrah/configurations",
      "umrah/travellers",
      "umrah/quotes",
      "inquiries",
      "newsletter",
      "guest-access",
      "support/:id",
      "bookings/:id/contact",
      "bookings/:id/stay",
      "requests",
      "support",
      "support/:id/messages",
      "bookings/:id",
      "bookings/:id/documents/:kind",
      "payment-tokens",
      "checkouts/confirmation/:reference",
      "checkouts/:id/resume",
      "checkouts",
      "checkouts/:id",
    ]);
    expect(
      resolveEndpoint("customer", "notifications/read-all")?.methods,
    ).toEqual(["POST"]);
    const fetcher = vi.fn();
    expect(
      (
        await proxyWebsiteApi(
          request("../../auth/me"),
          "public",
          ["..", "..", "auth", "me"],
          { env, fetch: fetcher },
        )
      ).status,
    ).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects wrong methods, origins and unexpected queries before forwarding", async () => {
    const fetcher = vi.fn();
    expect(
      (
        await proxyWebsiteApi(request("health", "POST"), "public", ["health"], {
          env,
          fetch: fetcher,
        })
      ).status,
    ).toBe(405);
    expect(
      (
        await proxyWebsiteApi(
          request("inquiries", "POST", { Origin: "https://evil.example" }),
          "public",
          ["inquiries"],
          { env, fetch: fetcher },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await proxyWebsiteApi(
          request("health?url=https://evil.example"),
          "public",
          ["health"],
          { env, fetch: fetcher },
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards only the distinct customer cookie on customer routes, never staff credentials", () => {
    const token = "c".repeat(43);
    const req = request("health", "GET", {
      Cookie: `cheaperfly_session=${"s".repeat(43)}; ${CUSTOMER_COOKIE}=${token}`,
      Authorization: "Bearer staff-secret",
      "X-Forwarded-Host": "evil.example",
      "X-Cheaperfly-Customer-Session": "injected",
    });
    const customer = buildUpstreamHeaders(req, "customer", "request-test");
    expect([...customer.keys()].sort()).toEqual(
      ["accept", CUSTOMER_SESSION_HEADER, "x-request-id"].sort(),
    );
    expect(customer.get(CUSTOMER_SESSION_HEADER)).toBe(token);
    expect(
      buildUpstreamHeaders(req, "public", "request-test").has(
        CUSTOMER_SESSION_HEADER,
      ),
    ).toBe(false);
    expect(
      buildUpstreamHeaders(
        request("health", "GET", {
          Cookie: `${CUSTOMER_COOKIE}=invalid-token`,
        }),
        "customer",
        "request-test",
      ).has(CUSTOMER_SESSION_HEADER),
    ).toBe(false);
  });
  it("round trips health/configuration and discards backend cookies and extra envelope fields", async () => {
    for (const [path, data] of [
      ["health", healthy],
      ["configuration", bootstrapConfiguration],
    ] as const) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { ...envelope(data), access_token: "must-not-leak" },
            {
              headers: { "Set-Cookie": "cheaperfly_session=must-not-forward" },
            },
          ),
        );
      const response = await proxyWebsiteApi(
        request(path, "GET", {
          Authorization: "Bearer staff-secret",
          Cookie: "cheaperfly_session=staff-secret",
        }),
        "public",
        [path],
        { env, fetch: fetcher },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.has("set-cookie")).toBe(false);
      const result = await response.json();
      expect(result.data).toEqual(data);
      expect(result.access_token).toBeUndefined();
      const [target, options] = fetcher.mock.calls[0];
      expect(target).toBe(
        `http://127.0.0.1:3101/api/website/v1/public/${path}`,
      );
      expect(new Headers(options?.headers).has("authorization")).toBe(false);
      expect(new Headers(options?.headers).has("cookie")).toBe(false);
      expect(options?.redirect).toBe("manual");
      expect(options?.cache).toBe("no-store");
    }
  });
  it("fails closed on redirects, invalid/oversized JSON and incompatible contracts", async () => {
    const responses = [
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.example" },
      }),
      new Response("<html>private stack</html>", { status: 500 }),
      Response.json({ data: healthy }),
      Response.json(envelope({ ...healthy, token: "private" })),
      new Response("x".repeat(MAX_JSON_BYTES + 1), {
        headers: { "Content-Type": "application/json" },
      }),
    ];
    for (const upstream of responses) {
      const response = await proxyWebsiteApi(request(), "public", ["health"], {
        env,
        fetch: vi.fn().mockResolvedValue(upstream),
      });
      expect(response.status).toBe(502);
      expect(JSON.stringify(await response.json())).not.toContain("private");
    }
  });
  it("normalizes auth/validation errors without exposing backend exception text", async () => {
    for (const [code, status] of [
      ["unauthenticated", 401],
      ["forbidden", 403],
      ["validation_error", 422],
    ] as const) {
      const payload = failure(
        code,
        "backend-request",
        code === "validation_error"
          ? { email: ["Enter a valid email."] }
          : undefined,
      );
      payload.error.message = "Sensitive backend SQL detail";
      const response = await proxyWebsiteApi(request(), "public", ["health"], {
        env,
        fetch: vi.fn().mockResolvedValue(Response.json(payload, { status })),
      });
      expect(response.status).toBe(status);
      const result = await response.json();
      expect(isFailure(result)).toBe(true);
      expect(result.error.message).not.toContain("SQL");
      expect(result.error.fields).toEqual(payload.error.fields);
    }
  });
  it("returns bounded timeout/unavailable errors and prevents recursive proxy URLs", async () => {
    const delayed: typeof fetch = (_input, options) =>
      new Promise((_, reject) =>
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        ),
      );
    expect(
      (
        await proxyWebsiteApi(request(), "public", ["health"], {
          env,
          fetch: delayed,
        })
      ).status,
    ).toBe(504);
    expect(
      (
        await proxyWebsiteApi(request(), "public", ["health"], {
          env,
          fetch: vi
            .fn()
            .mockRejectedValue(new Error("socket with credentials")),
        })
      ).status,
    ).toBe(503);
    expect(
      (
        await proxyWebsiteApi(new Request("https://website.example/api/public/v1/health"), "public", ["health"], {
          env: { ...env, CHEAPERFLY_BACKEND_URL: "https://website.example" },
        })
      ).status,
    ).toBe(503);
  });
  it("client errors fit the existing ServiceError presentation and never send Authorization", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(envelope(healthy)));
    const result = await apiRequest<Health>(
      "public",
      "health",
      { headers: { Authorization: "Bearer private" } },
      fetcher,
    );
    expect(result.data).toEqual(healthy);
    expect(
      new Headers(fetcher.mock.calls[0][1]?.headers).has("authorization"),
    ).toBe(false);
    const failed = apiRequest(
      "public",
      "health",
      {},
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            failure("validation_error", "request-test", {
              email: ["Invalid email."],
            }),
            { status: 422 },
          ),
        ),
    );
    await expect(failed).rejects.toBeInstanceOf(ServiceError);
    await expect(failed).rejects.toMatchObject({
      status: 422,
      fields: { email: ["Invalid email."] },
    });
    const error = new ApiClientError(401, "unauthenticated", "request-test");
    expect(error.message).toBe("Please sign in to continue.");
    const typed: Success<Health> = result;
    expect(typed.meta.apiVersion).toBe(API_VERSION);
  });
});

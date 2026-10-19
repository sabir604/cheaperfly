import { validServicingData } from "@cheaperfly/api-contracts/servicing";
import { BOOKING_GRANT_COOKIE, BOOKING_GRANT_HEADER, validBookingData } from "@cheaperfly/api-contracts/bookings";
import { validCheckoutData } from "@cheaperfly/api-contracts/checkout";
import { GUEST_COOKIE, GUEST_SESSION_HEADER } from "@cheaperfly/api-contracts/flights";
import "server-only";
import { randomUUID } from "node:crypto";
import {
  API_VERSION,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_HEADER,
  WireError,
  checkOrigin,
  failure,
  isFailure,
  isMeta,
  isPublicData,
  accountQuery,
  validAccountData,
  isPagination,
  isRecord,
  customerSessionPolicy,
  readJson,
  resolveEndpoint,
  responseHeaders,
  requestOrigin,
  type ErrorCode,
  type Scope,
} from "@cheaperfly/api-contracts";
import { backendConfig } from "./backend-config";
import { backendApiUrl } from "@/config/URL_Config";

type Dependencies = { fetch?: typeof fetch; env?: NodeJS.ProcessEnv };
export async function proxyWebsiteApi(
  request: Request,
  scope: Scope,
  segments: string[],
  dependencies: Dependencies = {},
) {
  const requestId = randomUUID();
  const headers = { ...responseHeaders, "X-Request-ID": requestId };
  const error = (
    code: ErrorCode,
    status: number,
    fields?: Record<string, string[]>,
  ) => Response.json(failure(code, requestId, fields), { status, headers });
  const path = segments.join("/");
  const endpoint = resolveEndpoint(scope, path);
  if (!endpoint) return error("not_found", 404);
  if (!endpoint.methods.some((method) => method === request.method))
    return Response.json(failure("method_not_allowed", requestId), {
      status: 405,
      headers: { ...headers, Allow: endpoint.methods.join(", ") },
    });
  try {
    checkOrigin(request);
    if (!endpoint.active) return error("not_implemented", 501);
    let query: string;
    try { query = accountQuery(scope, path, request.method, new URL(request.url).search); } catch { return error("invalid_request",400); }
    const config = backendConfig(dependencies.env);
    if (config.origin === requestOrigin(request))
      throw new WireError("service_unavailable", 503);
    const outgoingHeaders = buildUpstreamHeaders(request, scope, requestId, [8,9,10,11,12,13].includes(endpoint.step));
    let body: string | undefined;
    let remember = true;
    if (["POST", "PATCH", "PUT"].includes(request.method)) {
      const input = await readJson(request);
      remember = !(isRecord(input) && input.remember === false);
      body = JSON.stringify(input);
      outgoingHeaders.set("Content-Type", "application/json");
    }
    const abort = new AbortController();
    const cancelled = () => abort.abort();
    request.signal.addEventListener("abort", cancelled, { once: true });
    if (request.signal.aborted) abort.abort();
    const timer = setTimeout(() => abort.abort(), config.timeoutMs);
    try {
      const response = await (dependencies.fetch ?? fetch)(
        backendApiUrl(config.origin, scope, path, query),
        {
          method: request.method,
          headers: outgoingHeaders,
          body,
          cache: "no-store",
          redirect: "manual",
          signal: abort.signal,
        },
      );
      if (response.status >= 300 && response.status < 400)
        return error("upstream_error", 502);
      let result: unknown;
      try {
        result = await readJson(response);
      } catch (error) {
        if (error instanceof WireError)
          throw new WireError("upstream_error", 502);
        throw error;
      }
      if (!response.ok) {
        if (
          isFailure(result) &&
          [400, 401, 403, 404, 405, 409, 413, 415, 422, 429, 501, 503, 504].includes(
            response.status,
          )
        ) {
          const rejected = error(
            result.error.code,
            response.status,
            result.error.fields,
          );
          if (
            scope === "customer" &&
            path === "session" &&
            request.method === "DELETE" &&
            response.status === 401
          )
            rejected.headers.set(
              "Set-Cookie",
              sessionCookie(request, "", true),
            );
          return rejected;
        }
        return error("upstream_error", 502);
      }
      const data = (result as { data?: unknown })?.data;
      if (
        !isMeta((result as { meta?: unknown })?.meta) ||
        !(endpoint.step === 13 ? validServicingData(path,data) : scope === "public"
          ? isPublicData(path, data)
          : endpoint.step === 12 ? validBookingData(path,data) : endpoint.step === 11 ? validCheckoutData(path,data) : endpoint.step === 6 ? validAccountData(path, request.method, data) : validCustomerData(path, request.method, data))
      )
        return error("upstream_error", 502);
      if (
        scope === "customer" &&
        isRecord(data) &&
        data.demo !== undefined &&
        (dependencies.env ?? process.env).NODE_ENV === "production"
      )
        return error("upstream_error", 502);
      const paged = request.method === "GET" && scope === "customer" && ["travellers","notifications","bookings","requests","support"].includes(path);
      const pagination = (result as {pagination?:unknown})?.pagination;
      if (paged && (!isPagination(pagination) || !Array.isArray(data) || data.length > Number((pagination as {perPage:number}).perPage))) return error("upstream_error",502);
      const responseHeaders = new Headers(headers);
      let browserData = data;
      const grantToken = (result as {grantToken?:unknown})?.grantToken;
      if (scope === "public" && path === "guest-access") {
        if(typeof grantToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(grantToken)) return error("upstream_error",502);
        responseHeaders.append("Set-Cookie",`${BOOKING_GRANT_COOKIE}=${grantToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
      }
      const guestToken = (result as {guestToken?:unknown})?.guestToken;
      if (scope === "public" && ["flights/search","hotels/search","hotels/availability","umrah/quotes","payment-tokens","support"].includes(path) && guestToken !== undefined) {
        if(typeof guestToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(guestToken)) return error("upstream_error",502);
        responseHeaders.append("Set-Cookie",`${GUEST_COOKIE}=${guestToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
      }
      if (scope === "customer" && isRecord(data)) {
        if (typeof data.token === "string") {
          responseHeaders.set(
            "Set-Cookie",
            sessionCookie(request, data.token, false, remember),
          );
          browserData = { customer: data.customer, expiresAt: data.expiresAt };
        }
        if (
          (path === "session" && request.method === "DELETE") ||
          path === "password" ||
          path === "password/reset"
        )
          responseHeaders.set("Set-Cookie", sessionCookie(request, "", true));
      }
      // Only the agreed envelope is returned, never backend headers, token fields or redirects.
      return Response.json(
        {
          data: browserData,
          ...(paged ? {pagination} : {}),
          meta: {
            apiVersion: API_VERSION,
            providerMode: "simulated",
            requestId,
          },
        },
        { headers: responseHeaders },
      );
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", cancelled);
    }
  } catch (exception) {
    if (exception instanceof WireError)
      return error(exception.code, exception.status);
    if (exception instanceof Error && exception.name === "AbortError")
      return error("timeout", 504);
    return error("service_unavailable", 503);
  }
}

export function buildUpstreamHeaders(
  request: Request,
  scope: Scope,
  requestId: string,
  productSession = false,
) {
  const outgoingHeaders = new Headers({
    Accept: "application/json",
    "X-Request-ID": requestId,
  });
  if(productSession) {
    const grant=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(BOOKING_GRANT_COOKIE+"="))?.slice(BOOKING_GRANT_COOKIE.length+1);
    if(grant && /^[A-Za-z0-9_-]{43}$/.test(grant)) outgoingHeaders.set(BOOKING_GRANT_HEADER,grant);
    const cookie=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(GUEST_COOKIE+"="))?.slice(GUEST_COOKIE.length+1);
    if(cookie && /^[A-Za-z0-9_-]{43}$/.test(cookie)) outgoingHeaders.set(GUEST_SESSION_HEADER,cookie);
  }
  if (scope === "customer" || productSession) {
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(CUSTOMER_COOKIE + "="))
      ?.slice(CUSTOMER_COOKIE.length + 1);
    if (cookie && /^[A-Za-z0-9_-]{40,128}$/.test(cookie))
      outgoingHeaders.set(CUSTOMER_SESSION_HEADER, cookie);
  }
  return outgoingHeaders;
}

function sessionCookie(
  request: Request,
  token: string,
  clear = false,
  remember = true,
) {
  return `${CUSTOMER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${clear || remember ? `; Max-Age=${clear ? 0 : customerSessionPolicy.lifetimeSeconds}` : ""}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
function validCustomerData(
  path: string,
  method: string,
  data: unknown,
): boolean {
  if (!isRecord(data)) return false;
  if (path === "verification" || (path === "session" && method !== "DELETE")) {
    const customer = data.customer;
    const sessionCreated = path === "verification" || method === "POST";
    return (
      Object.keys(data).length === (sessionCreated ? 3 : 2) &&
      isRecord(customer) &&
      Object.keys(customer).length === 6 &&
      ["id", "email", "firstName", "lastName", "memberSince"].every(
        (k) => typeof customer[k] === "string",
      ) &&
      customer.verified === true &&
      typeof data.expiresAt === "string" &&
      Number.isFinite(Date.parse(data.expiresAt)) &&
      (!sessionCreated ||
        (typeof data.token === "string" &&
          /^[A-Za-z0-9_-]{40,128}$/.test(data.token)))
    );
  }
  if (
    data.accepted !== true ||
    Object.keys(data).some(
      (k) => !["accepted", "challengeId", "demo"].includes(k),
    )
  )
    return false;
  const challengePath = [
    "registration",
    "verification/resend",
    "password/reset-request",
  ].includes(path);
  if (
    challengePath &&
    (typeof data.challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/.test(data.challengeId))
  )
    return false;
  if (!challengePath && data.challengeId !== undefined) return false;
  if (data.demo === undefined) return true;
  const demo = data.demo;
  return (
    isRecord(demo) &&
    Object.keys(demo).length === 2 &&
    typeof demo.challengeId === "string" &&
    /^[0-9a-f-]{36}$/.test(demo.challengeId) &&
    (path === "password/reset-request"
      ? typeof demo.token === "string" && /^[A-Za-z0-9_-]{43}$/.test(demo.token)
      : ["registration", "verification/resend"].includes(path) &&
        typeof demo.code === "string" &&
        /^[0-9]{6}$/.test(demo.code))
  );
}

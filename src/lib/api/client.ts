import {
  failure,
  accountQuery,
  isFailure,
  isMeta,
  isRecord,
  readJson,
  resolveEndpoint,
  type ErrorCode,
  type Scope,
  type Success,
} from "@cheaperfly/api-contracts";
import { ServiceError } from "@/lib/engine/service";

/** Compatible with existing ServiceError/InlineNotice consumers; no new visual elements. */
export class ApiClientError extends ServiceError {
  constructor(
    public status: number,
    public apiCode: ErrorCode,
    public requestId: string,
    public fields?: Record<string, string[]>,
  ) {
    super(apiCode, failure(apiCode, requestId).error.message);
  }
}
export async function apiRequest<T>(
  scope: Scope,
  path: string,
  init: RequestInit & { query?: Record<string,string|number> } = {},
  fetcher: typeof fetch = fetch,
): Promise<Success<T>> {
  if (!resolveEndpoint(scope, path))
    throw new ApiClientError(404, "not_found", "");
  const { query, ...options } = init;
  let search = "";
  try { search = accountQuery(scope,path,init.method ?? "GET", query ? "?" + new URLSearchParams(Object.entries(query).map(([k,v])=>[k,String(v)])).toString() : ""); } catch { throw new ApiClientError(400,"invalid_request",""); }
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  // Cookie authentication only; never take a staff bearer token from a caller.
  headers.delete("authorization");
  if (init.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetcher(`/api/${scope}/v1/${path}${search}`, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new ApiClientError(503, "service_unavailable", "");
  }
  let payload: unknown;
  try {
    payload = await readJson(response);
  } catch {
    throw new ApiClientError(
      502,
      "upstream_error",
      response.headers.get("x-request-id") ?? "",
    );
  }
  if (!response.ok) {
    if (isFailure(payload))
      throw new ApiClientError(
        response.status,
        payload.error.code,
        payload.error.requestId,
        payload.error.fields,
      );
    throw new ApiClientError(502, "upstream_error", "");
  }
  if (!isRecord(payload) || !("data" in payload) || !isMeta(payload.meta))
    throw new ApiClientError(502, "upstream_error", "");
  return payload as Success<T>;
}

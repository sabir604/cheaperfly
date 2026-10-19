import "server-only";
import { WireError } from "@cheaperfly/api-contracts";
import { backendBaseUrl } from "@/config/URL_Config";

export function backendConfig(env: NodeJS.ProcessEnv = process.env) {
  const value = backendBaseUrl(env);
  if (!value) throw new WireError("service_unavailable", 503);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WireError("service_unavailable", 503);
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (url.protocol === "http:" && !loopback) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new WireError("service_unavailable", 503);
  const timeoutMs = Number(env.CHEAPERFLY_API_TIMEOUT_MS ?? 8000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new WireError("service_unavailable", 503);
  return { origin: url.origin, timeoutMs };
}

import { proxyWebsiteApi } from "@/server/api-transport";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments: string[] }> };
async function handler(request: Request, context: Context) {
  return proxyWebsiteApi(request, "public", (await context.params).segments);
}
export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
  handler as HEAD,
  handler as OPTIONS,
};

import { NextResponse, type NextRequest } from "next/server";

/** Preserve account deep links for the server layout's authentication redirect. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-cheaperfly-account-path", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/account/:path*"] };

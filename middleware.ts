import { NextResponse, type NextRequest } from "next/server";

import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";
import {
  applyPrivateNoIndex,
  applySiteGate,
} from "@/lib/site-gate/middleware";

export async function middleware(request: NextRequest) {
  const gateResponse = await applySiteGate(request);
  if (gateResponse) return gateResponse;

  let response = NextResponse.next({ request });
  response = applyPrivateNoIndex(response);

  const slug = request.nextUrl.pathname.match(/^\/activities\/([^/]+)$/)?.[1];
  if (!slug) return response;

  const canonicalSlug = canonicalActivitySlug(decodeURIComponent(slug));
  if (canonicalSlug === slug) return response;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/activities/${canonicalSlug}`;
  const redirect = NextResponse.redirect(redirectUrl, 308);
  return applyPrivateNoIndex(redirect);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

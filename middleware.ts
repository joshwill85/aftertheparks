import { NextResponse, type NextRequest } from "next/server";

import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";

export function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const slug = request.nextUrl.pathname.match(/^\/activities\/([^/]+)$/)?.[1];
  if (!slug) return response;

  const canonicalSlug = canonicalActivitySlug(decodeURIComponent(slug));
  if (canonicalSlug === slug) return response;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/activities/${canonicalSlug}`;
  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

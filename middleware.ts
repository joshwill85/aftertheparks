import { NextResponse, type NextRequest } from "next/server";

import { canonicalActivitySlug } from "@/lib/activities/legacySlugs";

export function middleware(request: NextRequest) {
  const slug = request.nextUrl.pathname.match(/^\/activities\/([^/]+)$/)?.[1];
  if (!slug) return NextResponse.next();

  const canonicalSlug = canonicalActivitySlug(decodeURIComponent(slug));
  if (canonicalSlug === slug) return NextResponse.next();

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/activities/${canonicalSlug}`;
  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ["/activities/:slug"],
};

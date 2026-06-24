import { NextResponse, type NextRequest } from "next/server";
import {
  getSiteGatePassword,
  isSitePrivate,
  NOINDEX_HEADERS,
  SITE_GATE_COOKIE_NAME,
} from "@/lib/site-gate/config";
import { isGateExemptPath } from "@/lib/site-gate/paths";
import { isValidGateCookie } from "@/lib/site-gate/token";

function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set(
    "X-Robots-Tag",
    NOINDEX_HEADERS["X-Robots-Tag"]
  );
  return response;
}

function privateSitemapResponse(): NextResponse {
  const body =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
  return withNoIndex(
    new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    })
  );
}

function privateRobotsResponse(): NextResponse {
  const body = ["User-agent: *", "Disallow: /", ""].join("\n");
  return withNoIndex(
    new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

export async function applySiteGate(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!isSitePrivate()) return null;

  const { pathname } = request.nextUrl;

  if (pathname === "/sitemap.xml") return privateSitemapResponse();
  if (pathname === "/robots.txt") return privateRobotsResponse();

  if (isGateExemptPath(pathname)) return null;

  const password = getSiteGatePassword();
  const cookie = request.cookies.get(SITE_GATE_COOKIE_NAME)?.value;
  if (await isValidGateCookie(cookie, password)) return null;

  if (pathname.startsWith("/api/")) {
    return withNoIndex(
      NextResponse.json({ error: "Site gate required" }, { status: 401 })
    );
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = "/site-gate";
  gateUrl.search = "";
  const next = `${pathname}${request.nextUrl.search}`;
  if (next && next !== "/") {
    gateUrl.searchParams.set("next", next);
  }

  return withNoIndex(NextResponse.redirect(gateUrl));
}

export function applyPrivateNoIndex(response: NextResponse): NextResponse {
  if (!isSitePrivate()) return response;
  return withNoIndex(response);
}

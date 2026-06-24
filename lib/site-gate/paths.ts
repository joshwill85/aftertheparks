const STATIC_EXT =
  /\.(png|jpe?g|svg|webp|ico|gif|woff2?|ttf|otf|css|js|map)$/i;

export function isGateExemptPath(pathname: string): boolean {
  if (pathname === "/site-gate") return true;
  if (pathname === "/api/site-gate-login") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (pathname === "/sw.js") return true;
  if (STATIC_EXT.test(pathname)) return true;
  return false;
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next.includes("://")) return "/";
  if (next.startsWith("/site-gate")) return "/";
  if (next.startsWith("/api/site-gate-login")) return "/";
  return next;
}

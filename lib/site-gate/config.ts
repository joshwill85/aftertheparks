export const SITE_GATE_COOKIE_NAME =
  process.env.SITE_GATE_COOKIE_NAME ?? "aftertheparks_site_gate";

export const SITE_GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function isSitePrivate(): boolean {
  const mode = process.env.SITE_VISIBILITY_MODE?.trim().toLowerCase();
  if (mode === "public") return false;
  if (mode === "private") return true;
  return true;
}

export function getSiteGatePassword(): string | undefined {
  const value = process.env.SITE_GATE_PASSWORD?.trim();
  return value || undefined;
}

export const NOINDEX_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

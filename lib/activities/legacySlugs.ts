const LEGACY_ACTIVITY_SLUGS: Record<string, string> = {
  "wellnessscav-engerhunt": "wellness-scavenger-hunt",
  "w-e-l-l-n-e-s-s-s-c-av-e-n-g-e-r-h-u-nt": "wellness-scavenger-hunt",
};

export function canonicalActivitySlug(slug: string): string {
  return LEGACY_ACTIVITY_SLUGS[slug] ?? slug;
}

export function isLegacyActivitySlug(slug: string): boolean {
  return canonicalActivitySlug(slug) !== slug;
}

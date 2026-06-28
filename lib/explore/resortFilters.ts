export function selectedResortSlugs(resort?: string | null): string[] {
  if (!resort) return [];
  return Array.from(
    new Set(
      resort
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean)
    )
  );
}

export function serializeResortSlugs(slugs: readonly string[]): string | undefined {
  const selected = Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)));
  return selected.length > 0 ? selected.join(",") : undefined;
}

export function isResortSelected(resort: string | undefined | null, slug: string): boolean {
  return selectedResortSlugs(resort).includes(slug);
}

export function toggleResortSlug(resort: string | undefined | null, slug: string): string | undefined {
  const selected = selectedResortSlugs(resort);
  return serializeResortSlugs(
    selected.includes(slug)
      ? selected.filter((selectedSlug) => selectedSlug !== slug)
      : [...selected, slug]
  );
}

export function removeResortSlug(resort: string | undefined | null, slug: string): string | undefined {
  return serializeResortSlugs(
    selectedResortSlugs(resort).filter((selectedSlug) => selectedSlug !== slug)
  );
}

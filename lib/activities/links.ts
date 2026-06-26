export function activityDetailHref(
  activitySlug: string,
  resortSlug?: string | null
): string {
  const base = `/activities/${activitySlug}`;
  return resortSlug ? `${base}?resort=${encodeURIComponent(resortSlug)}` : base;
}

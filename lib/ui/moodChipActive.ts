/** Returns true when the current route matches a mood chip's target href. */
export function isMoodChipActive(
  href: string,
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  const target = new URL(href, "https://aftertheparks.local");
  if (target.pathname !== pathname) return false;

  for (const [key, value] of target.searchParams) {
    if (searchParams.get(key) !== value) return false;
  }

  return true;
}

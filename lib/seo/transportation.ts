export const DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT = {
  effectiveDate: "2026-06-28",
  title: "Disney Springs resort transportation access caveat",
  summary:
    "Do not use Disney Springs as a free way to get to Disney resort hotels. Current reporting says Disney Springs buses and boats to resort hotels are being restricted to guests with a Disney Resort hotel stay, resort stay, or a confirmed dining/experience reservation, with verification at Disney Springs.",
} as const;

export function disneySpringsTransportationCaveat(): string {
  return DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary;
}

export function shouldShowDisneySpringsCaveat(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return (
    path.includes("disney-springs") ||
    path.includes("without-park-ticket") ||
    path.includes("resort-hopping") ||
    path.includes("no-ticket")
  );
}

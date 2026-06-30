export const DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT = {
  effectiveDate: "2026-06-28",
  title: "Disney Springs resort transportation access caveat",
  summary:
    "Do not use Disney Springs as a free resort-transfer hub. Disney Springs buses and boats to resort hotels are not a free resort-transfer shortcut. Confirm resort access with a resort stay, dining reservation, or booked experience before you go.",
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

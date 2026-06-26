import type { ActivityOffering } from "@/lib/types/occurrence";

const UNSOURCED_AVAILABILITY_LABELS = new Set([
  "Hours not specified by Disney",
  "Check Disney source for current availability",
]);

export function getPublicOfferingAvailabilityLabel(
  availability: ActivityOffering["availability"]
): string | undefined {
  const label = availability.label?.trim();
  if (!label) return undefined;
  if (availability.hoursState === "source_unspecified") return undefined;
  if (UNSOURCED_AVAILABILITY_LABELS.has(label)) return undefined;
  return label;
}

export function shouldShowOfferingAvailability(
  availability: ActivityOffering["availability"]
): boolean {
  return Boolean(getPublicOfferingAvailabilityLabel(availability));
}

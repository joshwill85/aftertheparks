import titleRepairData from "@/data/quality/activity_title_repairs.json";

interface TitleRepairData {
  knownTitleRepairs: Record<string, string>;
  blockedTitleKeys: string[];
}

const repairs = titleRepairData as TitleRepairData;
const blockedTitleKeys = new Set(repairs.blockedTitleKeys);

export function activityTitleRepairKey(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();
}

export function repairKnownActivityTitle(raw: string): string | null {
  return repairs.knownTitleRepairs[activityTitleRepairKey(raw)] ?? null;
}

export function isBlockedActivityTitle(raw: string): boolean {
  return blockedTitleKeys.has(activityTitleRepairKey(raw));
}

export function isOcrSpacedTitle(raw: string): boolean {
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) return false;

  const alphaTokens = title
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
  if (alphaTokens.length < 4) return false;

  const shortTokens = alphaTokens.filter((token) => token.length <= 2).length;
  return shortTokens / alphaTokens.length >= 0.65;
}

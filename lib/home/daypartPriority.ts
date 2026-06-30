import type { Daypart } from "@/lib/daypart";

export type HomeSectionId =
  | "answer"
  | "freshness"
  | "intent"
  | "tonight"
  | "popular"
  | "resorts"
  | "restDay"
  | "noTicket";

const DAYTIME_ORDER: HomeSectionId[] = [
  "answer",
  "freshness",
  "intent",
  "tonight",
  "popular",
  "resorts",
  "restDay",
  "noTicket",
];

const AFTER_DARK_ORDER: HomeSectionId[] = [
  "tonight",
  "answer",
  "freshness",
  "intent",
  "popular",
  "resorts",
  "restDay",
  "noTicket",
];

export function isAfterDarkHomeDaypart(daypart: Daypart): boolean {
  return daypart === "evening" || daypart === "late";
}

export function homeSectionOrderForDaypart(
  daypart: Daypart,
  hasTonightSection: boolean
): HomeSectionId[] {
  const order = isAfterDarkHomeDaypart(daypart) ? AFTER_DARK_ORDER : DAYTIME_ORDER;
  return hasTonightSection ? order : order.filter((section) => section !== "tonight");
}

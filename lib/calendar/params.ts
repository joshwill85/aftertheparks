import { addOrlandoDays, orlandoDateString } from "@/lib/daypart";
import type { ActivityAreaFilter, Daypart } from "@/lib/types/occurrence";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_DAYPARTS = new Set<Exclude<Daypart, "anytime">>([
  "morning",
  "afternoon",
  "evening",
  "late",
]);
const VALID_AREAS = new Set<ActivityAreaFilter>([
  "magic-kingdom",
  "epcot-boardwalk",
  "skyliner",
  "animal-kingdom",
  "disney-springs",
  "fort-wilderness",
]);

export interface PlanAheadParams {
  start: string;
  end: string;
  selected: string;
  resort?: string;
  category?: string;
  area?: ActivityAreaFilter;
  daypart?: Exclude<Daypart, "anytime">;
}

interface ParseOptions {
  today?: string;
}

function valueFor(
  input: Record<string, string | undefined> | URLSearchParams,
  key: string
): string | undefined {
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  return input[key];
}

function isDateOnly(value?: string): value is string {
  return Boolean(value && DATE_RE.test(value));
}

function cleanOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parsePlanAheadParams(
  input: Record<string, string | undefined> | URLSearchParams,
  options: ParseOptions = {}
): PlanAheadParams {
  const today = isDateOnly(options.today) ? options.today : orlandoDateString();
  const defaultEnd = addOrlandoDays(today, 30);
  const rawStart = valueFor(input, "start");
  const rawEnd = valueFor(input, "end");
  const start = isDateOnly(rawStart) ? rawStart : today;
  const end = isDateOnly(rawEnd) && rawEnd >= start ? rawEnd : defaultEnd;
  const selectedDefault = start > today ? start : today;
  const rawSelected = valueFor(input, "selected");
  const selected =
    isDateOnly(rawSelected) && rawSelected >= start && rawSelected <= end
      ? rawSelected
      : selectedDefault >= start && selectedDefault <= end
        ? selectedDefault
        : start;
  const rawArea = valueFor(input, "area");
  const rawDaypart = valueFor(input, "daypart");

  return {
    start,
    end,
    selected,
    resort: cleanOptional(valueFor(input, "resort")),
    category: cleanOptional(valueFor(input, "category")),
    area: VALID_AREAS.has(rawArea as ActivityAreaFilter)
      ? (rawArea as ActivityAreaFilter)
      : undefined,
    daypart: VALID_DAYPARTS.has(rawDaypart as Exclude<Daypart, "anytime">)
      ? (rawDaypart as Exclude<Daypart, "anytime">)
      : undefined,
  };
}

export function buildPlanAheadHref(input: Partial<PlanAheadParams> = {}): string {
  const params = new URLSearchParams();
  if (input.start) params.set("start", input.start);
  if (input.end) params.set("end", input.end);
  if (input.selected) params.set("selected", input.selected);
  if (input.resort) params.set("resort", input.resort);
  if (input.category) params.set("category", input.category);
  if (input.area) params.set("area", input.area);
  if (input.daypart) params.set("daypart", input.daypart);
  const qs = params.toString();
  return qs ? `/calendar?${qs}` : "/calendar";
}

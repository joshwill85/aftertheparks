import { readFileSync } from "node:fs";

import { mapGoldActivityRowToOccurrences, type GoldActivityRow } from "@/lib/data/goldActivities";
import { toDisplayActivity, type ActivityAnswerState } from "@/lib/displayActivity";
import { activityToEventCard } from "@/lib/events/mapToEventCard";
import type { ActivityOccurrence } from "@/lib/types/occurrence";

interface CoverageIssue {
  field: "what" | "when" | "where" | "cardLocation" | "source";
  state: ActivityAnswerState | "missing" | "stale";
  title: string;
  resort: string;
  category: string;
  sourceUrl: string;
  detail: string;
}

const STALE_RESORT_SOURCE_RE =
  /(?:\/fy26-q[12]\/|_DRAFT|Recreation[-_](?:0126|0326)|(?:0126|0326)(?:_DIGITAL)?\.(?:pdf|jpe?g|png)\b)/i;

function increment(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function representativeOccurrences(rows: GoldActivityRow[]): ActivityOccurrence[] {
  const occurrences = rows.flatMap((row) =>
    mapGoldActivityRowToOccurrences(row, {
      dateRangeDays: 14,
      referenceDate: new Date("2026-06-28T12:00:00-04:00"),
    })
  );
  const representatives = new Map<string, ActivityOccurrence>();

  for (const occurrence of occurrences) {
    const key = `${occurrence.activityCatalogId}:${occurrence.resort.slug}:${occurrence.location.label}`;
    const existing = representatives.get(key);
    if (!existing) {
      representatives.set(key, occurrence);
      continue;
    }
    if (!existing.startDateTime && occurrence.startDateTime) {
      representatives.set(key, occurrence);
    }
  }

  return [...representatives.values()];
}

function issueFor(
  occurrence: ActivityOccurrence,
  field: CoverageIssue["field"],
  state: CoverageIssue["state"],
  detail: string
): CoverageIssue {
  return {
    field,
    state,
    title: occurrence.title,
    resort: occurrence.resort.name,
    category: occurrence.category,
    sourceUrl: occurrence.freshness.sourceUrl,
    detail,
  };
}

export function isStaleResortSourceUrl(sourceUrl: string): boolean {
  return STALE_RESORT_SOURCE_RE.test(sourceUrl);
}

function coverageIssues(occurrence: ActivityOccurrence): CoverageIssue[] {
  const display = toDisplayActivity(occurrence);
  const card = activityToEventCard(occurrence, display);
  const issues: CoverageIssue[] = [];

  if (!display.whatLabel) {
    issues.push(issueFor(occurrence, "what", "missing", "No what label"));
  } else if (display.answerCoverage.what.state === "fallback") {
    issues.push(issueFor(occurrence, "what", "fallback", display.whatLabel));
  }

  if (!display.whenLabel) {
    issues.push(issueFor(occurrence, "when", "missing", "No when label"));
  } else if (display.answerCoverage.when.state === "fallback") {
    issues.push(issueFor(occurrence, "when", "fallback", display.whenLabel));
  }

  if (!display.whereLabel) {
    issues.push(issueFor(occurrence, "where", "missing", "No where label"));
  } else if (display.answerCoverage.where.state === "fallback") {
    issues.push(issueFor(occurrence, "where", "fallback", display.whereLabel));
  }

  if (!card.location) {
    issues.push(issueFor(occurrence, "cardLocation", "missing", "Card location not rendered"));
  }

  if (isStaleResortSourceUrl(occurrence.freshness.sourceUrl || "")) {
    issues.push(
      issueFor(
        occurrence,
        "source",
        "stale",
        "Published activity still references a stale resort schedule source"
      )
    );
  }

  return issues;
}

function main() {
  const failOnIncomplete = process.argv.includes("--fail-on-incomplete");
  const rows = JSON.parse(
    readFileSync("data/processed/activity_gold_v2_preview.json", "utf8")
  ) as GoldActivityRow[];
  const representatives = representativeOccurrences(rows);
  const issues = representatives.flatMap(coverageIssues);
  const byField: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byResort: Record<string, number> = {};
  const bySourceUrl: Record<string, number> = {};

  for (const issue of issues) {
    increment(byField, `${issue.field}:${issue.state}`);
    increment(byCategory, issue.category);
    increment(byResort, issue.resort);
    increment(bySourceUrl, issue.sourceUrl || "unknown");
  }

  const report = {
    passed: issues.every((issue) => issue.state !== "missing" && issue.state !== "stale"),
    representatives: representatives.length,
    issueCount: issues.length,
    byField,
    byCategory,
    byResort,
    bySourceUrl,
    samples: issues.slice(0, 25),
  };

  console.log(JSON.stringify(report, null, 2));

  if (failOnIncomplete && !report.passed) {
    process.exitCode = 1;
  }
}

main();

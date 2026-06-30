import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
import {
  buildMagicCheck,
  type MagicCheckActionLabel,
  type MagicCheckIssue,
} from "@/lib/plan/magicCheck";
import type { PlanItem } from "@/lib/types/occurrence";

function actionHref(label: MagicCheckActionLabel): string {
  if (label === "Find backup") return "/activities?weather=indoor";
  if (label === "Swap this") return "/activities";
  if (label === "Remove one") return "#plan-timeline";
  if (label === "Add travel buffer") return "/calendar";
  return "/calendar";
}

function issueIcon(issue: MagicCheckIssue) {
  if (issue.label === "Outdoor activity may need a backup") return "campfire";
  if (issue.label === "This resort hop may be tight") return "nearby_area";
  if (issue.label === "Reservation required") return "search_offering";
  if (issue.label === "Two activities overlap") return "tonight_nav";
  return "plan_nav";
}

export function PlanMagicCheck({
  items,
  readOnly = false,
}: {
  items: PlanItem[];
  readOnly?: boolean;
}) {
  const check = buildMagicCheck(items);

  return (
    <section
      className={`plan-magic-check plan-magic-check--${check.label
        .toLowerCase()
        .replace(/\s+/g, "-")}`}
      aria-label={check.ariaLabel}
    >
      <div className="plan-magic-check__header">
        <p className="plan-magic-check__eyebrow">Magic Check</p>
        <h2>{check.label}</h2>
        <p>{check.summary}</p>
      </div>

      {check.issues.length > 0 ? (
        <ul className="plan-magic-check__issues">
          {check.issues.map((issue) => (
            <li
              key={`${issue.label}:${issue.itemIds.join("-")}`}
              className={`plan-magic-check__issue plan-magic-check__issue--${issue.severity}`}
            >
              <IconGlyph iconKey={issueIcon(issue)} decorative />
              <span>
                <strong>{issue.label}</strong>
                <small>{issue.detail}</small>
              </span>
              {readOnly ? (
                <span className="plan-magic-check__readonly-action">
                  {issue.actionLabel}
                </span>
              ) : (
                <Link
                  href={actionHref(issue.actionLabel)}
                  className="plan-magic-check__action"
                >
                  {issue.actionLabel}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="plan-magic-check__empty">
          No Magic Check issues found. Still confirm day-of times, access, and
          transportation before you go.
        </p>
      )}
    </section>
  );
}

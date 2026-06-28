import Link from "next/link";
import type { DecisionSummary } from "@/lib/planning/decisionSummary";

export function DecisionSummaryBar({
  summary,
}: {
  summary: DecisionSummary;
}) {
  return (
    <section className="decision-summary" aria-label="Planning shortcuts">
      <div>
        <p className="decision-summary__text">{summary.primaryText}</p>
        <p className="decision-summary__trust">{summary.trustText}</p>
      </div>
      {summary.actions.length > 0 && (
        <div className="decision-summary__actions">
          {summary.actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="decision-summary__chip"
              title={action.explanation}
            >
              <span>{action.label}</span>
              <span>{action.count}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

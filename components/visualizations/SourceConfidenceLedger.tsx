import type { CSSProperties } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import {
  buildSourceConfidenceLedger,
  buildSourceConfidenceSummary,
  type SourceConfidenceLedger as SourceConfidenceLedgerModel,
} from "@/lib/visualizations/sourceConfidence";
import type { ActivityOccurrence, ActivityOffering } from "@/lib/types/occurrence";

type ConfidenceInput = Parameters<typeof buildSourceConfidenceLedger>[0];

function scoreStyle(score: number) {
  return { "--source-confidence-score": `${score}%` } as CSSProperties & {
    "--source-confidence-score": string;
  };
}

function toneLabel(tone: SourceConfidenceLedgerModel["tone"]) {
  if (tone === "strong") return "Strong";
  if (tone === "mixed") return "Mixed";
  return "Confirm";
}

export function SourceConfidenceLedger({
  source,
  compact = false,
}: {
  source: ConfidenceInput;
  compact?: boolean;
}) {
  const ledger = buildSourceConfidenceLedger(source);

  return (
    <section
      className={`source-confidence source-confidence--${ledger.tone} ${
        compact ? "source-confidence--compact" : ""
      }`}
      aria-label={ledger.ariaLabel}
    >
      <div className="source-confidence__header">
        <div>
          <p className="source-confidence__eyebrow">Source Check</p>
          <h3>{ledger.summary}</h3>
        </div>
        <div
          className="source-confidence__meter"
          style={scoreStyle(ledger.score)}
          aria-hidden="true"
        >
          <span>{ledger.score}</span>
        </div>
      </div>

      <ul className="source-confidence__checks">
        {ledger.items.map((item) => (
          <li
            key={item.key}
            className={`source-confidence__check source-confidence__check--${item.state}`}
          >
            <IconGlyph iconKey={item.iconKey} decorative />
            <span>
              <strong>{item.label}</strong>
              {!compact && <small>{item.helper}</small>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SourceConfidenceSummary({
  sources,
}: {
  sources: Array<ActivityOccurrence | ActivityOffering>;
}) {
  const summary = buildSourceConfidenceSummary(sources);
  if (summary.total === 0) return null;

  return (
    <section className="source-confidence-summary" aria-label={summary.ariaLabel}>
      <div>
        <p className="source-confidence__eyebrow">Source Check</p>
        <h2>How current does this look?</h2>
        <p>{summary.summary}</p>
      </div>
      <div
        className="source-confidence-summary__meter"
        style={scoreStyle(summary.averageScore)}
        aria-hidden="true"
      >
        <span>{summary.averageScore}%</span>
      </div>
      <dl className="source-confidence-summary__stats">
        <div>
          <dt>Strong</dt>
          <dd>{summary.strong}</dd>
        </div>
        <div>
          <dt>Mixed</dt>
          <dd>{summary.mixed}</dd>
        </div>
        <div>
          <dt>Confirm</dt>
          <dd>{summary.needsConfirmation}</dd>
        </div>
      </dl>
    </section>
  );
}

export function SourceConfidencePill({
  source,
}: {
  source: ConfidenceInput;
}) {
  const ledger = buildSourceConfidenceLedger(source);
  return (
    <span className={`source-confidence-pill source-confidence-pill--${ledger.tone}`}>
      {toneLabel(ledger.tone)} · {ledger.score}%
    </span>
  );
}

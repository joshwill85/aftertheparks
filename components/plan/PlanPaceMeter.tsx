import type { CSSProperties } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { buildPlanPace } from "@/lib/plan/pace";
import type { PlanItem } from "@/lib/types/occurrence";

function meterStyle(score: number) {
  return { "--plan-pace-score": `${score}%` } as CSSProperties & {
    "--plan-pace-score": string;
  };
}

export function PlanPaceMeter({ items }: { items: PlanItem[] }) {
  const pace = buildPlanPace(items);

  return (
    <section
      className={`plan-pace plan-pace--${pace.tone}`}
      aria-label={pace.ariaLabel}
    >
      <div className="plan-pace__story">
        <p className="plan-pace__eyebrow">Pace Meter</p>
        <h2>{pace.summary}</h2>
        <p>{pace.story}</p>
      </div>

      <div className="plan-pace__meter" style={meterStyle(pace.score)} aria-hidden="true">
        <span>{pace.score}</span>
      </div>

      <ul className="plan-pace__signals">
        {pace.signals.map((signal) => (
          <li
            key={signal.key}
            className={`plan-pace__signal plan-pace__signal--${signal.severity}`}
          >
            <IconGlyph iconKey={signal.iconKey} decorative />
            <span>
              <strong>{signal.value}</strong>
              {signal.label}
            </span>
            <small>{signal.helper}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { buildPlanStory } from "@/lib/plan/story";
import type { PlanItem } from "@/lib/types/occurrence";

export function PlanStorySummary({ items }: { items: PlanItem[] }) {
  const story = buildPlanStory(items);

  return (
    <section
      className={`plan-story plan-story--${story.tone}`}
      aria-label={story.ariaLabel}
    >
      <div className="plan-story__copy">
        <p className="plan-story__eyebrow">Plan Summary</p>
        <h2>{story.headline}</h2>
        <p>{story.body}</p>
      </div>

      {story.highlights.length > 0 && (
        <dl className="plan-story__highlights" aria-label="Plan details">
          {story.highlights.map((highlight) => (
            <div key={highlight.label} className="plan-story__highlight">
              <IconGlyph iconKey={highlight.iconKey} decorative />
              <dt>{highlight.label}</dt>
              <dd>{highlight.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="plan-story__actions" aria-label="Suggested next steps">
        {story.nextActions.map((nextAction) => (
          <Link
            key={nextAction.href}
            href={nextAction.href}
            className="plan-story__action"
          >
            <IconGlyph iconKey={nextAction.iconKey} decorative />
            <span>
              <strong>{nextAction.label}</strong>
              <small>{nextAction.reason}</small>
            </span>
            <IconGlyph
              iconKey="arrow_right"
              className="plan-story__arrow"
              decorative
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

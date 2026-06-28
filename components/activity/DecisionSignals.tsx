import { cn } from "@/lib/utils";
import type { DecisionProfile } from "@/lib/activityDecision";

export function DecisionSignals({
  profile,
  compact = false,
  maxSignals,
}: {
  profile: DecisionProfile;
  compact?: boolean;
  maxSignals?: number;
}) {
  const signals =
    maxSignals == null ? profile.signals : profile.signals.slice(0, maxSignals);

  if (!profile.whyFits && signals.length === 0) return null;

  return (
    <div className={cn("decision-signals", compact && "decision-signals--compact")}>
      {profile.whyFits && (
        <p className="decision-signals__why">{profile.whyFits}</p>
      )}
      <dl className="decision-signals__grid">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className={cn("decision-signal", `decision-signal--${signal.tone}`)}
          >
            <dt>{signal.label}</dt>
            <dd>{signal.value}</dd>
            <p>{signal.helper}</p>
          </div>
        ))}
      </dl>
    </div>
  );
}

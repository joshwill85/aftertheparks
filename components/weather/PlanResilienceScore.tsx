import type { PlanResilienceScore as PlanResilienceScoreValue } from "@/lib/weather/types";

function fallbackHref(action: PlanResilienceScoreValue["improvements"][number]["action"]) {
  if (action === "replace_outdoor_movie") return "/activities?weather=covered";
  if (action === "move_pool_time_earlier") return "/today?weather=outdoor";
  if (action === "reduce_transport_weather_risk") return "/activities?weather=indoor";
  return "/activities?weather=indoor";
}

export function PlanResilienceScore({ score }: { score: PlanResilienceScoreValue }) {
  return (
    <section className="plan-resilience-score">
      <p className="plan-resilience-score__label">{score.headline}</p>
      <strong>{score.score}/100</strong>
      <ul>
        {score.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <div>
        {score.improvements.map((improvement) =>
          improvement.href ? (
            <a key={improvement.label} href={improvement.href}>
              {improvement.label}
            </a>
          ) : (
            <a key={improvement.label} href={fallbackHref(improvement.action)}>
              {improvement.label}
            </a>
          )
        )}
      </div>
    </section>
  );
}

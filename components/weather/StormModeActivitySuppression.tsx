import type { StormModeState } from "@/lib/weather/types";

export function StormModeActivitySuppression({ state }: { state: StormModeState }) {
  if (!state.suppressOutdoorRecommendations) return null;
  return (
    <section className="storm-mode-suppression">
      <h2>Outdoor recommendations are paused</h2>
      <p>Indoor and covered options are promoted until storm risk improves.</p>
    </section>
  );
}

import type { StormModeState } from "@/lib/weather/types";

export function StormModeBanner({ state }: { state: StormModeState }) {
  if (!state.active) return null;
  return (
    <section className="storm-mode-banner" role="alert">
      <p>Official weather posture</p>
      <h2>{state.headline}</h2>
      <p>{state.guidance}</p>
    </section>
  );
}

import type { NearTermRainSignal } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

export function nearTermRainShortCopy(signal?: NearTermRainSignal): string | undefined {
  if (!signal || signal.answer === "unknown") return undefined;
  if (signal.answer === "storm_alert") return "Official storm alert nearby";
  if (signal.answer === "likely") return "Rain nearby";
  if (signal.answer === "possible") return "Rain may affect the next hour.";
  return "Rain looks unlikely in the next hour. This is forecast guidance, not live radar.";
}

export function NearTermRainLine({
  signal,
  compact = false,
  className,
}: {
  signal?: NearTermRainSignal;
  compact?: boolean;
  className?: string;
}) {
  if (!signal) return null;
  const shouldShow = signal.answer !== "unknown" || !compact;
  if (!shouldShow) return null;

  return (
    <p
      className={cn(
        "near-term-rain-line",
        `near-term-rain-line--${signal.answer}`,
        className
      )}
    >
      <strong>{compact ? nearTermRainShortCopy(signal) ?? signal.headline : signal.headline}</strong>
      {!compact && <span>{signal.detail}</span>}
    </p>
  );
}

"use client";

import { useCallback, useState } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { cn } from "@/lib/utils";

type SaveButtonVariant = "day" | "night";

interface SaveButtonProps {
  saved: boolean;
  onSave: () => void;
  className?: string;
  variant?: SaveButtonVariant;
}

export function SaveButton({
  saved,
  onSave,
  className,
  variant = "day",
}: SaveButtonProps) {
  const [stamping, setStamping] = useState(false);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleClick = useCallback(() => {
    if (saved) return;
    onSave();
    if (!reducedMotion) {
      setStamping(true);
      window.setTimeout(() => setStamping(false), 650);
    }
    if (navigator.vibrate) navigator.vibrate(10);
  }, [onSave, reducedMotion, saved]);

  return (
    <span className={cn("save-button-wrap relative inline-flex", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={saved}
        aria-pressed={saved}
        aria-label={saved ? "Saved to My Plan" : "Add to My Plan"}
        className={cn(
          variant === "day" ? "btn-save" : "btn-save-night",
          "relative inline-flex min-h-11 items-center justify-center overflow-hidden rounded-full border px-4 text-sm font-bold transition-transform",
          variant === "day" &&
            (saved
              ? "border-[var(--color-palm)]/40 bg-[var(--color-palm)]/10 text-[var(--color-palm)]"
              : "border-[#fdb94e]/45 bg-[#fdb94e]/18 text-[#7a4a00] hover:border-[#fdb94e]/60"),
          variant === "night" &&
            (saved
              ? "border-[var(--lantern)]/35 bg-[var(--lantern)]/15 text-[var(--lantern)]"
              : "border-[var(--lantern)]/45 bg-[var(--lantern)]/18 text-[var(--lantern)] hover:bg-[var(--lantern)]/28"),
          !reducedMotion && !saved && "active:scale-[0.97]"
        )}
      >
        {saved ? (
          <span className="inline-flex items-center gap-1">
            In My Plan <IconGlyph iconKey="check_mark" className="text-sm" />
          </span>
        ) : (
          "Add to My Plan"
        )}
      </button>
      {stamping && !reducedMotion && (
        <span
          className={cn(
            "postcard-stamp wow-folded-map-daybook-transition",
            variant === "night" && "postcard-stamp--night"
          )}
          data-wow-moment="folded_map_daybook_transition"
          aria-hidden
        >
          <span className="wow-folded-map__crease" />
          <span className="wow-folded-map__label">Saved</span>
        </span>
      )}
    </span>
  );
}

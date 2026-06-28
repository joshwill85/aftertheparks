"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { INTENT_PRESETS } from "@/lib/planning/presetDefinitions";
import { cn } from "@/lib/utils";

export function PresetChips({
  homeResortSlug,
}: {
  homeResortSlug?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePreset = searchParams.get("preset");

  const visible = INTENT_PRESETS.filter(
    (preset) => !preset.requiresHomeResort || Boolean(homeResortSlug)
  );

  return (
    <div className="preset-chips" aria-label="Planning presets">
      {visible.map((preset) => {
        const params = new URLSearchParams(searchParams.toString());
        if (activePreset === preset.id) params.delete("preset");
        else params.set("preset", preset.id);
        const href = params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;

        return (
          <Link
            key={preset.id}
            href={href}
            className={cn(
              "preset-chip",
              activePreset === preset.id && "preset-chip--active"
            )}
            title={preset.description}
            aria-current={activePreset === preset.id ? "page" : undefined}
          >
            {preset.label}
          </Link>
        );
      })}
    </div>
  );
}

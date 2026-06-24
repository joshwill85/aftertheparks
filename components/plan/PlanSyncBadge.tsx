"use client";

import { usePlan } from "@/components/atlas/PlanProvider";
import { cn } from "@/lib/utils";

export function PlanSyncBadge({ className }: { className?: string }) {
  const { syncStatus } = usePlan();

  if (syncStatus === "synced" || syncStatus === "idle") return null;

  const copy =
    syncStatus === "syncing"
      ? "Syncing…"
      : syncStatus === "offline"
        ? "Saved on this device"
        : "Sync issue — retrying";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-[var(--muted)]",
        className
      )}
      role="status"
    >
      {copy}
    </span>
  );
}

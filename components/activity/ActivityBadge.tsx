import { cn } from "@/lib/utils";

export type ActivityBadgeVariant =
  | "free"
  | "paid"
  | "unknown"
  | "time"
  | "indoor"
  | "warning"
  | "happening"
  | "daypart";

const VARIANT_STYLES: Record<ActivityBadgeVariant, string> = {
  free: "bg-[var(--color-palm)]/10 text-[var(--color-palm)]",
  paid: "bg-[var(--color-coral)]/10 text-[var(--color-coral)]",
  unknown: "bg-[var(--color-muted)]/10 text-[var(--color-muted)]",
  time: "bg-[#fdb94e]/22 text-[#8a5200]",
  indoor: "bg-[var(--color-lagoon)]/13 text-[var(--color-lagoon)]",
  warning: "bg-[#ffc857]/22 text-[#7a4a00]",
  happening: "bg-[var(--color-citrus)]/20 text-[var(--color-citrus)]",
  daypart: "bg-[var(--accent)]/12 text-[var(--accent)]",
};

interface ActivityBadgeProps {
  variant: ActivityBadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function ActivityBadge({
  variant,
  children,
  className,
}: ActivityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

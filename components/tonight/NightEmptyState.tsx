import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";

interface NightEmptyStateProps {
  title: string;
  description: string;
  actions?: { label: string; href: string; variant?: "primary" | "secondary" }[];
}

export function NightEmptyState({
  title,
  description,
  actions = [],
}: NightEmptyStateProps) {
  return (
    <div className="tonight-empty rounded-[22px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.94)] p-8 text-center shadow-[var(--shadow-card)] md:p-10">
      <IconGlyph iconKey="nighttime_entertainment" className="mx-auto text-3xl" />
      <h3 className="font-display mt-4 text-xl font-semibold text-[var(--brand-ink)] md:text-2xl">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.variant === "primary"
                  ? "btn-primary px-5 text-sm"
                  : "btn-secondary px-5 text-sm"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

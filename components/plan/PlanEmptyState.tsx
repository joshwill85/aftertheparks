import Link from "next/link";
import { BrandAsset } from "@/components/brand/BrandAsset";

const ACTIONS = [
  { label: "See tonight", href: "/tonight", variant: "primary" as const },
  { label: "Browse activities", href: "/activities", variant: "secondary" as const },
  { label: "Choose my resort", href: "/resorts", variant: "secondary" as const },
];

export function PlanEmptyState() {
  return (
    <section className="plan-empty journal-empty postcard-texture p-8 text-center md:p-12">
      <BrandAsset
        asset="pocket-map-only"
        className="brand-asset--map-panel mx-auto"
      />
      <div className="passport-stamp" aria-hidden>
        Rest Day
      </div>
      <h2 className="font-display mt-6 text-2xl font-semibold md:text-3xl">
        No saved activities yet.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[var(--color-muted)]">
        {"Start with tonight's options, all activities, or your resort page."}
      </p>
      <div className="empty-actions mt-8 flex flex-wrap justify-center gap-3">
        {ACTIONS.map((action) =>
          action.variant === "primary" ? (
            <Link
              key={action.href}
              href={action.href}
              className="btn-primary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold text-white"
            >
              {action.label}
            </Link>
          ) : (
            <Link
              key={action.href}
              href={action.href}
              className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
            >
              {action.label}
            </Link>
          )
        )}
      </div>
    </section>
  );
}

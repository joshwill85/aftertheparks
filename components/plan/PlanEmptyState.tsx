import Link from "next/link";

const ACTIONS = [
  { label: "Browse tonight", href: "/tonight", variant: "primary" as const },
  { label: "Explore activities", href: "/activities", variant: "secondary" as const },
  { label: "Choose my resort", href: "/resorts", variant: "secondary" as const },
];

export function PlanEmptyState() {
  return (
    <section className="plan-empty journal-empty postcard-texture p-8 text-center md:p-12">
      <div className="passport-stamp" aria-hidden>
        Rest Day
      </div>
      <h2 className="font-display mt-6 text-2xl font-semibold md:text-3xl">
        Your rest day is waiting.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[var(--color-muted)]">
        Save a pool break, a craft, a campfire, or a movie under the stars and
        we&apos;ll turn it into an easy day plan.
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

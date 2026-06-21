import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actions?: { label: string; href: string; variant?: "primary" | "secondary" }[];
}

export function EmptyState({ title, description, actions = [] }: EmptyStateProps) {
  return (
    <div className="postcard-texture rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-8 text-center md:p-12">
      <p className="text-3xl" aria-hidden>
        🌴
      </p>
      <h2 className="font-display mt-4 text-xl font-semibold md:text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-[var(--color-muted)]">{description}</p>
      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.variant === "primary"
                  ? "rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-sm"
                  : "rounded-full border border-[var(--color-card-border)] bg-[var(--color-postcard)]/50 px-5 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
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

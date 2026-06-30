import Link from "next/link";

export interface AnswerBlockAction {
  label: string;
  href: string;
}

export function AnswerBlock({
  eyebrow,
  title,
  children,
  primaryAction,
  secondaryActions = [],
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  primaryAction: AnswerBlockAction;
  secondaryActions?: AnswerBlockAction[];
}) {
  return (
    <section className="mb-6 border-y border-[var(--color-card-border)] py-5">
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
          {eyebrow}
        </p>
      )}
      <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <div className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-muted)]">
            {children}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary rounded-full px-5 py-3 text-sm font-bold" href={primaryAction.href}>
            {primaryAction.label}
          </Link>
          {secondaryActions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              className="btn-secondary rounded-full px-5 py-3 text-sm font-bold"
              href={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

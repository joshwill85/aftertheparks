import Link from "next/link";

export interface IntentLink {
  label: string;
  href: string;
  description?: string;
}

export function IntentLinkCluster({
  title = "Helpful next pages",
  links,
}: {
  title?: string;
  links: IntentLink[];
}) {
  if (links.length === 0) return null;

  return (
    <nav className="mb-6 border-y border-[var(--color-card-border)] py-5" aria-label={title}>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={`${link.href}:${link.label}`}
            href={link.href}
            className="rounded-xl border border-[var(--color-card-border)] p-4 hover:bg-[var(--color-card-subtle)]"
          >
            <span className="block text-sm font-bold text-[var(--accent)]">
              {link.label}
            </span>
            {link.description && (
              <span className="mt-1 block text-xs leading-relaxed text-[var(--color-muted)]">
                {link.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

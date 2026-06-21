import Link from "next/link";
import { NO_TICKET_COLLECTIONS } from "@/lib/magic/collections";

export function NoTicketMagic() {
  return (
    <section className="home-section" aria-labelledby="no-ticket-heading">
      <div className="mb-4">
        <h2 id="no-ticket-heading" className="font-display text-2xl font-semibold">
          No-ticket magic
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Curated collections — resort fun that doesn&apos;t need a park day.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NO_TICKET_COLLECTIONS.map((collection) => (
          <Link
            key={collection.id}
            href={collection.href}
            className="no-ticket-card group flex flex-col rounded-[28px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden>
              {collection.icon}
            </span>
            <h3 className="font-display mt-3 text-lg font-semibold group-hover:text-[var(--accent)]">
              {collection.title}
            </h3>
            <p className="mt-1 flex-1 text-sm text-[var(--color-muted)]">
              {collection.description}
            </p>
            <span className="mt-3 text-sm font-bold text-[var(--accent)]">
              Explore →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

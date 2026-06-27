import Link from "next/link";
import { HOME_FINDER_CHIPS } from "@/lib/categories/meta";

export function HomeFinder() {
  return (
    <section className="postcard-texture rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card)]/90 p-6 backdrop-blur-md md:p-8">
      <h2 className="font-display text-lg font-semibold">What are you looking for?</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Jump straight to the kind of resort activity you need.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_FINDER_CHIPS.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="group rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-postcard)]/40 p-4 transition-all hover:border-[var(--accent)] hover:shadow-md"
          >
            <span className="font-display font-semibold group-hover:text-[var(--accent)]">
              {chip.label}
            </span>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{chip.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

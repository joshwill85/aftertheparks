import Link from "next/link";
import type { ResortSummary } from "@/lib/types/occurrence";

export function ResortSourceBlock({ resort }: { resort: ResortSummary }) {
  return (
    <section
      className="rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6"
      aria-labelledby="resort-source-heading"
    >
      <h2 id="resort-source-heading" className="font-display text-xl font-semibold">
        Data & freshness
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        Activity schedules are compiled from official Walt Disney World resort
        recreation calendars. Times can change — always confirm with the resort
        before heading out.
      </p>
      <ul className="mt-4 flex flex-wrap gap-3 text-sm">
        {resort.disneyUrl && (
          <li>
            <a
              href={resort.disneyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-bold text-[var(--accent)] hover:underline"
            >
              Official resort page →
            </a>
          </li>
        )}
        <li>
          <Link
            href="/corrections"
            className="inline-flex min-h-11 items-center font-bold text-[var(--accent)] hover:underline"
          >
            Report a correction →
          </Link>
        </li>
      </ul>
    </section>
  );
}

import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
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
              Official resort page <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
            </a>
          </li>
        )}
        <li>
          <Link
            href="/corrections"
            className="inline-flex min-h-11 items-center font-bold text-[var(--accent)] hover:underline"
          >
            Report a correction <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
          </Link>
        </li>
      </ul>
    </section>
  );
}

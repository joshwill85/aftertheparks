import Link from "next/link";
import { BrandAsset } from "@/components/brand/BrandAsset";
import type { ResortSummary } from "@/lib/types/occurrence";

export function ResortEmptyState({ resort }: { resort: ResortSummary }) {
  return (
    <section className="journal-empty postcard-texture rounded-[28px] border border-[var(--color-card-border)] p-8 text-center md:p-12">
      <BrandAsset asset="guide-companion" className="brand-asset--empty" />
      <div className="passport-stamp mx-auto w-fit" aria-hidden>
        Schedule pending
      </div>
      <h2 className="font-display mt-6 text-2xl font-semibold">
        No published activities yet for {resort.name}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm text-[var(--color-muted)]">
        We may still be ingesting this resort&apos;s recreation calendar, or the
        current edition hasn&apos;t been published. Check the official guide or
        explore nearby resorts.
      </p>
      <div className="empty-actions mt-8 flex flex-wrap justify-center gap-3">
        {resort.disneyUrl && (
          <a
            href={resort.disneyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold text-white"
          >
            Official resort page
          </a>
        )}
        <Link
          href={`/today?resort=${resort.slug}`}
          className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
        >
          Check today
        </Link>
        <Link
          href={`/tonight?resort=${resort.slug}`}
          className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
        >
          Check tonight
        </Link>
        <Link
          href={`/activities?resort=${resort.slug}`}
          className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
        >
          See all activities
        </Link>
        <Link
          href={`/activities?weather=indoor&resort=${resort.slug}`}
          className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
        >
          Find weather-fit backups
        </Link>
        <Link
          href="/corrections"
          className="btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold"
        >
          Report missing schedule
        </Link>
      </div>
    </section>
  );
}

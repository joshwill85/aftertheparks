import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { GUIDES } from "@/lib/guides";
import { buildItemListJsonLd, stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { disneySpringsTransportationCaveat } from "@/lib/seo/transportation";

export const metadata: Metadata = {
  title: "Disney World Resort Planning Guides | After the Parks",
  description:
    "Research-gated Walt Disney World resort planning guides for non-park days, free activities, resort hopping, rainy days, first nights, and current resort calendars.",
  alternates: { canonical: "/guides" },
  ...buildSocialMetadata({
    title: "Disney World Resort Planning Guides",
    description:
      "Research-gated Walt Disney World resort planning guides for non-park days, free activities, resort hopping, rainy days, first nights, and current resort calendars.",
    path: "/guides",
  }),
};

export default function GuidesPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
  const jsonLd = stringifyJsonLd(
    buildItemListJsonLd(
      baseUrl,
      "Disney World resort planning guide cluster",
      GUIDES.map((guide) => ({
        name: guide.title,
        path: guide.href,
        description: guide.description,
      }))
    )
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Hero
        title="Disney World Resort Planning Guides"
        subtitle="Research-backed planning guides for resort days, no-park days, rainy days, and current activity calendars."
      />
      <section className="mb-6 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
          Research-gated guide cluster
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          These guides exist only when After the Parks can add something a
          static Disney blog cannot: current resort activity data, source
          freshness, realistic transportation notes, and deep links into
          today&apos;s and tonight&apos;s schedules.
        </p>
      </section>
      <section className="mb-6 grid gap-3 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Guide standard
          </p>
          <p className="mt-1 text-[var(--brand-ink)]">
            Real planning problem, current data dependency, and clear next step.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Source standard
          </p>
          <p className="mt-1 text-[var(--brand-ink)]">
            Official Disney sources first, with freshness and caveats visible.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Transportation standard
          </p>
          <p className="mt-1 text-[var(--brand-ink)]">
            Direct routes and access-sensitive advice are separated from easy
            resort-stay plans.
          </p>
        </div>
        <p className="md:col-span-3 text-xs leading-relaxed text-[var(--color-muted)]">
          Disney Springs note: {disneySpringsTransportationCaveat()}
        </p>
      </section>
      <ul className="grid gap-5 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <article className="flex h-full flex-col rounded-[28px] border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 shadow-sm">
              <h2 className="font-display text-xl font-semibold">
                <Link href={guide.href} className="hover:text-[var(--accent)]">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                {guide.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                <Link
                  href={guide.href}
                  className="inline-flex items-center text-[var(--accent)] hover:underline"
                >
                  Read guide <IconGlyph iconKey="arrow_right" className="ml-1 text-sm" />
                </Link>
                <Link
                  href={guide.exploreHref}
                  className="text-[var(--color-muted)] hover:text-[var(--accent)] hover:underline"
                >
                  Explore activities
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}

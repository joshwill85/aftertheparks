import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { GUIDES } from "@/lib/guides";
import { buildItemListJsonLd, stringifyJsonLd } from "@/lib/seo/jsonLd";
import { buildSocialMetadata } from "@/lib/seo/metadata";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export const metadata: Metadata = {
  title: "Disney World Resort Planning Guides | After the Parks",
  description:
    "Practical Walt Disney World resort planning guides for no-park days, rainy days, arrival nights, free activities, resort hopping, and transportation-light plans.",
  alternates: { canonical: "/guides" },
  ...buildSocialMetadata({
    title: "Disney World Resort Planning Guides",
    description:
      "Practical Walt Disney World resort planning guides for no-park days, rainy days, arrival nights, free activities, resort hopping, and transportation-light plans.",
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
        subtitle="Practical guides for no-park days, rainy days, arrival nights, free activities, resort hopping, and transportation-light plans."
      />
      <section className="mb-6 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-display text-2xl font-semibold">Start with your situation</h2>
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-[var(--color-muted)] md:grid-cols-2">
          <p><strong className="text-[var(--brand-ink)]">I need a rest day:</strong> No-park day guide, free activities, and resort-day ideas.</p>
          <p><strong className="text-[var(--brand-ink)]">The weather looks bad:</strong> Rainy-day activities, indoor backups, and weather-aware planning.</p>
          <p><strong className="text-[var(--brand-ink)]">We just arrived:</strong> First-night ideas, tonight&apos;s activities, and easy resort options.</p>
          <p><strong className="text-[var(--brand-ink)]">We want to explore:</strong> Resort hopping, monorail resorts, Skyliner resorts, and BoardWalk-area plans.</p>
          <p><strong className="text-[var(--brand-ink)]">We need simple logistics:</strong> Grandparents, little kids, and transportation-light plans.</p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
          <strong className="text-[var(--brand-ink)]">Disney Springs transportation note:</strong>{" "}
          {DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary}
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

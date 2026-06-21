import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { GUIDES } from "@/lib/guides";

export default function GuidesPage() {
  return (
    <>
      <Hero
        title="Planning guides"
        subtitle="Practical tips for resort days — curated entry points into Explore and Tonight."
      />
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
                <Link href={guide.href} className="text-[var(--accent)] hover:underline">
                  Read guide →
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

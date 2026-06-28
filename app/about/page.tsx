import { Hero } from "@/components/atlas/Hero";
import { BrandMark } from "@/components/brand/BrandAsset";

export default function AboutPage() {
  return (
    <>
      <Hero
        title="About"
        subtitle="After the Parks is an independent guide to Walt Disney World resort recreation."
      />
      <section className="mb-8 grid gap-5 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6 md:grid-cols-[360px_minmax(0,1fr)] md:items-center">
        <BrandMark
          variant="primary"
          className="brand-mark--primary justify-self-center"
          priority
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
            Pocket Map Companion
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
            Built for the quieter magic between park days.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            The pocket map, guide companion, and sunshine-to-starlight route are
            our own brand language for resort-day planning: helpful, current,
            independent, and intentionally not official Disney art.
          </p>
        </div>
      </section>
      <div className="prose max-w-none space-y-4 text-[var(--color-muted)]">
        <p>
          We help resort guests answer a simple question: what can we do now,
          tonight, and during our stay — without spending another hour scrolling
          PDFs and resort pages.
        </p>
        <p>
          After the Parks is not affiliated with, authorized by, or sponsored by
          The Walt Disney Company or any of its affiliates.
        </p>
      </div>
    </>
  );
}

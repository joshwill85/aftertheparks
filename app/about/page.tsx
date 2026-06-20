import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";

export default function AboutPage() {
  return (
    <>
      <Hero
        title="About"
        subtitle="After the Parks is an independent guide to Walt Disney World resort recreation."
      />
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
        <p>
          <Link href="/data-sources" className="text-[var(--accent)] hover:underline">
            Learn how we source and verify activity data →
          </Link>
        </p>
      </div>
    </>
  );
}

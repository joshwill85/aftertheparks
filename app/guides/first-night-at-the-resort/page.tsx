import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";

export default function FirstNightGuidePage() {
  return (
    <>
      <Hero
        title="Your first night at the resort"
        subtitle="A field guide to settling in after a long travel day."
      />
      <article className="prose max-w-none space-y-6 text-[var(--color-muted)]">
        <p>
          You made it. The parks can wait until tomorrow — tonight is about
          finding your rhythm at the resort.
        </p>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-foreground)]">
            Hour one: unpack and unwind
          </h2>
          <p>
            Drop bags, grab a cold drink, and walk the grounds while the light
            is still soft. Pool areas and marinas are at their calmest right
            after check-in.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-foreground)]">
            Hour two: scout tonight&apos;s options
          </h2>
          <p>
            Open{" "}
            <Link href="/tonight" className="text-[var(--accent)] hover:underline">
              Tonight
            </Link>{" "}
            to see what&apos;s scheduled — campfires, movies under the stars, and
            lobby activities are the usual suspects.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-foreground)]">
            Build a loose plan
          </h2>
          <p>
            Save two or three activities to{" "}
            <Link href="/plan" className="text-[var(--accent)] hover:underline">
              My Plan
            </Link>
            . Keep it light — the best first nights leave room for spontaneity.
          </p>
        </section>
      </article>
    </>
  );
}

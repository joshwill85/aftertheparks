import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export const metadata: Metadata = {
  title: "Source and Accuracy Policy",
  description:
    "How After the Parks uses official Disney sources, current calendars, freshness checks, caveats, and corrections for resort activity planning.",
  alternates: { canonical: "/source-and-accuracy-policy" },
};

export default function SourceAndAccuracyPolicyPage() {
  return (
    <>
      <Hero
        title="Source and Accuracy Policy"
        subtitle="How we check resort activity listings and show what might change."
      />

      <article className="prose max-w-none space-y-6 text-[var(--color-muted)]">
        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Short version
          </h2>
          <p>
            We use official Disney resort recreation calendars and official Disney web pages when available. We show source dates and caveats because schedules, access, transportation, and pricing can change.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Source rules
          </h2>
          <ul>
            <li>Official Disney sources are preferred for schedules, access rules, transportation, parking, dining, and recreation details.</li>
            <li>Third-party sources can inform research and caveats, but they do not override official Disney policy.</li>
            <li>Community sentiment can help identify common mistakes and favorites, but not official facts.</li>
            <li>Schedules may change because of weather, staffing, private events, refurbishments, or seasonal programming.</li>
            <li>Corrections are welcome when a listing is stale, missing, unclear, or contradicted by a newer source.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Disney Springs transportation note
          </h2>
          <p>{DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary}</p>
          <p>
            Effective date tracked by After the Parks:{" "}
            <time dateTime={DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.effectiveDate}>
              {DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.effectiveDate}
            </time>
            .
          </p>
          <p>
            This is especially important for no-ticket and resort-hopping plans:
            do not plan to use Disney Springs as a free transfer hub to reach
            resort hotels. Use a resort stay, confirmed dining or experience
            reservation, rideshare, or another currently allowed direct route
            before traveling.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            What verified means
          </h2>
          <p>
            A verified listing means we found the activity in an official source or a directly reviewable source record. It does not guarantee the activity will run at the exact time during weather, operational changes, or resort-specific adjustments.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            See something wrong?
          </h2>
          <p>
            If a listing looks stale, incomplete, or confusing, send a correction. Include the resort, activity name, date, time, and what looks wrong so we can review it.
          </p>
          <p>
            <Link href="/corrections" className="text-[var(--accent)] hover:underline">
              Send a correction
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Where to go next
          </h2>
          <p>
            Use the live pages when making day-of decisions:{" "}
            <Link href="/today" className="text-[var(--accent)] hover:underline">
              Today
            </Link>
            ,{" "}
            <Link href="/tonight" className="text-[var(--accent)] hover:underline">
              Tonight
            </Link>
            ,{" "}
            <Link href="/activities" className="text-[var(--accent)] hover:underline">
              Activities
            </Link>
            , and{" "}
            <Link href="/resorts" className="text-[var(--accent)] hover:underline">
              Resorts
            </Link>
            .
          </p>
        </section>
      </article>
    </>
  );
}

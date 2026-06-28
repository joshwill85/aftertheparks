import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";

export const metadata: Metadata = {
  title: "Terms and Legal",
  description:
    "Terms for using After the Parks, including independent status, official-source reminders, acceptable use, trademarks, and liability limits.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Hero
        title="Terms and Legal"
        subtitle="The basic rules and disclaimers for using After the Parks."
      />

      <article className="prose max-w-none space-y-6 text-[var(--color-muted)]">
        <p>
          Last updated: <time dateTime="2026-06-27">June 27, 2026</time>.
          By using After the Parks, you agree to these terms.
        </p>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Independent Guide
          </h2>
          <p>
            After the Parks is an independent Walt Disney World resort planning
            guide. We are not affiliated with, authorized by, endorsed by, or
            sponsored by The Walt Disney Company or any of its affiliates.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Planning Information
          </h2>
          <p>
            We work to keep activity schedules, weather context, transportation
            notes, pricing labels, reservation notes, and source caveats useful
            and current. Resort operations can still change because of weather,
            staffing, private events, refurbishments, capacity, seasonality, or
            policy updates. Always confirm details with the official Disney
            source, resort front desk, or venue before relying on a plan.
          </p>
          <p>
            Our{" "}
            <Link
              href="/source-and-accuracy-policy"
              className="text-[var(--accent)] hover:underline"
            >
              Source and Accuracy Policy
            </Link>{" "}
            explains how we handle sources, freshness, caveats, and corrections.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Acceptable Use
          </h2>
          <ul>
            <li>Do not use the site to submit spam, abusive content, or unlawful material.</li>
            <li>Do not attempt to disrupt, scrape, overload, or reverse engineer the service.</li>
            <li>Do not use shared plan links to harass, impersonate, or mislead others.</li>
            <li>Do not remove attribution or present After the Parks content as official Disney information.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Intellectual Property And Trademarks
          </h2>
          <p>
            After the Parks content, design, and data organization belong to
            After the Parks or its licensors. Disney, Walt Disney World, resort
            names, attraction names, and related marks are trademarks or property
            of The Walt Disney Company or their respective owners. References to
            those names are for identification and planning context only.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            No Warranty
          </h2>
          <p>
            The site is provided as is and as available. We do not guarantee that
            the information will always be complete, current, uninterrupted,
            error-free, or suitable for your specific trip.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Liability Limits
          </h2>
          <p>
            To the fullest extent allowed by law, After the Parks is not liable
            for indirect, incidental, consequential, special, or punitive damages,
            or for trip disruption, missed reservations, changed schedules,
            weather impacts, transportation issues, or reliance on information
            that later changes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Privacy
          </h2>
          <p>
            The{" "}
            <Link href="/privacy" className="text-[var(--accent)] hover:underline">
              Privacy Policy
            </Link>{" "}
            explains how we handle information submitted through the site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Contact
          </h2>
          <p>
            Questions, legal notices, and correction requests can be sent through
            the{" "}
            <Link href="/corrections" className="text-[var(--accent)] hover:underline">
              contact form
            </Link>
            .
          </p>
        </section>
      </article>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/atlas/Hero";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How After the Parks handles contact messages, optional email updates, planning data, analytics, security checks, and deletion requests.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Hero
        title="Privacy Policy"
        subtitle="What we collect, why we collect it, and how we use it."
      />

      <article className="prose max-w-none space-y-6 text-[var(--color-muted)]">
        <p>
          Last updated: <time dateTime="2026-06-27">June 27, 2026</time>.
          After the Parks is an independent planning guide. This policy explains
          what we collect, why we collect it, and how to contact us about your
          information.
        </p>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Information We Collect
          </h2>
          <ul>
            <li>
              Correction/contact submissions: name, email address, and message
              content you choose to send.
            </li>
            <li>
              Optional email interest forms: email address, marketing consent
              choice, consent version, and form source. We may store a protected version of your email instead of the email itself when the feature supports it.
            </li>
            <li>
              Planning features: saved activity details, plan title, notes,
              anonymous session identifiers, share tokens, and sync status when
              you use My Plan or share a plan.
            </li>
            <li>
              Technical and security data: IP-derived rate-limit records,
              browser/device diagnostics, error and security logs, and
              Cloudflare Turnstile verification results.
            </li>
            <li>
              Local device storage: My Plan can store activity data in your
              browser so your plan remains available on the same device.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            How We Use Information
          </h2>
          <ul>
            <li>To review corrections, source notes, and support messages.</li>
            <li>
              To notify you about account-save features or planning updates when
              you ask for those messages.
            </li>
            <li>To operate saved plans, shared plans, search, and site features.</li>
            <li>To prevent abuse, spam, scraping, fraud, and service misuse.</li>
            <li>To understand site performance and improve reliability.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Service Providers
          </h2>
          <p>
            We use service providers to run the site, including Supabase for
            database, authentication, and storage-backed features; Cloudflare
            Turnstile for abuse prevention; Vercel or similar hosting
            infrastructure; and Google analytics or measurement tools when they
            are enabled. These providers may process technical information needed
            to provide their services.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Marketing Consent
          </h2>
          <p>
            We only send optional planning ideas, activity updates, or product
            notices when you submit an email form for that purpose or check the
            marketing consent box. You can ask us to stop sending those messages
            or remove your information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Retention
          </h2>
          <p>
            We keep correction messages, plan records, consent records, and
            security logs only as long as reasonably needed to operate the site,
            maintain trust and source quality, prevent abuse, comply with legal
            obligations, or resolve disputes. Local browser plan data remains on
            your device until you clear it or your browser removes it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Deletion Requests
          </h2>
          <p>
            To request access, correction, deletion, or removal from optional
            emails, send a note through the{" "}
            <Link href="/corrections" className="text-[var(--accent)] hover:underline">
              contact form
            </Link>
            . We may need enough information to locate your submission or plan
            record before we can process the request.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Children
          </h2>
          <p>
            After the Parks is for general trip planning and is not directed to
            children under 13. Please do not submit personal information for a
            child through the site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[var(--color-foreground)]">
            Changes
          </h2>
          <p>
            We may update this policy as the site changes. The date above shows
            the latest version.
          </p>
        </section>
      </article>
    </>
  );
}

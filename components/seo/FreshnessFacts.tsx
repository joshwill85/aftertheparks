import Link from "next/link";

export function FreshnessFacts({
  lastVerified,
  scheduleWindow,
  activityCount,
  sourceCount,
  correctionHref = "/corrections",
  policyHref = "/source-and-accuracy-policy",
}: {
  lastVerified?: string;
  scheduleWindow?: string;
  activityCount: number;
  sourceCount: number;
  correctionHref?: string;
  policyHref?: string;
}) {
  return (
    <section className="mb-6 border-y border-[var(--color-card-border)] py-5" aria-labelledby="freshness-facts-heading">
      <h2 id="freshness-facts-heading" className="font-display text-2xl font-semibold">
        Source and freshness
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-muted)]">
        Schedules can change, so confirm time, location, access, cost, and weather decisions with the resort before you go.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-bold text-[var(--color-muted)]">Last verified</dt>
          <dd className="font-semibold">{lastVerified ?? "Check current source"}</dd>
        </div>
        {scheduleWindow && (
          <div>
            <dt className="font-bold text-[var(--color-muted)]">Schedule window</dt>
            <dd className="font-semibold">{scheduleWindow}</dd>
          </div>
        )}
        <div>
          <dt className="font-bold text-[var(--color-muted)]">Verified activity rows</dt>
          <dd className="font-semibold">{activityCount}</dd>
        </div>
        <div>
          <dt className="font-bold text-[var(--color-muted)]">Official sources checked</dt>
          <dd className="font-semibold">{sourceCount}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
        <Link className="text-[var(--accent)] hover:underline" href={policyHref}>
          Source and accuracy policy
        </Link>
        <Link className="text-[var(--accent)] hover:underline" href={correctionHref}>
          Send a correction
        </Link>
      </div>
    </section>
  );
}

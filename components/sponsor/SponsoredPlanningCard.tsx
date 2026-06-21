import { SponsorDisclosure } from "@/components/sponsor/SponsorDisclosure";

interface SponsoredPlanningCardProps {
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
}

/** Inactive until sponsor program launches — set NEXT_PUBLIC_SPONSORS=true to show. */
export function SponsoredPlanningCard({
  title,
  body,
  ctaLabel,
  href,
}: SponsoredPlanningCardProps) {
  if (process.env.NEXT_PUBLIC_SPONSORS !== "true") return null;

  return (
    <article className="sponsor-card" aria-label="Sponsored planning suggestion">
      <SponsorDisclosure />
      <h3 className="font-display mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
      <a href={href} className="btn-secondary mt-4 inline-flex">
        {ctaLabel}
      </a>
    </article>
  );
}

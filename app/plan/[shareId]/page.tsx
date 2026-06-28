import type { Metadata } from "next";
import { getPlanShare } from "@/lib/data/activities";
import { BrandMark, BrandMotif } from "@/components/brand/BrandAsset";
import type { PlanItem } from "@/lib/types/occurrence";
import { notFound } from "next/navigation";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const description =
    "Find movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas.";

  return {
    title: "After the Parks",
    description,
    robots: { index: false, follow: true },
    ...buildSocialMetadata({
      title: "After the Parks",
      description,
      path: `/plan/${shareId}`,
      imageSummary:
        "Movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas in one beautiful guide.",
    }),
  };
}

export default async function PlanSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const plan = await getPlanShare(shareId);

  if (!plan) notFound();
  const items = plan.payload as PlanItem[];

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark variant="horizontal" className="brand-mark--footer" />
          <BrandMotif className="brand-motif--divider" />
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          Shared through After the Parks, an independent resort-day planning
          guide.
        </p>
      </div>
      <h1 className="font-display mb-2 text-3xl font-bold">
        View-only legacy shared plan
      </h1>
      <p className="mb-6 text-[var(--color-muted)]">
        Someone shared this older plan snapshot with you. It is preserved here
        for reading and will not change your My Plan.
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id ?? `${item.activityCatalogId}-${item.addedAt}`}
            className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4"
          >
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-[var(--color-muted)]">{item.resortName}</p>
            {item.location && (
              <p className="text-xs text-[var(--color-muted)]">{item.location}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { PlanShareClient } from "@/components/atlas/PlanShareClient";
import { getPlanShare } from "@/lib/data/activities";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlanSharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const plan = await getPlanShare(shareId);

  if (!plan) notFound();

  return (
    <div>
      <h1 className="font-display mb-2 text-3xl font-bold">Shared plan</h1>
      <p className="mb-6 text-[var(--color-muted)]">
        Someone shared their resort itinerary with you.
      </p>
      <PlanShareClient items={plan.payload as import("@/lib/types/occurrence").PlanItem[]} />
    </div>
  );
}

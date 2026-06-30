import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPlanClient } from "@/components/plan/PublicPlanClient";
import { PlanClientBoundary } from "@/components/plan/PlanClientBoundary";
import { createServiceClient } from "@/lib/supabase/server";
import { resolvePublicPlan } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { getPublicPlanPreview } from "@/lib/plan/publicPlanPreview";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}): Promise<Metadata> {
  const { shareToken } = await params;
  const description =
    "Find movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas.";

  return {
    title: "After the Parks",
    description,
    robots: { index: false, follow: true },
    ...buildSocialMetadata({
      title: "After the Parks",
      description,
      path: `/p/${shareToken}`,
      imageSummary:
        "Movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas in one beautiful guide.",
    }),
  };
}

export default async function PublicPlanPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const previewPlan = getPublicPlanPreview(shareToken);
  if (previewPlan) {
    return (
      <PlanClientBoundary syncOnMount>
        <PublicPlanClient token={shareToken} initial={previewPlan} />
      </PlanClientBoundary>
    );
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) notFound();

  const appClient = await createAppServerClient();
  const viewer = appClient
    ? (await appClient.auth.getUser()).data.user
    : null;

  const plan = await resolvePublicPlan(
    serviceClient,
    shareToken,
    viewer?.id ?? null
  );

  if (!plan) notFound();

  return (
    <PlanClientBoundary syncOnMount>
      <PublicPlanClient token={shareToken} initial={plan} />
    </PlanClientBoundary>
  );
}

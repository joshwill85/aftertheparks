import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPlanClient } from "@/components/plan/PublicPlanClient";
import { createServiceClient } from "@/lib/supabase/server";
import { resolvePublicPlan } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared resort plan",
  description: "View-only look at a shared After the Parks rest day plan.",
  robots: { index: false, follow: false },
};

export default async function PublicPlanPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
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
    <PublicPlanClient token={shareToken} initial={plan} />
  );
}

import { NextResponse } from "next/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { createServiceClient } from "@/lib/supabase/server";
import { requireApiUser, getApiUser } from "@/lib/plan/auth";
import { resolvePublicPlan, copySharedPlanItems } from "@/lib/plan/server";
import { redactTokenFromPath } from "@/lib/plan/token";
import { requireTurnstile } from "@/lib/turnstile/require";
import { planErrorResponse } from "@/lib/plan/api-response";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const rateLimited = await guardRateLimit({
    request,
    scope: "public-share-read",
  });
  if (rateLimited) return rateLimited;

  const { token } = await params;
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const viewer = await getApiUser();
  const plan = await resolvePublicPlan(
    serviceClient,
    token,
    viewer?.id ?? null
  );

  if (!plan) {
    console.info("shared-plan-miss", {
      path: redactTokenFromPath(`/p/${token}`),
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(plan, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = await guardRateLimit({
    request,
    scope: "plan-copy",
    userId: user.id,
  });
  if (rateLimited) return rateLimited;

  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const limited = await requireTurnstile(body.turnstileToken, "shared_plan_copy");
  if (limited) return limited;

  const userClient = await createAppServerClient();
  const serviceClient = createServiceClient();
  if (!userClient || !serviceClient) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const result = await copySharedPlanItems(
      userClient,
      serviceClient,
      user.id,
      token,
      body.operationId ?? crypto.randomUUID()
    );
    return NextResponse.json(result);
  } catch (error) {
    return planErrorResponse(error, "Failed to copy plan");
  }
}

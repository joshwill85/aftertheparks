import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import {
  fetchOwnerPlan,
  renamePlan,
  deletePlan,
  updatePlanSettings,
} from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { planErrorResponse } from "@/lib/plan/api-response";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ plan: null, items: [] });
  }

  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const { plan, items } = await fetchOwnerPlan(client, user.id);
  return NextResponse.json({ plan, items });
}

export async function PATCH(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await guardRateLimit({
    request,
    scope: "plan-mutation",
    userId: user.id,
  });
  if (limited) return limited;

  const body = await request.json();
  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const operationId = body.operationId ?? crypto.randomUUID();
    const plan = body.settings
      ? await updatePlanSettings(client, user.id, body.settings, operationId)
      : await renamePlan(client, user.id, body.title ?? "", operationId);
    return NextResponse.json({ plan });
  } catch (error) {
    return planErrorResponse(error, body.settings ? "Failed to update plan settings" : "Failed to rename plan");
  }
}

export async function DELETE(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await guardRateLimit({
    request,
    scope: "plan-mutation",
    userId: user.id,
  });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  await deletePlan(client, user.id, body.operationId ?? crypto.randomUUID());
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import { addPlanItem, userHasActivePlan } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import type { AddItemPayload } from "@/lib/plan/types";
import { requireTurnstile } from "@/lib/turnstile/require";
import { planErrorResponse } from "@/lib/plan/api-response";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  const body = (await request.json()) as AddItemPayload;
  if (!body.operationId || !body.sourceActivityId || !body.title) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const hasPlan = await userHasActivePlan(client, user.id);
  if (!hasPlan) {
    const limited = await requireTurnstile(body.turnstileToken, "plan_first_save");
    if (limited) return limited;
  }

  try {
    const result = await addPlanItem(client, user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return planErrorResponse(error, "Failed to add item");
  }
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import { fetchOwnerPlan, renamePlan, deletePlan } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { planErrorResponse } from "@/lib/plan/api-response";

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

  const body = await request.json();
  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const plan = await renamePlan(
      client,
      user.id,
      body.title ?? "",
      body.operationId ?? crypto.randomUUID()
    );
    return NextResponse.json({ plan });
  } catch (error) {
    return planErrorResponse(error, "Failed to rename plan");
  }
}

export async function DELETE(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  await deletePlan(client, user.id, body.operationId ?? crypto.randomUUID());
  return NextResponse.json({ ok: true });
}

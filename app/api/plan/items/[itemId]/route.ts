import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import { removePlanItem, updatePlanItemNote } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { planErrorResponse } from "@/lib/plan/api-response";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
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

  const { itemId } = await params;
  const { searchParams } = new URL(request.url);
  const operationId =
    searchParams.get("operationId") ?? crypto.randomUUID();

  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const plan = await removePlanItem(client, user.id, itemId, operationId);
    return NextResponse.json({ plan });
  } catch (error) {
    return planErrorResponse(error, "Failed to remove item");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
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

  const { itemId } = await params;
  const body = await request.json().catch(() => ({}));
  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const plan = await updatePlanItemNote(
      client,
      user.id,
      itemId,
      String(body.notes ?? ""),
      body.operationId ?? crypto.randomUUID()
    );
    return NextResponse.json({ plan });
  } catch (error) {
    return planErrorResponse(error, "Failed to update note");
  }
}

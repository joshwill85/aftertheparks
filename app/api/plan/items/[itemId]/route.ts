import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import { removePlanItem } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { planErrorResponse } from "@/lib/plan/api-response";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

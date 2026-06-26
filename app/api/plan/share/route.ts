import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import { createLiveShare, revokeLiveShare } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { requireTurnstile } from "@/lib/turnstile/require";
import { planErrorResponse } from "@/lib/plan/api-response";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export const dynamic = "force-dynamic";

async function userHasActiveShare(
  client: NonNullable<Awaited<ReturnType<typeof createAppServerClient>>>,
  userId: string
): Promise<boolean> {
  const { data: itinerary } = await client
    .from("itineraries")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!itinerary) return false;

  const { data: share } = await client
    .from("itinerary_shares")
    .select("id")
    .eq("itinerary_id", itinerary.id)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(share);
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = await guardRateLimit({
    request,
    scope: "plan-share",
    userId: user.id,
  });
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => ({}));
  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const hasExistingShare = await userHasActiveShare(client, user.id);
  if (!hasExistingShare) {
    const limited = await requireTurnstile(
      body.turnstileToken,
      "plan_share_create"
    );
    if (limited) return limited;
  }

  try {
    const result = await createLiveShare(client, user.id);
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";

    if (result.reused) {
      return NextResponse.json({ reused: true, hasExistingShare: true });
    }

    return NextResponse.json({
      token: result.token,
      url: result.url,
      fullUrl: `${origin}${result.url}`,
      reused: false,
    });
  } catch (error) {
    return planErrorResponse(error, "Failed to create share");
  }
}

export async function DELETE(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimited = await guardRateLimit({
    request,
    scope: "plan-share",
    userId: user.id,
  });
  if (rateLimited) return rateLimited;

  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  await revokeLiveShare(client, user.id);
  return NextResponse.json({ ok: true });
}

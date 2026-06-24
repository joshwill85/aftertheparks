import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/plan/auth";
import { createLiveShare } from "@/lib/plan/server";
import { createAppServerClient } from "@/lib/supabase/server-app";
import { requireTurnstile } from "@/lib/turnstile/require";
import { planErrorResponse } from "@/lib/plan/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limited = await requireTurnstile(body.turnstileToken, "plan_share_rotate");
  if (limited) return limited;

  const client = await createAppServerClient();
  if (!client) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const result = await createLiveShare(client, user.id, { rotate: true });
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://aftertheparks.com";
    return NextResponse.json({
      token: result.token,
      url: result.url,
      fullUrl: `${origin}${result.url}`,
    });
  } catch (error) {
    return planErrorResponse(error, "Failed to rotate share");
  }
}

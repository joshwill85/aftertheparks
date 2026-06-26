import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireTurnstile } from "@/lib/turnstile/require";
import { hashInterestEmail } from "@/lib/plan/interest";
import { logSecurityEvent } from "@/lib/plan/security-log";
import { guardRateLimit } from "@/lib/rate-limit/guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const rateLimited = await guardRateLimit({
    request,
    scope: "plan-email",
    email,
  });
  if (rateLimited) return rateLimited;

  const limited = await requireTurnstile(body.turnstileToken, "plan_interest");
  if (limited) return limited;

  const client = createServiceClient();
  if (!client) {
    return NextResponse.json(
      { message: "Thanks — we will let you know when account save is ready." },
      { status: 200 }
    );
  }

  await client.from("plan_interest_signups").insert({
    email: hashInterestEmail(email),
    marketing_consent: body.marketingConsent === true,
    consent_version: "2026-06-24-v1",
    source: body.source ?? "plan_preview",
  });

  logSecurityEvent("interest_capture_success", { source: body.source ?? "plan_preview" });

  return NextResponse.json({
    message: "Thanks — we will let you know when account save is ready.",
  });
}

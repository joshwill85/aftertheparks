import { NextResponse } from "next/server";
import { verifyTurnstileToken, turnstileRequiredResponse } from "@/lib/turnstile/verify";

export async function requireTurnstile(
  token: string | undefined | null,
  action: string
): Promise<NextResponse | null> {
  const ok = await verifyTurnstileToken(token, action);
  if (!ok) {
    return NextResponse.json(turnstileRequiredResponse(), { status: 403 });
  }
  return null;
}

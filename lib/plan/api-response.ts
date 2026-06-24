import { NextResponse } from "next/server";
import { PlanQuotaError, quotaUserMessage } from "@/lib/plan/quotas";

export function planErrorResponse(
  error: unknown,
  fallback = "Request failed"
): NextResponse {
  if (error instanceof PlanQuotaError) {
    return NextResponse.json(
      { error: error.code, message: quotaUserMessage(error.code) },
      { status: 429 }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

import { privateNoStoreJson } from "@/lib/cache/http";
import { PlanQuotaError, quotaUserMessage } from "@/lib/plan/quotas";

export function planErrorResponse(
  error: unknown,
  fallback = "Request failed"
) {
  if (error instanceof PlanQuotaError) {
    return privateNoStoreJson(
      { error: error.code, message: quotaUserMessage(error.code) },
      { status: 429 }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  return privateNoStoreJson({ error: message }, { status: 500 });
}

import { isTurnstileConfigured } from "@/lib/turnstile/config";
import { logSecurityEvent } from "@/lib/plan/security-log";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  action?: string
): Promise<boolean> {
  if (!isTurnstileConfigured()) {
    return true;
  }

  if (!token) {
    logSecurityEvent("turnstile_validation_failure", {
      reason: "missing_token",
      action,
    });
    return false;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );

    const data = (await res.json()) as SiteverifyResponse;
    if (!data.success) {
      logSecurityEvent("turnstile_validation_failure", {
        reason: "siteverify_rejected",
        action,
        codes: (data["error-codes"] ?? []).join(","),
      });
      return false;
    }

    if (action && data.action && data.action !== action) {
      logSecurityEvent("turnstile_validation_failure", {
        reason: "action_mismatch",
        action,
        received: data.action,
      });
      return false;
    }

    logSecurityEvent("turnstile_validation_success", { action });
    return true;
  } catch {
    logSecurityEvent("turnstile_validation_failure", {
      reason: "siteverify_error",
      action,
    });
    return false;
  }
}

export function turnstileRequiredResponse() {
  return {
    error: "sync_unavailable",
    message:
      "Saved on this device. We could not sync it just yet, but we will try again.",
  };
}

const ALLOWED = new Set([
  "turnstile_validation_success",
  "turnstile_validation_failure",
  "anonymous_signin_attempt",
  "anonymous_signin_success",
  "anonymous_signin_failure",
  "plan_create_success",
  "plan_create_failure",
  "plan_item_add_success",
  "plan_item_add_failure",
  "plan_quota_block",
  "share_create_success",
  "share_create_failure",
  "share_rotate_success",
  "share_rotate_failure",
  "share_revoke_success",
  "public_share_open",
  "public_share_unknown_token",
  "public_share_revoked_token",
  "shared_plan_copy_success",
  "shared_plan_copy_failure",
  "cleanup_job_started",
  "cleanup_job_finished",
  "interest_capture_success",
]);

export function logSecurityEvent(
  name: string,
  detail?: Record<string, string | number | boolean | undefined>
) {
  if (!ALLOWED.has(name)) return;
  const payload = {
    event: name,
    ts: new Date().toISOString(),
    ...detail,
  };
  console.info(JSON.stringify(payload));
}

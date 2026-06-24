const ALLOWED_EVENTS = new Set([
  "plan_save_clicked",
  "plan_item_saved_local",
  "plan_item_synced",
  "plan_item_sync_failed",
  "plan_item_removed",
  "plan_item_undo",
  "plan_preview_opened",
  "plan_preview_closed",
  "plan_page_opened",
  "plan_overlap_displayed",
  "plan_email_prompt_shown",
  "plan_email_submitted",
  "plan_email_verified",
  "plan_magic_link_requested",
  "plan_cross_device_restored",
  "plan_share_created",
  "plan_share_copied",
  "plan_share_opened",
  "plan_share_revoked",
  "plan_share_rotated",
  "shared_plan_items_added",
  "plan_schedule_change_displayed",
  "plan_deleted",
]);

export function trackPlanEvent(
  name: string,
  detail?: Record<string, string | number | boolean>
) {
  if (!ALLOWED_EVENTS.has(name)) return;
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("plan-analytics", {
      detail: { name, ...detail, ts: Date.now() },
    })
  );
}

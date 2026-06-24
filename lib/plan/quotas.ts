export class PlanQuotaError extends Error {
  readonly code: "active_items" | "lifetime_items" | "share_rotations" | "copy_limit" | "snapshot_size" | "title_length";

  constructor(code: PlanQuotaError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "PlanQuotaError";
  }
}

export function getPlanQuotas() {
  return {
    maxActivePlansPerUser: 1,
    maxActiveItems: parseInt(process.env.PLAN_MAX_ACTIVE_ITEMS ?? "100", 10),
    maxLifetimeItems: parseInt(
      process.env.PLAN_MAX_LIFETIME_ITEMS ?? "250",
      10
    ),
    maxShareRotationsPerDay: parseInt(
      process.env.PLAN_MAX_SHARE_ROTATIONS_PER_DAY ?? "3",
      10
    ),
    maxCopyPerAction: parseInt(process.env.PLAN_MAX_COPY_PER_ACTION ?? "50", 10),
    maxTitleLength: parseInt(process.env.PLAN_MAX_TITLE_LENGTH ?? "80", 10),
    maxSnapshotJsonBytes: parseInt(
      process.env.PLAN_MAX_SNAPSHOT_BYTES ?? "8192",
      10
    ),
  };
}

export function quotaUserMessage(code: PlanQuotaError["code"]): string {
  switch (code) {
    case "active_items":
    case "lifetime_items":
      return "Your plan has a lot of ideas already. Remove a few before adding more.";
    case "share_rotations":
      return "We could not create a new share link right now. Your existing plan is still safe.";
    case "copy_limit":
      return "That is a big list of ideas. Try copying again with a smaller shared plan.";
    case "snapshot_size":
    case "title_length":
      return "That activity could not be saved right now. Try again with a shorter note.";
    default:
      return "We could not complete that just yet. Your plan is still safe here.";
  }
}

export function validateSnapshotSize(snapshot: Record<string, unknown> | undefined) {
  const quotas = getPlanQuotas();
  const bytes = Buffer.byteLength(JSON.stringify(snapshot ?? {}), "utf8");
  if (bytes > quotas.maxSnapshotJsonBytes) {
    throw new PlanQuotaError("snapshot_size", "Snapshot too large");
  }
}

export function sanitizePlanTitle(title: string): string {
  const quotas = getPlanQuotas();
  const trimmed = title.trim().replace(/[<>]/g, "");
  return trimmed.slice(0, quotas.maxTitleLength) || "My Rest Day Plan";
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanItem } from "@/lib/types/occurrence";
import { generateShareToken, hashShareToken } from "@/lib/plan/token";
import type {
  AddItemPayload,
  PlanMeta,
  PublicPlanItem,
  PublicPlanResponse,
  SourceStatus,
} from "@/lib/plan/types";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/daypart";
import {
  getPlanQuotas,
  PlanQuotaError,
  sanitizePlanTitle,
  validateSnapshotSize,
} from "@/lib/plan/quotas";
import { logSecurityEvent } from "@/lib/plan/security-log";
import { sanitizePlanSnapshotJson } from "@/lib/plan/snapshot";

type DbClient = SupabaseClient;

interface ItineraryRow {
  id: string;
  title: string;
  timezone: string;
  version: number;
  updated_at: string;
  owner_user_id: string;
}

interface ItemRow {
  id: string;
  itinerary_id: string;
  source_type: string;
  source_activity_id: string | null;
  source_occurrence_id: string | null;
  title: string;
  resort_id: string | null;
  resort_name: string;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  category: string | null;
  price_label: string | null;
  source_url: string | null;
  source_verified_at: string | null;
  saved_source_version: string | null;
  snapshot_json: Record<string, unknown> | null;
  user_note: string | null;
  sort_order: number | null;
  created_at: string;
}

interface AddItemOperationRow extends ItemRow {
  plan_id: string;
  plan_title: string;
  plan_timezone: string;
  plan_version: number;
  plan_updated_at: string;
  item_created: boolean;
}

interface PlanOperationRow {
  id: string;
  title: string;
  timezone: string;
  version: number;
  updated_at: string;
  owner_user_id: string;
}

interface ShareOperationRow {
  reused: boolean;
  share_id: string;
}

function rowToPlanItem(row: ItemRow): PlanItem {
  const snapshot = sanitizePlanSnapshotJson(row.snapshot_json ?? {}, {
    startDateTime: row.starts_at ?? undefined,
    endDateTime: row.ends_at ?? undefined,
  });
  const sourceStatus =
    (snapshot.sourceStatus as SourceStatus | undefined) ?? "current";
  return {
    id: row.id,
    activityCatalogId: row.source_activity_id ?? "",
    activitySlug: String(snapshot.activitySlug ?? ""),
    sourceOccurrenceId: row.source_occurrence_id ?? undefined,
    title: row.title,
    resortSlug: row.resort_id ?? "",
    resortName: row.resort_name,
    location: row.location ?? undefined,
    category: row.category ?? undefined,
    startDateTime: row.starts_at ?? undefined,
    endDateTime: row.ends_at ?? undefined,
    notes: row.user_note ?? undefined,
    addedAt: row.created_at,
    priceLabel: row.price_label ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceVerifiedAt: row.source_verified_at ?? undefined,
    savedSourceVersion: row.saved_source_version ?? undefined,
    sourceStatus,
    snapshotJson: snapshot,
  };
}

function rowToPlanMeta(row: PlanOperationRow): PlanMeta {
  return {
    id: row.id,
    title: row.title,
    timezone: row.timezone,
    version: Number(row.version),
    updatedAt: row.updated_at,
  };
}

function firstRpcRow<T>(data: T[] | T | null): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function quotaErrorFromMessage(message: string): PlanQuotaError | null {
  if (message.includes("Active item quota")) {
    return new PlanQuotaError("active_items", message);
  }
  if (message.includes("Lifetime item quota")) {
    return new PlanQuotaError("lifetime_items", message);
  }
  if (message.includes("Share rotation quota")) {
    return new PlanQuotaError("share_rotations", message);
  }
  return null;
}

export async function getActiveItinerary(
  client: DbClient,
  userId: string
): Promise<ItineraryRow | null> {
  const { data } = await client
    .from("itineraries")
    .select("id, title, timezone, version, updated_at, owner_user_id")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as ItineraryRow | null;
}

export async function createItinerary(
  client: DbClient,
  userId: string
): Promise<ItineraryRow> {
  const { data, error } = await client
    .from("itineraries")
    .insert({ owner_user_id: userId })
    .select("id, title, timezone, version, updated_at, owner_user_id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create plan");
  return data as ItineraryRow;
}

async function countActiveItems(
  client: DbClient,
  itineraryId: string
): Promise<number> {
  const { count } = await client
    .from("itinerary_items")
    .select("id", { count: "exact", head: true })
    .eq("itinerary_id", itineraryId)
    .is("deleted_at", null);
  return count ?? 0;
}

async function countLifetimeItems(
  client: DbClient,
  itineraryId: string
): Promise<number> {
  const { count } = await client
    .from("itinerary_items")
    .select("id", { count: "exact", head: true })
    .eq("itinerary_id", itineraryId);
  return count ?? 0;
}

async function countShareRotationsToday(
  client: DbClient,
  itineraryId: string
): Promise<number> {
  const startOfDay = formatInTimeZone(
    new Date(),
    TIMEZONE,
    "yyyy-MM-dd'T'00:00:00XXX"
  );
  const { count } = await client
    .from("itinerary_shares")
    .select("id", { count: "exact", head: true })
    .eq("itinerary_id", itineraryId)
    .gte("created_at", startOfDay);
  return count ?? 0;
}

async function assertCanAddItem(client: DbClient, itineraryId: string) {
  const quotas = getPlanQuotas();
  const active = await countActiveItems(client, itineraryId);
  if (active >= quotas.maxActiveItems) {
    logSecurityEvent("plan_quota_block", { type: "active_items", active });
    throw new PlanQuotaError("active_items", "Active item quota reached");
  }
  const lifetime = await countLifetimeItems(client, itineraryId);
  if (lifetime >= quotas.maxLifetimeItems) {
    logSecurityEvent("plan_quota_block", { type: "lifetime_items", lifetime });
    throw new PlanQuotaError("lifetime_items", "Lifetime item quota reached");
  }
}

export async function userHasActivePlan(
  client: DbClient,
  userId: string
): Promise<boolean> {
  const itinerary = await getActiveItinerary(client, userId);
  return Boolean(itinerary);
}

export async function getOrCreateItinerary(
  client: DbClient,
  userId: string
): Promise<ItineraryRow> {
  const { data, error } = await client.rpc("get_or_create_active_itinerary", {
    p_owner_user_id: userId,
  });
  const row = firstRpcRow<PlanOperationRow>(data as PlanOperationRow[] | null);
  if (error || !row) {
    throw new Error(error?.message ?? "Failed to create plan");
  }
  logSecurityEvent("plan_create_success", { itineraryId: row.id });
  return row as ItineraryRow;
}

export async function fetchPlanItems(
  client: DbClient,
  itineraryId: string
): Promise<PlanItem[]> {
  const { data } = await client
    .from("itinerary_items")
    .select("*")
    .eq("itinerary_id", itineraryId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  return ((data ?? []) as ItemRow[]).map(rowToPlanItem);
}

export async function fetchOwnerPlan(
  client: DbClient,
  userId: string
): Promise<{ plan: PlanMeta | null; items: PlanItem[] }> {
  const itinerary = await getActiveItinerary(client, userId);
  if (!itinerary) return { plan: null, items: [] };
  const items = await fetchPlanItems(client, itinerary.id);
  await client
    .from("itineraries")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", itinerary.id);
  return {
    plan: {
      id: itinerary.id,
      title: itinerary.title,
      timezone: itinerary.timezone,
      version: Number(itinerary.version),
      updatedAt: itinerary.updated_at,
    },
    items,
  };
}

async function isOperationProcessed(
  client: DbClient,
  operationId: string
): Promise<boolean> {
  const { data } = await client
    .from("processed_plan_operations")
    .select("operation_id")
    .eq("operation_id", operationId)
    .maybeSingle();
  return Boolean(data);
}

async function recordOperation(
  client: DbClient,
  userId: string,
  operationId: string,
  operationType: string,
  resultReference?: string
) {
  await client.from("processed_plan_operations").insert({
    operation_id: operationId,
    owner_user_id: userId,
    operation_type: operationType,
    result_reference: resultReference ?? null,
  });
}

export async function addPlanItem(
  client: DbClient,
  userId: string,
  payload: AddItemPayload
): Promise<{ plan: PlanMeta; item: PlanItem; created: boolean }> {
  const quotas = getPlanQuotas();
  const snapshotJson = sanitizePlanSnapshotJson(payload.snapshotJson, {
    startDateTime: payload.startsAt,
    endDateTime: payload.endsAt,
  });
  validateSnapshotSize(snapshotJson);

  const { data, error } = await client.rpc("add_itinerary_item_operation", {
    p_operation_id: payload.operationId,
    p_owner_user_id: userId,
    p_source_type: payload.sourceType ?? "scheduled_occurrence",
    p_source_activity_id: payload.sourceActivityId,
    p_source_occurrence_id: payload.sourceOccurrenceId ?? null,
    p_title: payload.title,
    p_resort_id: payload.resortId,
    p_resort_name: payload.resortName,
    p_location: payload.location ?? null,
    p_starts_at: payload.startsAt ?? null,
    p_ends_at: payload.endsAt ?? null,
    p_category: payload.category ?? null,
    p_price_label: payload.priceLabel ?? null,
    p_source_url: payload.sourceUrl ?? null,
    p_source_verified_at: payload.sourceVerifiedAt ?? null,
    p_saved_source_version: payload.savedSourceVersion ?? null,
    p_snapshot_json: {
      ...snapshotJson,
      activitySlug: snapshotJson.activitySlug,
    },
    p_user_note: payload.userNote ?? null,
    p_max_active_items: quotas.maxActiveItems,
    p_max_lifetime_items: quotas.maxLifetimeItems,
  });

  const quotaError = error ? quotaErrorFromMessage(error.message) : null;
  if (quotaError) throw quotaError;

  const row = firstRpcRow<AddItemOperationRow>(
    data as AddItemOperationRow[] | null
  );
  if (error || !row) {
    throw new Error(error?.message ?? "Failed to add item");
  }

  logSecurityEvent("plan_item_add_success", { itineraryId: row.plan_id });

  return {
    plan: {
      id: row.plan_id,
      title: row.plan_title,
      timezone: row.plan_timezone,
      version: Number(row.plan_version),
      updatedAt: row.plan_updated_at,
    },
    item: rowToPlanItem(row),
    created: Boolean(row.item_created),
  };
}

export async function removePlanItem(
  client: DbClient,
  userId: string,
  itemId: string,
  operationId: string
): Promise<PlanMeta> {
  const { data, error } = await client.rpc("remove_itinerary_item_operation", {
    p_operation_id: operationId,
    p_owner_user_id: userId,
    p_item_id: itemId,
  });
  const row = firstRpcRow<PlanOperationRow>(data as PlanOperationRow[] | null);
  if (error || !row) throw new Error(error?.message ?? "Plan missing after remove");
  return rowToPlanMeta(row);
}

export async function updatePlanItemNote(
  client: DbClient,
  userId: string,
  itemId: string,
  note: string,
  operationId: string
): Promise<PlanMeta> {
  const { data, error } = await client.rpc(
    "update_itinerary_item_note_operation",
    {
      p_operation_id: operationId,
      p_owner_user_id: userId,
      p_item_id: itemId,
      p_user_note: note,
    }
  );
  const row = firstRpcRow<PlanOperationRow>(data as PlanOperationRow[] | null);
  if (error || !row) throw new Error(error?.message ?? "Failed to update note");
  return rowToPlanMeta(row);
}

export async function renamePlan(
  client: DbClient,
  userId: string,
  title: string,
  operationId: string
): Promise<PlanMeta> {
  const safeTitle = sanitizePlanTitle(title);
  const { data, error } = await client.rpc("rename_itinerary_operation", {
    p_operation_id: operationId,
    p_owner_user_id: userId,
    p_title: safeTitle,
  });
  const row = firstRpcRow<PlanOperationRow>(data as PlanOperationRow[] | null);
  if (error || !row) throw new Error(error?.message ?? "Failed to rename plan");
  return rowToPlanMeta(row);
}

export async function deletePlan(
  client: DbClient,
  userId: string,
  operationId: string
): Promise<void> {
  const { error } = await client.rpc("delete_itinerary_operation", {
    p_operation_id: operationId,
    p_owner_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

function groupPublicItems(items: PlanItem[], timezone: string) {
  const byDate = new Map<string, PublicPlanItem[]>();

  for (const item of items) {
    const dateKey = item.startDateTime
      ? formatInTimeZone(new Date(item.startDateTime), timezone, "yyyy-MM-dd")
      : "anytime";

    const publicItem: PublicPlanItem = {
      title: item.title,
      resortName: item.resortName,
      location: item.location,
      startsAt: item.startDateTime,
      endsAt: item.endDateTime,
      category: item.category,
      priceLabel: item.priceLabel,
      sourceVerifiedAt: item.sourceVerifiedAt,
      sourceStatus: item.sourceStatus ?? "current",
    };

    const list = byDate.get(dateKey) ?? [];
    list.push(publicItem);
    byDate.set(dateKey, list);
  }

  const dates = [...byDate.entries()]
    .sort(([a], [b]) => {
      if (a === "anytime") return 1;
      if (b === "anytime") return -1;
      return a.localeCompare(b);
    })
    .map(([date, dateItems]) => ({
      date: date === "anytime" ? "Anytime ideas" : date,
      items: dateItems.sort((a, b) =>
        (a.startsAt ?? "").localeCompare(b.startsAt ?? "")
      ),
    }));

  return dates;
}

export async function createLiveShare(
  client: DbClient,
  userId: string,
  options: { rotate?: boolean } = {}
): Promise<{ token?: string; url?: string; reused: boolean }> {
  const token = generateShareToken();
  const tokenHash = hashShareToken(token);
  const quotas = getPlanQuotas();

  const { data, error } = await client.rpc("create_live_share_operation", {
    p_owner_user_id: userId,
    p_rotate: options.rotate === true,
    p_token_hash: tokenHash,
    p_max_rotations_per_day: quotas.maxShareRotationsPerDay,
  });

  const quotaError = error ? quotaErrorFromMessage(error.message) : null;
  if (quotaError) throw quotaError;

  const row = firstRpcRow<ShareOperationRow>(data as ShareOperationRow[] | null);
  if (error || !row) throw new Error(error?.message ?? "Failed to create share");

  if (row.reused) {
    logSecurityEvent("share_create_success", { reused: true });
    return { reused: true };
  }

  if (options.rotate) {
    logSecurityEvent("share_rotate_success", { shareId: row.share_id });
  } else {
    logSecurityEvent("share_create_success", { shareId: row.share_id });
  }

  return { token, url: `/p/${token}`, reused: false };
}

export async function revokeLiveShare(
  client: DbClient,
  userId: string
): Promise<void> {
  const { error } = await client.rpc("revoke_live_share_operation", {
    p_owner_user_id: userId,
  });
  if (error) throw new Error(error.message);
  logSecurityEvent("share_revoke_success", { userId });
}

export async function resolvePublicPlan(
  serviceClient: DbClient,
  token: string,
  viewerUserId?: string | null
): Promise<PublicPlanResponse | null> {
  const tokenHash = hashShareToken(token);
  const { data: share } = await serviceClient
    .from("itinerary_shares")
    .select("id, itinerary_id, status")
    .eq("token_hash", tokenHash)
    .eq("status", "active")
    .maybeSingle();

  if (!share) {
    logSecurityEvent("public_share_unknown_token");
    return null;
  }

  const { data: itinerary } = await serviceClient
    .from("itineraries")
    .select("id, title, timezone, updated_at, owner_user_id, status, deleted_at")
    .eq("id", share.itinerary_id)
    .maybeSingle();

  if (
    !itinerary ||
    itinerary.status !== "active" ||
    itinerary.deleted_at
  ) {
    return null;
  }

  await serviceClient
    .from("itinerary_shares")
    .update({
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", share.id);

  const items = await fetchPlanItems(serviceClient, itinerary.id);
  const ownerSession = Boolean(
    viewerUserId && viewerUserId === itinerary.owner_user_id
  );

  return {
    title: itinerary.title,
    timezone: itinerary.timezone,
    lastUpdatedAt: itinerary.updated_at,
    ownerSession,
    dates: groupPublicItems(items, itinerary.timezone),
  };
}

export async function copySharedPlanItems(
  userClient: DbClient,
  serviceClient: DbClient,
  userId: string,
  token: string,
  operationId: string
): Promise<{ added: number; skipped: number; items: PlanItem[] }> {
  const tokenHash = hashShareToken(token);
  const { data: share } = await serviceClient
    .from("itinerary_shares")
    .select("itinerary_id")
    .eq("token_hash", tokenHash)
    .eq("status", "active")
    .maybeSingle();

  if (!share) throw new Error("Share not found");

  const sourceItems = await fetchPlanItems(serviceClient, share.itinerary_id);
  const { items: existingItems } = await fetchOwnerPlan(userClient, userId);
  const existingKeys = new Set(
    existingItems.map(
      (i) => i.sourceOccurrenceId ?? i.activityCatalogId
    )
  );

  let added = 0;
  let skipped = 0;
  const quotas = getPlanQuotas();
  let copiedThisAction = 0;

  for (const source of sourceItems) {
    if (copiedThisAction >= quotas.maxCopyPerAction) {
      skipped += 1;
      continue;
    }

    const key = source.sourceOccurrenceId ?? source.activityCatalogId;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    const result = await addPlanItem(userClient, userId, {
      operationId: crypto.randomUUID(),
      sourceActivityId: source.activityCatalogId,
      sourceOccurrenceId: source.sourceOccurrenceId,
      title: source.title,
      resortId: source.resortSlug,
      resortName: source.resortName,
      location: source.location,
      startsAt: source.startDateTime,
      endsAt: source.endDateTime,
      category: source.category,
      priceLabel: source.priceLabel,
      sourceUrl: source.sourceUrl,
      sourceVerifiedAt: source.sourceVerifiedAt,
      savedSourceVersion: source.savedSourceVersion,
      snapshotJson: {
        ...source.snapshotJson,
        activitySlug: source.activitySlug,
      },
    });

    if (result.created) {
      added += 1;
      copiedThisAction += 1;
      existingKeys.add(key);
    } else {
      skipped += 1;
    }
  }

  await recordOperation(userClient, userId, operationId, "copy_shared_plan");
  logSecurityEvent("shared_plan_copy_success", { added, skipped });
  const { items } = await fetchOwnerPlan(userClient, userId);
  return { added, skipped, items };
}

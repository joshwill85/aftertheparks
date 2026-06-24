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

function rowToPlanItem(row: ItemRow): PlanItem {
  const snapshot = row.snapshot_json ?? {};
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
  const existing = await getActiveItinerary(client, userId);
  if (existing) return existing;
  const created = await createItinerary(client, userId);
  logSecurityEvent("plan_create_success", { itineraryId: created.id });
  return created;
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
  if (await isOperationProcessed(client, payload.operationId)) {
    const { plan, items } = await fetchOwnerPlan(client, userId);
    if (!plan) throw new Error("Plan not found after idempotent replay");
    const existing = items.find(
      (i) =>
        (payload.sourceOccurrenceId &&
          i.sourceOccurrenceId === payload.sourceOccurrenceId) ||
        i.activityCatalogId === payload.sourceActivityId
    );
    if (!existing) throw new Error("Idempotent item missing");
    return { plan, item: existing, created: false };
  }

  const itinerary = await getOrCreateItinerary(client, userId);
  await assertCanAddItem(client, itinerary.id);
  validateSnapshotSize(payload.snapshotJson);

  if (payload.sourceOccurrenceId) {
    const { data: dup } = await client
      .from("itinerary_items")
      .select("*")
      .eq("itinerary_id", itinerary.id)
      .eq("source_occurrence_id", payload.sourceOccurrenceId)
      .is("deleted_at", null)
      .maybeSingle();
    if (dup) {
      await recordOperation(
        client,
        userId,
        payload.operationId,
        "add_item",
        (dup as ItemRow).id
      );
      const { plan } = await fetchOwnerPlan(client, userId);
      return {
        plan: plan!,
        item: rowToPlanItem(dup as ItemRow),
        created: false,
      };
    }
  }

  const { data: inserted, error } = await client
    .from("itinerary_items")
    .insert({
      itinerary_id: itinerary.id,
      source_type: payload.sourceType ?? "scheduled_occurrence",
      source_activity_id: payload.sourceActivityId,
      source_occurrence_id: payload.sourceOccurrenceId ?? null,
      title: payload.title.slice(0, 500),
      resort_id: payload.resortId,
      resort_name: payload.resortName.slice(0, 200),
      location: payload.location?.slice(0, 300) ?? null,
      starts_at: payload.startsAt ?? null,
      ends_at: payload.endsAt ?? null,
      category: payload.category ?? null,
      price_label: payload.priceLabel ?? null,
      source_url: payload.sourceUrl ?? null,
      source_verified_at: payload.sourceVerifiedAt ?? null,
      saved_source_version: payload.savedSourceVersion ?? null,
      snapshot_json: {
        ...(payload.snapshotJson ?? {}),
        activitySlug: payload.snapshotJson?.activitySlug,
        sourceStatus: "current",
      },
      user_note: payload.userNote ?? null,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to add item");
  }

  await client
    .from("itineraries")
    .update({ version: Number(itinerary.version) + 1 })
    .eq("id", itinerary.id);

  await recordOperation(
    client,
    userId,
    payload.operationId,
    "add_item",
    (inserted as ItemRow).id
  );

  logSecurityEvent("plan_item_add_success", { itineraryId: itinerary.id });

  const { plan } = await fetchOwnerPlan(client, userId);
  return {
    plan: plan!,
    item: rowToPlanItem(inserted as ItemRow),
    created: true,
  };
}

export async function removePlanItem(
  client: DbClient,
  userId: string,
  itemId: string,
  operationId: string
): Promise<PlanMeta> {
  if (await isOperationProcessed(client, operationId)) {
    const { plan } = await fetchOwnerPlan(client, userId);
    if (!plan) throw new Error("Plan not found");
    return plan;
  }

  const itinerary = await getActiveItinerary(client, userId);
  if (!itinerary) throw new Error("No active plan");

  await client
    .from("itinerary_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("itinerary_id", itinerary.id);

  await client
    .from("itineraries")
    .update({ version: Number(itinerary.version) + 1 })
    .eq("id", itinerary.id);

  await recordOperation(client, userId, operationId, "remove_item", itemId);
  const { plan } = await fetchOwnerPlan(client, userId);
  if (!plan) throw new Error("Plan missing after remove");
  return plan;
}

export async function renamePlan(
  client: DbClient,
  userId: string,
  title: string,
  operationId: string
): Promise<PlanMeta> {
  if (await isOperationProcessed(client, operationId)) {
    const { plan } = await fetchOwnerPlan(client, userId);
    if (!plan) throw new Error("Plan not found");
    return plan;
  }

  const itinerary = await getOrCreateItinerary(client, userId);
  const safeTitle = sanitizePlanTitle(title);

  await client
    .from("itineraries")
    .update({
      title: safeTitle,
      version: Number(itinerary.version) + 1,
    })
    .eq("id", itinerary.id);

  await recordOperation(client, userId, operationId, "rename_plan");
  const { plan } = await fetchOwnerPlan(client, userId);
  return plan!;
}

export async function deletePlan(
  client: DbClient,
  userId: string,
  operationId: string
): Promise<void> {
  if (await isOperationProcessed(client, operationId)) return;

  const itinerary = await getActiveItinerary(client, userId);
  if (!itinerary) {
    await recordOperation(client, userId, operationId, "delete_plan");
    return;
  }

  const now = new Date().toISOString();
  await client
    .from("itinerary_shares")
    .update({ status: "revoked", revoked_at: now })
    .eq("itinerary_id", itinerary.id)
    .eq("status", "active");

  await client
    .from("itineraries")
    .update({
      status: "deleted",
      deleted_at: now,
      version: Number(itinerary.version) + 1,
    })
    .eq("id", itinerary.id);

  await recordOperation(client, userId, operationId, "delete_plan");
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
  const itinerary = await getActiveItinerary(client, userId);
  if (!itinerary) throw new Error("No plan to share");

  const { data: existingShare } = await client
    .from("itinerary_shares")
    .select("id")
    .eq("itinerary_id", itinerary.id)
    .eq("status", "active")
    .maybeSingle();

  if (existingShare && !options.rotate) {
    logSecurityEvent("share_create_success", { reused: true });
    return { reused: true };
  }

  if (options.rotate) {
    const rotationsToday = await countShareRotationsToday(client, itinerary.id);
    const quotas = getPlanQuotas();
    if (rotationsToday >= quotas.maxShareRotationsPerDay) {
      logSecurityEvent("plan_quota_block", { type: "share_rotations", rotationsToday });
      throw new PlanQuotaError("share_rotations", "Share rotation quota reached");
    }
  }

  const now = new Date().toISOString();
  await client
    .from("itinerary_shares")
    .update({ status: "revoked", revoked_at: now })
    .eq("itinerary_id", itinerary.id)
    .eq("status", "active");

  const token = generateShareToken();
  const tokenHash = hashShareToken(token);

  const { error } = await client.from("itinerary_shares").insert({
    itinerary_id: itinerary.id,
    token_hash: tokenHash,
    status: "active",
  });

  if (error) throw new Error(error.message);

  if (options.rotate) {
    logSecurityEvent("share_rotate_success", { itineraryId: itinerary.id });
  } else {
    logSecurityEvent("share_create_success", { itineraryId: itinerary.id });
  }

  return { token, url: `/p/${token}`, reused: false };
}

export async function revokeLiveShare(
  client: DbClient,
  userId: string
): Promise<void> {
  const itinerary = await getActiveItinerary(client, userId);
  if (!itinerary) return;
  await client
    .from("itinerary_shares")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("itinerary_id", itinerary.id)
    .eq("status", "active");
  logSecurityEvent("share_revoke_success", { itineraryId: itinerary.id });
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

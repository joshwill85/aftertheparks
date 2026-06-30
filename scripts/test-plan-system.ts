import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { findPlanConflicts } from "@/lib/plan/conflicts";
import { generateIcs } from "@/lib/plan/ics";
import {
  activityToPlanSnapshot,
  sanitizePlanSnapshotJson,
} from "@/lib/plan/snapshot";
import { buildMagicCheck } from "@/lib/plan/magicCheck";
import type { ActivityOccurrence, PlanItem } from "@/lib/types/occurrence";

const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    failures.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

function readMigrations() {
  return readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => read(join("supabase/migrations", file)))
    .join("\n\n");
}

const allMigrations = readMigrations();

function samplePlanItem(overrides: Partial<PlanItem>): PlanItem {
  return {
    id: overrides.id ?? "sample",
    activityCatalogId: overrides.activityCatalogId ?? "sample",
    activitySlug: overrides.activitySlug ?? "sample",
    title: overrides.title ?? "Sample Activity",
    resortSlug: overrides.resortSlug ?? "polynesian-village-resort",
    resortName: overrides.resortName ?? "Polynesian Village Resort",
    addedAt: overrides.addedAt ?? "2026-06-25T10:00:00-04:00",
    ...overrides,
  };
}

check("turnstile client config is browser-safe", () => {
  const config = read("lib/turnstile/config.ts");
  const browser = read("lib/turnstile/browser.ts");
  assert.match(config, /isTurnstileClientConfigured/);
  assert.match(config, /isTurnstileServerConfigured/);
  assert.match(browser, /isTurnstileClientConfigured/);
  assert.doesNotMatch(
    browser,
    /import\s+\{\s*getTurnstileSiteKey,\s*isTurnstileConfigured\s*\}/
  );
});

check("database enforces one active plan per owner", () => {
  const auditMigration = read(
    "supabase/migrations/20260625190000_plan_system_audit_fixes.sql"
  );
  const duplicateCleanupIndex = auditMigration.indexOf(
    "ranked_active_itineraries"
  );
  const uniqueIndex = auditMigration.indexOf(
    "create unique index if not exists itineraries_one_active_per_owner_idx"
  );

  assert.ok(
    duplicateCleanupIndex >= 0 && duplicateCleanupIndex < uniqueIndex,
    "migration must archive duplicate active plans before creating the unique index"
  );
  assert.match(
    allMigrations,
    /create unique index(?: if not exists)? itineraries_one_active_per_owner_idx[\s\S]+on public\.itineraries \(owner_user_id\)[\s\S]+where status = 'active' and deleted_at is null/i
  );
  assert.match(allMigrations, /get_or_create_active_itinerary/);
  assert.match(read("lib/plan/server.ts"), /\.rpc\("get_or_create_active_itinerary"/);
});

check("optional stay settings are persisted through plan contract", () => {
  const migrations = allMigrations;
  const server = read("lib/plan/server.ts");
  const types = read("lib/plan/types.ts");
  const localStore = read("lib/plan/local-store.ts");
  const syncClient = read("lib/plan/sync-client.ts");
  const apiRoute = read("app/api/plan/route.ts");

  assert.match(migrations, /home_resort_slug text/);
  assert.match(migrations, /references public\.resorts \(slug\)/);
  assert.match(migrations, /trip_start_date is null and trip_end_date is null/);
  assert.match(migrations, /trip_start_date <= trip_end_date/);
  assert.match(migrations, /create or replace function public\.update_itinerary_settings_operation/);
  assert.match(migrations, /'update_plan_settings'/);
  assert.match(
    migrations,
    /grant execute on function public\.update_itinerary_settings_operation\(uuid, uuid, text, date, date\) to authenticated/
  );

  assert.match(types, /homeResortSlug\?: string/);
  assert.match(types, /tripStartDate\?: string/);
  assert.match(types, /tripEndDate\?: string/);
  assert.match(localStore, /homeResortSlug: null/);
  assert.match(localStore, /update_plan_settings/);
  assert.match(syncClient, /syncUpdatePlanSettings/);
  assert.match(syncClient, /update_plan_settings/);
  assert.match(server, /\.rpc\("update_itinerary_settings_operation"/);
  assert.match(server, /home_resort_slug/);
  assert.match(apiRoute, /updatePlanSettings/);
});

check("stay details form is compact and avoids redundant optional copy", () => {
  const stayDetails = read("components/plan/PlanStayDetails.tsx");
  const polish = read("src/styles/polish.css");

  assert.doesNotMatch(stayDetails, /Optional stay shell/i);
  assert.doesNotMatch(stayDetails, /You can still use the full site without this/i);
  assert.match(stayDetails, /className="plan-stay-details/);
  assert.match(stayDetails, /className="plan-stay-details__fields"/);
  assert.match(stayDetails, /className="form-control plan-stay-details__control"/);
  assert.match(polish, /\.plan-stay-details__fields[\s\S]+repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(polish, /\.plan-stay-details__control[\s\S]+min-height: 3\.5rem/);
  assert.match(polish, /\.plan-stay-details__control[\s\S]+text-align: center/);
});

check("core plan mutations are transactional RPCs", () => {
  const auditMigration = read(
    "supabase/migrations/20260625190000_plan_system_audit_fixes.sql"
  );
  const server = read("lib/plan/server.ts");
  for (const fn of [
    "add_itinerary_item_operation",
    "remove_itinerary_item_operation",
    "rename_itinerary_operation",
    "delete_itinerary_operation",
    "create_live_share_operation",
    "revoke_live_share_operation",
  ]) {
    assert.match(allMigrations, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(server, new RegExp(`\\.rpc\\("${fn}"`));
  }
  assert.doesNotMatch(
    auditMigration,
    /select\s+\*\s+into\s+v_itinerary\s+from\s+public\.get_or_create_active_itinerary/i,
    "RPCs must not select a 6-column helper result directly into itineraries%rowtype"
  );
});

check("local migration preserves unsynced items after first server save", () => {
  const migrate = read("lib/plan/migrate.ts");
  const provider = read("components/atlas/PlanProvider.tsx");
  assert.doesNotMatch(
    migrate,
    /if \(cache\.planId \|\| cache\.items\.length === 0\) return cache;/
  );
  assert.match(migrate, /skipItemIds/);
  assert.match(provider, /migrateLocalItemsToServer\(synced,\s*\{/);
});

check("notes are durable and reorder drag is not exposed", () => {
  const provider = read("components/atlas/PlanProvider.tsx");
  const itemRoute = read("app/api/plan/items/[itemId]/route.ts");
  const timeline = read("components/plan/PlanTimeline.tsx");
  assert.match(provider, /syncUpdateItem/);
  assert.match(
    provider,
    /latestLocalAddItem/,
    "add sync must inspect the latest local item before replacing optimistic state"
  );
  assert.match(
    provider,
    /syncUpdateItem\(\s*result\.item\.id,\s*latestAddNote/,
    "add sync must patch notes that changed while the add request was in flight"
  );
  assert.match(itemRoute, /export async function PATCH/);
  assert.doesNotMatch(timeline, /@dnd-kit/);
  assert.doesNotMatch(timeline, /SortableContext|DndContext|onDragEnd/);
});

check("undo cancels a pending local remove before issuing add", () => {
  const provider = read("components/atlas/PlanProvider.tsx");
  assert.match(provider, /removeOperationId/);
  assert.match(provider, /cancelPendingRemove/);
  assert.doesNotMatch(provider, /void queueAndSyncAdd\([\s\S]+undoItem[\s\S]+false\s*\)/);
});

check("save state uses occurrence identity before catalog fallback", () => {
  const snapshot = read("lib/plan/snapshot.ts");
  const activityCard = read("components/activity/ActivityCard.tsx");
  const nightCard = read("components/tonight/NightActivityCard.tsx");
  const detail = read("components/atlas/ActivityDetailClient.tsx");
  assert.match(snapshot, /isActivityOccurrenceSaved/);
  assert.match(activityCard, /isActivitySaved\(activity\)/);
  assert.match(nightCard, /isActivitySaved\(activity\)/);
  assert.match(detail, /isActivitySaved\(activity\)/);
});

check("every activity-style card can add itself to My Plan", () => {
  const activityCard = read("components/activity/ActivityCard.tsx");
  const nightCard = read("components/tonight/NightActivityCard.tsx");
  const calendar = read("components/atlas/CalendarClient.tsx");
  const movies = read("components/movies/MovieListingCard.tsx");
  const saveButton = read("components/activity/SaveButton.tsx");

  assert.match(activityCard, /const \{\s*addActivity,\s*isActivitySaved\s*\} = usePlan\(\)/);
  assert.match(activityCard, /addActivity\(activity\)/);
  assert.doesNotMatch(activityCard, /onSave=\{onSave \? \(\) => onSave\(activity\) : undefined\}/);

  assert.match(nightCard, /const \{\s*addActivity,\s*isActivitySaved\s*\} = usePlan\(\)/);
  assert.match(nightCard, /addActivity\(activity\)/);
  assert.doesNotMatch(nightCard, /onSave=\{onSave \? \(\) => onSave\(activity\) : undefined\}/);

  assert.match(calendar, /const \{\s*addActivity,\s*isActivitySaved\s*\} = usePlan\(\)/);
  assert.match(calendar, /onSave=\{\(\) => addActivity\(activity\)\}/);
  assert.match(calendar, /const saved = isActivitySaved\(activity\)/);
  assert.match(calendar, /saved=\{saved\}/);

  assert.match(movies, /movieToPlanActivity/);
  assert.match(movies, /addActivity\(planActivity\)/);
  assert.match(movies, /saved=\{isActivitySaved\(planActivity\)\}/);

  assert.match(saveButton, /Add to My Plan/);
});

check("legacy snapshot shares no longer auto-import", () => {
  const legacyPage = read("app/plan/[shareId]/page.tsx");
  const legacyApi = read("app/api/plan/share/[slug]/route.ts");
  assert.doesNotMatch(legacyPage, /PlanShareClient|savePlanItems/);
  assert.match(legacyPage, /View-only legacy shared plan/);
  assert.match(legacyApi, /status:\s*410/);
});

check("share reuse after reload has explicit owner controls", () => {
  const provider = read("components/atlas/PlanProvider.tsx");
  const page = read("components/atlas/PlanPageClient.tsx");
  const route = read("app/api/plan/share/route.ts");
  assert.match(provider, /hasExistingShare/);
  assert.match(provider, /setHasExistingShare\(true\)/);
  assert.match(page, /A share link already exists/);
  assert.match(route, /hasExistingShare/);
});

check("preview is scrollable on mobile and has an accessible name", () => {
  const preview = read("components/plan/PlanPreview.tsx");
  assert.match(preview, /id="plan-preview-title"/);
  assert.match(preview, /overflow-y-auto/);
  assert.match(preview, /overscroll-contain/);
});

check("unknown end times do not produce false conflicts", () => {
  const items = [
    {
      id: "a",
      activityCatalogId: "a",
      title: "A",
      resortName: "One",
      addedAt: "2026-06-25T10:00:00-04:00",
      startDateTime: "2026-06-25T10:00:00-04:00",
    },
    {
      id: "b",
      activityCatalogId: "b",
      title: "B",
      resortName: "Two",
      addedAt: "2026-06-25T10:30:00-04:00",
      startDateTime: "2026-06-25T10:30:00-04:00",
      endDateTime: "2026-06-25T11:00:00-04:00",
    },
  ] as PlanItem[];
  assert.deepEqual(findPlanConflicts(items), []);
});

check("plan snapshots do not persist internal no-time schedule text", () => {
  const activity = {
    id: "boardwalk-poolside-untimed",
    activityCatalogId: "poolside-activities",
    activitySlug: "poolside-activities",
    title: "Poolside Activities",
    resort: {
      slug: "boardwalk-inn",
      name: "BoardWalk Inn",
      tier: "Deluxe",
      area: "epcot",
    },
    location: { label: "Luna Park Pool" },
    category: "poolside",
    daypart: "anytime",
    price: { state: "unknown" },
    eligibility: { ages: ["all_ages"] },
    freshness: {
      sourceUrl: "https://example.com/source.pdf",
      lastVerified: "2026-06-25T12:00:00.000Z",
      badge: "verified",
    },
    summary: "Join us for family-friendly activities.",
    scheduleText: "Activities schedule available digitally; no posted time in PDF",
    status: "active",
  } as ActivityOccurrence;

  const snapshot = activityToPlanSnapshot(activity);

  assert.equal(snapshot.snapshotJson?.scheduleText, undefined);
});

check("server plan snapshot sanitizer drops stale internal schedule text", () => {
  const snapshot = sanitizePlanSnapshotJson({
    activitySlug: "poolside-activities",
    scheduleText: "Activities schedule available digitally; no posted time in PDF",
  });

  assert.deepEqual(snapshot, { activitySlug: "poolside-activities" });
});

check("server plan read path sanitizes legacy snapshot json", () => {
  const server = read("lib/plan/server.ts");
  assert.match(
    server,
    /sanitizePlanSnapshotJson\(row\.snapshot_json/,
    "rowToPlanItem must scrub persisted legacy snapshot_json before returning plan items"
  );
});

check("plan items expose key details and source context", () => {
  const item = read("components/plan/PlanItem.tsx");
  assert.match(item, /item\.location/);
  assert.match(item, /item\.category/);
  assert.match(item, /item\.priceLabel/);
  assert.match(item, /item\.sourceVerifiedAt/);
  assert.match(item, /item\.sourceUrl/);
  assert.match(item, /reservationRequired/);
});

check("untimed plan items omit empty time rows", () => {
  const item = read("components/plan/PlanItem.tsx");
  assert.doesNotMatch(item, /\{!item\.startDateTime\s*&&\s*\(/);
  assert.match(item, /\{!item\.startDateTime\s*&&\s*time\.label\s*&&\s*\(/);
});

check("calendar export does not invent events or end times", () => {
  const untimed = {
    id: "untimed",
    activityCatalogId: "poolside-activities",
    title: "Poolside Activities",
    resortName: "BoardWalk Inn",
    addedAt: "2026-06-25T10:00:00-04:00",
  } as PlanItem;
  const startOnly = {
    id: "start-only",
    activityCatalogId: "movie-under-the-stars",
    title: "Movie Under the Stars",
    resortName: "BoardWalk Inn",
    addedAt: "2026-06-25T10:00:00-04:00",
    startDateTime: "2026-06-25T20:30:00-04:00",
  } as PlanItem;

  const untimedIcs = generateIcs([untimed]);
  assert.doesNotMatch(untimedIcs, /BEGIN:VEVENT/);
  assert.doesNotMatch(untimedIcs, /DTSTART/);

  const startOnlyIcs = generateIcs([startOnly]);
  assert.match(startOnlyIcs, /BEGIN:VEVENT/);
  assert.match(startOnlyIcs, /DTSTART;TZID=America\/New_York:20260625T203000/);
  assert.doesNotMatch(startOnlyIcs, /DTEND/);
});

check("magic check labels realistic plan risk without inventing travel times", () => {
  const overlap = buildMagicCheck([
    samplePlanItem({
      id: "a",
      title: "Campfire A",
      startDateTime: "2026-06-25T18:00:00-04:00",
      endDateTime: "2026-06-25T18:45:00-04:00",
    }),
    samplePlanItem({
      id: "b",
      title: "Movie B",
      startDateTime: "2026-06-25T18:30:00-04:00",
      endDateTime: "2026-06-25T19:30:00-04:00",
    }),
  ]);
  assert.equal(overlap.label, "Too tight");
  assert.ok(
    overlap.issues.some(
      (issue) =>
        issue.label === "Two activities overlap" &&
        issue.actionLabel === "Remove one"
    )
  );

  const tightHop = buildMagicCheck([
    samplePlanItem({
      id: "poly",
      resortSlug: "polynesian-village-resort",
      resortName: "Polynesian Village Resort",
      startDateTime: "2026-06-25T18:00:00-04:00",
      endDateTime: "2026-06-25T18:45:00-04:00",
    }),
    samplePlanItem({
      id: "fort",
      resortSlug: "fort-wilderness-resort",
      resortName: "Fort Wilderness Resort",
      startDateTime: "2026-06-25T19:05:00-04:00",
      endDateTime: "2026-06-25T19:35:00-04:00",
    }),
  ]);
  assert.ok(
    tightHop.issues.some(
      (issue) =>
        issue.label === "This resort hop may be tight" &&
        issue.detail.includes("Confirm transportation") &&
        !/\b\d+\s*(minute|min)\b/i.test(issue.detail)
    ),
    "tight resort hop should warn without inventing exact travel time"
  );

  const weatherAndRules = buildMagicCheck([
    samplePlanItem({
      id: "campfire",
      title: "Campfire",
      category: "campfire",
      priceLabel: "Price not listed",
      snapshotJson: {
        weatherSensitive: true,
        access: "Resort guests only",
        reservationRequired: true,
      },
    }),
  ]);
  assert.equal(weatherAndRules.label, "Needs backup");
  for (const expected of [
    "Outdoor activity may need a backup",
    "Access may be limited",
    "Reservation required",
    "Cost unclear",
  ]) {
    assert.ok(
      weatherAndRules.issues.some((issue) => issue.label === expected),
      `Magic Check should include ${expected}`
    );
  }

  const easy = buildMagicCheck([
    samplePlanItem({
      id: "easy",
      title: "Arcade",
      category: "arcade",
      priceLabel: "Free",
      startDateTime: "2026-06-25T17:00:00-04:00",
      endDateTime: "2026-06-25T17:30:00-04:00",
    }),
  ]);
  assert.equal(easy.label, "Easy plan");
});

check("public shared plan refreshes live data", () => {
  const publicPlan = read("components/plan/PublicPlanClient.tsx");
  assert.match(publicPlan, /setPlan/);
  assert.match(publicPlan, /\/api\/shared-plan\/\$\{encodeURIComponent\(token\)\}/);
  assert.match(publicPlan, /visibilitychange|setInterval|focus/);
});

check("public shared plan renders a read-only resort day ticket", () => {
  const publicPlan = read("components/plan/PublicPlanClient.tsx");
  const magicCheck = read("components/plan/PlanMagicCheck.tsx");

  assert.match(publicPlan, /Resort Day Ticket/);
  assert.match(publicPlan, /PlanMagicCheck/);
  assert.match(publicPlan, /readOnly/);
  assert.match(publicPlan, /PLAN_SECTION_ORDER/);
  assert.match(publicPlan, /PLAN_SECTION_META/);
  assert.match(publicPlan, /Weather caveats/);
  assert.match(publicPlan, /Source and freshness/);
  assert.match(publicPlan, /Transportation disclosures/);
  assert.doesNotMatch(publicPlan, /Edit my plan/);
  assert.doesNotMatch(publicPlan, /Share plan/);
  assert.doesNotMatch(publicPlan, /Add to calendar/);

  assert.match(magicCheck, /Magic Check/);
  assert.match(magicCheck, /buildMagicCheck/);
  assert.match(magicCheck, /readOnly/);
  assert.match(magicCheck, /Find backup/);
  assert.match(magicCheck, /Add travel buffer/);
});

check("plan transport connections are rendered from source-backed graph data", () => {
  const timeline = read("components/plan/PlanTimeline.tsx");
  const publicPlan = read("components/plan/PublicPlanClient.tsx");
  const transportEdge = read("components/plan/PlanTransportEdge.tsx");
  const planTypes = read("lib/plan/types.ts");
  const planServer = read("lib/plan/server.ts");
  const transport = read("lib/plan/transportConnections.ts");
  const hook = read("lib/plan/useTransportConnections.ts");

  assert.match(planTypes, /resortSlug: string/);
  assert.match(planServer, /resortSlug: item\.resortSlug/);
  assert.match(timeline, /useTransportConnectionsForItems\(items\)/);
  assert.match(timeline, /PlanTransportEdge/);
  assert.match(publicPlan, /PlanTransportEdge/);
  assert.match(transportEdge, /transportOptions\?\.slice\(1\)/);
  assert.match(transportEdge, /Show \$\{secondaryOptions\.length\} more/);
  assert.match(transportEdge, /originResortName|destinationResortName/);
  assert.match(transportEdge, /Confirm current transportation day-of/);
  assert.match(publicPlan, /publicItemToPlanItem/);
  assert.match(transport, /transportConnectionPairsForItems/);
  assert.match(transport, /Confirm current transportation day-of/);
  assert.match(hook, /v_public_wdw_transport_connection_options/);
});

check("plan routes enforce plan-specific rate limits", () => {
  for (const path of [
    "app/api/plan/items/route.ts",
    "app/api/plan/items/[itemId]/route.ts",
    "app/api/plan/route.ts",
    "app/api/plan/share/route.ts",
    "app/api/plan/share/rotate/route.ts",
    "app/api/plan/interest/route.ts",
    "app/api/shared-plan/[token]/route.ts",
  ]) {
    assert.match(read(path), /guardRateLimit/);
  }
});

check("analytics events are wired for prompt, overlap, share open, and schedule warnings", () => {
  const analytics = read("lib/plan/analytics.ts");
  const preview = read("components/plan/PlanPreview.tsx");
  const planPage = read("components/atlas/PlanPageClient.tsx");
  const publicPlan = read("components/plan/PublicPlanClient.tsx");
  const item = read("components/plan/PlanItem.tsx");
  assert.doesNotMatch(preview, /plan_interest_submitted/);
  assert.match(analytics, /plan_email_submitted/);
  assert.match(preview, /plan_email_prompt_shown/);
  assert.match(preview, /plan_email_submitted/);
  assert.match(planPage, /plan_overlap_displayed/);
  assert.match(publicPlan, /plan_share_opened/);
  assert.match(item, /plan_schedule_change_displayed/);
});

if (failures.length > 0) {
  console.error(`Plan system contract failures (${failures.length}):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Plan system contracts passed.");

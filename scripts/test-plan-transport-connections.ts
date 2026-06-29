import assert from "node:assert/strict";
import {
  buildTransportConnectionMap,
  connectionOptionsForPair,
  dedupeAndRankTransportOptions,
  transportConnectionPairsForItems,
  transportPairKey,
  type PlanTransportConnectionOption,
} from "../lib/plan/transportConnections";
import { buildPlanDaybookPath } from "../lib/plan/daybookPath";
import type { PlanItem } from "../lib/types/occurrence";

function item(
  id: string,
  resortSlug: string,
  resortName: string,
  startDateTime?: string,
  endDateTime?: string
): PlanItem {
  return {
    id,
    activityCatalogId: id,
    activitySlug: id,
    title: id,
    resortSlug,
    resortName,
    category: "resort_activity",
    startDateTime,
    endDateTime,
    addedAt: "2026-06-28T12:00:00.000Z",
  };
}

function option(
  id: string,
  mode: PlanTransportConnectionOption["transportMode"],
  transferCount: number,
  routeLabel: string,
  overrides: Partial<PlanTransportConnectionOption> = {}
): PlanTransportConnectionOption {
  return {
    id,
    originResortSlug: "polynesian-village-resort",
    originName: "Disney's Polynesian Village Resort",
    destinationResortSlug: "grand-floridian-resort-and-spa",
    destinationName: "Disney's Grand Floridian Resort & Spa",
    transportMode: mode,
    routeLabel,
    routeColorOrFlag: null,
    serviceType: "adjacent_segment",
    directness: "direct",
    transferCount,
    viaPlaceIds: [],
    viaPlaceNames: [],
    evidenceLevel: "official_stops_sequence_operational_common",
    sourceIds: ["official_monorail_transportation"],
    notes: [],
    optionKind: "od_service",
    ...overrides,
  };
}

const planItems = [
  item(
    "poly-movie",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "2026-07-02T23:00:00.000Z",
    "2026-07-02T23:45:00.000Z"
  ),
  item(
    "same-resort-craft",
    "contemporary-resort",
    "Contemporary Resort",
    "2026-07-02T17:00:00.000Z",
    "2026-07-02T17:45:00.000Z"
  ),
  item(
    "same-resort-pool",
    "contemporary-resort",
    "Contemporary Resort",
    "2026-07-02T18:15:00.000Z",
    "2026-07-02T18:45:00.000Z"
  ),
  item(
    "gf-dance",
    "grand-floridian-resort-and-spa",
    "Grand Floridian Resort & Spa",
    "2026-07-02T19:30:00.000Z",
    "2026-07-02T20:00:00.000Z"
  ),
  item(
    "next-day",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "2026-07-03T00:30:00.000Z",
    "2026-07-03T01:00:00.000Z"
  ),
  item("untimed", "boardwalk-inn", "BoardWalk Inn"),
];

assert.deepEqual(
  transportConnectionPairsForItems(planItems),
  [
    {
      originResortSlug: "contemporary-resort",
      originResortName: "Contemporary Resort",
      destinationResortSlug: "grand-floridian-resort-and-spa",
      destinationResortName: "Grand Floridian Resort & Spa",
    },
    {
      originResortSlug: "grand-floridian-resort-and-spa",
      originResortName: "Grand Floridian Resort & Spa",
      destinationResortSlug: "polynesian-village-resort",
      destinationResortName: "Polynesian Village Resort",
    },
  ],
  "Only consecutive same-day cross-resort timed stops should create lookup pairs"
);

assert.equal(
  transportPairKey("polynesian-village-resort", "grand-floridian-resort-and-spa"),
  "polynesian-village-resort→grand-floridian-resort-and-spa",
  "Transport pair keys should be stable and directional"
);

const ranked = dedupeAndRankTransportOptions([
  option("transfer-bus", "bus", 1, "Bus transfer", {
    optionKind: "direct_edge",
    sourceIds: ["official_bus_transportation"],
  }),
  option("monorail-generated", "monorail", 0, "Resort Monorail", {
    notes: ["Generated from route pattern."],
  }),
  option("monorail-adjacent", "monorail", 0, "Resort Monorail"),
  option("boat", "boat", 0, "Water Taxi / Resort Launch", {
    routeColorOrFlag: "Gold flag",
    viaPlaceIds: ["magic_kingdom"],
    viaPlaceNames: ["Magic Kingdom"],
  }),
]);

assert.deepEqual(
  ranked.map((row) => row.id),
  ["monorail-adjacent", "boat", "transfer-bus"],
  "Ranking should dedupe equivalent route rows, prefer zero transfers, and use stable mode priority"
);

const map = buildTransportConnectionMap(ranked);
assert.equal(
  connectionOptionsForPair(
    map,
    "polynesian-village-resort",
    "grand-floridian-resort-and-spa"
  )[0]?.id,
  "monorail-adjacent",
  "Connection maps should return ranked options for a directional resort pair"
);

const enrichedPath = buildPlanDaybookPath(
  [
    item(
      "poly",
      "polynesian-village-resort",
      "Polynesian Village Resort",
      "2026-07-02T18:00:00.000Z",
      "2026-07-02T18:30:00.000Z"
    ),
    item(
      "gf",
      "grand-floridian-resort-and-spa",
      "Grand Floridian Resort & Spa",
      "2026-07-02T19:15:00.000Z",
      "2026-07-02T20:00:00.000Z"
    ),
  ],
  map
);

const enriched = enrichedPath.stops[1].connectorBefore;
assert.equal(enriched?.label, "45 min gap · Monorail via Resort Monorail");
assert.match(enriched?.detail ?? "", /Direct route/);
assert.equal(enriched?.transportOptions?.length, 3);
assert.equal(enriched?.transportOptions?.[1].transportMode, "boat");

const fallbackPath = buildPlanDaybookPath([
  item(
    "akl",
    "animal-kingdom-lodge",
    "Animal Kingdom Lodge",
    "2026-07-02T18:00:00.000Z",
    "2026-07-02T18:30:00.000Z"
  ),
  item(
    "poly",
    "polynesian-village-resort",
    "Polynesian Village Resort",
    "2026-07-02T19:15:00.000Z",
    "2026-07-02T20:00:00.000Z"
  ),
]);

assert.equal(fallbackPath.stops[1].connectorBefore?.label, "45 min resort change");
assert.match(
  fallbackPath.stops[1].connectorBefore?.detail ?? "",
  /Confirm current transportation day-of/
);

console.log("Plan transport connection tests passed.");

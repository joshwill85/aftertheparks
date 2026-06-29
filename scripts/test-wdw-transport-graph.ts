import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_TRANSPORT_GRAPH_PATH,
  type TransportFilterMode,
  buildResortTransportModeSnapshot,
  loadTransportGraph,
  loadResortSlugMap,
  validateTransportGraph,
} from "@/scripts/ingest/wdw_transport_graph";
import { transportMatchesFilter } from "@/lib/explore/routeTaxonomy";

const graphPath = DEFAULT_TRANSPORT_GRAPH_PATH;
const graph = loadTransportGraph(graphPath);
const validation = validateTransportGraph(graph, graphPath);
const resortSlugMap = loadResortSlugMap();

assert.equal(validation.counts.places, 44, "transport graph should contain 44 places");
assert.equal(validation.counts.stops, 112, "transport graph should contain 112 stops");
assert.equal(validation.counts.routePatterns, 29, "transport graph should contain 29 route patterns");
assert.equal(validation.counts.edges, 458, "transport graph should contain 458 directed edges");
assert.equal(validation.counts.odServices, 876, "transport graph should contain 876 OD services");
assert.deepEqual(validation.duplicateIds, [], "transport graph IDs should be unique per entity");
assert.deepEqual(validation.foreignKeyIssues, [], "transport graph should not contain orphan references");
assert.deepEqual(validation.csvCountIssues, [], "CSV exports should match canonical JSON counts");

const warningTopics = new Set((graph.warnings ?? []).map((warning) => warning.topic));
assert.ok(
  warningTopics.has("Bus route numbers and exact arrivals"),
  "transport graph should preserve the public bus-arrival caveat"
);
assert.ok(
  warningTopics.has("Live hours"),
  "transport graph should preserve the live-hours caveat"
);

const snapshot = buildResortTransportModeSnapshot(graph);
const bySlug = new Map(snapshot.resorts.map((row) => [row.resortSlug, row.modes]));

assert.equal(
  resortSlugMap.art_of_animation,
  "art-of-animation-resort",
  "transport place-to-resort mapping should be checked in and explicit"
);
assert.deepEqual(
  bySlug.get("art-of-animation-resort")?.includes("skyliner"),
  true,
  "Art of Animation should keep Skyliner membership through its shared stop"
);
assert.deepEqual(
  bySlug.get("polynesian-village-resort")?.includes("monorail"),
  true,
  "Polynesian should be data-backed as a monorail resort"
);
assert.deepEqual(
  (["boat", "bus", "monorail", "walk"] as TransportFilterMode[]).every((mode) =>
    bySlug.get("polynesian-village-resort")?.includes(mode)
  ),
  true,
  "Polynesian should be data-backed for monorail, boat, walk, and bus"
);
assert.deepEqual(
  bySlug.get("pop-century-resort")?.includes("skyliner"),
  true,
  "Pop Century should be data-backed as a Skyliner resort"
);
assert.deepEqual(
  bySlug.get("boardwalk-inn")?.filter((mode) => mode === "boat" || mode === "walk").sort(),
  ["boat", "walk"],
  "BoardWalk Inn should be data-backed for boat and walk filters"
);

assert.equal(
  transportMatchesFilter("polynesian-village-resort", "magic_kingdom", "monorail"),
  true,
  "routeTaxonomy should use data-backed monorail membership"
);
assert.equal(
  transportMatchesFilter("pop-century-resort", "skyliner", "skyliner"),
  true,
  "routeTaxonomy should use data-backed Skyliner membership"
);
assert.equal(
  transportMatchesFilter("art-of-animation-resort", "skyliner", "skyliner"),
  true,
  "routeTaxonomy should preserve shared-station Skyliner membership"
);
assert.equal(
  transportMatchesFilter("boardwalk-inn", "epcot_boardwalk", "boat"),
  true,
  "routeTaxonomy should use data-backed boat membership"
);

const snapshotPath = path.join(
  process.cwd(),
  "data/processed/wdw_transport_resort_modes.json"
);
const snapshotMetaPath = path.join(
  process.cwd(),
  "data/processed/wdw_transport_resort_modes.meta.json"
);
assert.ok(
  existsSync(snapshotPath),
  "generated resort transport mode snapshot should be checked in"
);
assert.ok(
  existsSync(snapshotMetaPath),
  "generated resort transport mode snapshot metadata should be checked in"
);

console.log("WDW transport graph tests passed.");

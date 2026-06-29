import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_TRANSPORT_GRAPH_PATH =
  "/Users/josh/Downloads/aftertheparks-wdw-transport-graph-v0/aftertheparks-wdw-transport-graph-v0.1.json";

export const DEFAULT_RESORT_MODES_OUTPUT = path.join(
  process.cwd(),
  "data/processed/wdw_transport_resort_modes.json"
);

export const DEFAULT_RESORT_MODES_META_OUTPUT = path.join(
  process.cwd(),
  "data/processed/wdw_transport_resort_modes.meta.json"
);

export const DEFAULT_RESORT_SLUG_MAP_PATH = path.join(
  process.cwd(),
  "data/source/wdw_transport_resort_slug_map.json"
);

const EXPECTED_COUNTS = {
  places: 44,
  stops: 112,
  routePatterns: 29,
  edges: 458,
  odServices: 876,
};

const RESORT_ALIASES: Record<string, string[]> = {
  "animal-kingdom-lodge": ["akl"],
  "bay-lake-tower-at-contemporary-resort": ["bay-lake-tower-at-contemporary"],
  "campsites-at-fort-wilderness-resort": [
    "fort-wilderness-resort",
    "fort-wilderness",
  ],
  "polynesian-village-resort": ["poly"],
  "pop-century-resort": ["pop"],
  "saratoga-springs-resort-and-spa": ["saratoga"],
};

export type TransportFilterMode = "monorail" | "skyliner" | "boat" | "walk" | "bus";

interface SourceRef {
  title: string;
  publisher: string;
  url: string;
  source_level: string;
  notes?: string;
}

interface Place {
  id: string;
  name: string;
  place_type: string;
  category?: string;
  area: string;
  official_url?: string | null;
  aliases?: string[];
  transport_complex_id?: string | null;
  official_transport_modes_badged_by_disney?: string[];
  source_ids?: string[];
  notes?: string[];
  selectable?: boolean;
  stop_ids?: string[];
}

interface Stop {
  id: string;
  name: string;
  mode: string;
  place_ids: string[];
  transport_complex_id?: string | null;
  stop_type?: string;
  location_description?: string | null;
  parent_station_id?: string | null;
  source_ids?: string[];
  notes?: string[];
}

interface RoutePattern {
  id: string;
  name: string;
  mode: string;
  submode?: string;
  gtfs_route_type?: number | null;
  operating_rule_id?: string | null;
  public_identifier?: string;
  public_color_or_flag?: string | null;
  color_meaning?: string | null;
  stop_sequence_place_ids?: string[];
  bidirectional?: boolean;
  directional_loop?: boolean;
  headway_min?: unknown;
  estimated_total_duration_min?: unknown;
  transfer_notes?: string[];
  evidence_level?: string;
  source_ids?: string[];
  notes?: string[];
}

interface Edge {
  id: string;
  from_place_id: string;
  to_place_id: string;
  from_stop_id?: string | null;
  to_stop_id?: string | null;
  mode: string;
  route_pattern_id: string;
  route_public_identifier?: string | null;
  route_color_or_flag?: string | null;
  directness?: string;
  edge_kind?: string;
  transfer_count?: number;
  bidirectional_service?: boolean;
  operating_rule_id?: string | null;
  headway_min?: unknown;
  duration_min?: unknown;
  evidence_level?: string;
  source_ids?: string[];
  notes?: string[];
}

interface ODService {
  id: string;
  origin_place_id: string;
  destination_place_id: string;
  mode: string;
  route_pattern_id: string;
  route_public_identifier?: string | null;
  route_color_or_flag?: string | null;
  service_type?: string;
  transfer_count?: number;
  via_place_ids?: string[];
  operating_rule_id?: string | null;
  estimated_duration_min?: unknown;
  duration_source_level?: string | null;
  evidence_level?: string;
  source_ids?: string[];
  notes?: string[];
}

export interface WdwTransportGraph {
  metadata: {
    dataset_id?: string;
    version?: string;
    name?: string;
    generated_date?: string;
    counts?: Record<string, number>;
    [key: string]: unknown;
  };
  sources: Record<string, SourceRef>;
  operating_rules: Record<string, Record<string, unknown>>;
  places: Place[];
  stops: Stop[];
  route_patterns: RoutePattern[];
  edges: Edge[];
  od_services: ODService[];
  warnings?: Array<Record<string, unknown>>;
}

export interface ValidationResult {
  counts: typeof EXPECTED_COUNTS;
  duplicateIds: string[];
  foreignKeyIssues: string[];
  csvCountIssues: string[];
}

export interface ResortTransportModeSnapshot {
  generatedAt: string;
  graphId: string;
  version: string;
  source: {
    path: string;
    sha256: string;
  };
  resorts: Array<{
    resortSlug: string;
    placeId: string;
    placeName: string;
    modes: TransportFilterMode[];
    sourceIds: string[];
  }>;
  aliases: Record<string, string>;
}

export interface ResortTransportModeMeta {
  graph_version: string;
  graph_checksum_sha256: string;
  generated_at: string;
  source_file: string;
  counts: Record<`resorts_with_${TransportFilterMode}`, number>;
}

export function loadTransportGraph(filePath = DEFAULT_TRANSPORT_GRAPH_PATH): WdwTransportGraph {
  return JSON.parse(readFileSync(filePath, "utf8")) as WdwTransportGraph;
}

export function loadResortSlugMap(
  filePath = DEFAULT_RESORT_SLUG_MAP_PATH
): Record<string, string> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, string>;
}

export function graphId(graph: WdwTransportGraph): string {
  const datasetId = graph.metadata.dataset_id ?? "aftertheparks_wdw_transport_graph";
  const version = graph.metadata.version ?? "0.1.0";
  return `${datasetId}:${version}`;
}

export function fileSha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function countCsvRows(filePath: string): number {
  const text = readFileSync(filePath, "utf8");
  let rows = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && next === '"') {
      i += 1;
      continue;
    }
    if (char === '"') inQuotes = !inQuotes;
    if (char === "\n" && !inQuotes) rows += 1;
  }
  return Math.max(0, rows - 1);
}

function duplicateIds(entityName: string, ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(`${entityName}:${id}`);
    seen.add(id);
  }
  return [...duplicates].sort();
}

export function validateTransportGraph(
  graph: WdwTransportGraph,
  filePath = DEFAULT_TRANSPORT_GRAPH_PATH
): ValidationResult {
  const counts = {
    places: graph.places.length,
    stops: graph.stops.length,
    routePatterns: graph.route_patterns.length,
    edges: graph.edges.length,
    odServices: graph.od_services.length,
  };

  const duplicateIdsFound = [
    ...duplicateIds("places", graph.places.map((place) => place.id)),
    ...duplicateIds("stops", graph.stops.map((stop) => stop.id)),
    ...duplicateIds("route_patterns", graph.route_patterns.map((route) => route.id)),
    ...duplicateIds("edges", graph.edges.map((edge) => edge.id)),
    ...duplicateIds("od_services", graph.od_services.map((service) => service.id)),
  ];

  const placeIds = new Set(graph.places.map((place) => place.id));
  const stopIds = new Set(graph.stops.map((stop) => stop.id));
  const routePatternIds = new Set(graph.route_patterns.map((route) => route.id));
  const operatingRuleIds = new Set(Object.keys(graph.operating_rules));
  const sourceIds = new Set(Object.keys(graph.sources));
  const foreignKeyIssues: string[] = [];

  for (const place of graph.places) {
    for (const stopId of place.stop_ids ?? []) {
      if (!stopIds.has(stopId)) foreignKeyIssues.push(`places.${place.id}.stop_ids:${stopId}`);
    }
    for (const sourceId of place.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) foreignKeyIssues.push(`places.${place.id}.source_ids:${sourceId}`);
    }
  }
  for (const stop of graph.stops) {
    for (const placeId of stop.place_ids) {
      if (!placeIds.has(placeId)) foreignKeyIssues.push(`stops.${stop.id}.place_ids:${placeId}`);
    }
    for (const sourceId of stop.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) foreignKeyIssues.push(`stops.${stop.id}.source_ids:${sourceId}`);
    }
  }
  for (const route of graph.route_patterns) {
    if (route.operating_rule_id && !operatingRuleIds.has(route.operating_rule_id)) {
      foreignKeyIssues.push(`route_patterns.${route.id}.operating_rule_id:${route.operating_rule_id}`);
    }
    for (const placeId of route.stop_sequence_place_ids ?? []) {
      if (!placeIds.has(placeId)) foreignKeyIssues.push(`route_patterns.${route.id}.stop_sequence_place_ids:${placeId}`);
    }
    for (const sourceId of route.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) foreignKeyIssues.push(`route_patterns.${route.id}.source_ids:${sourceId}`);
    }
  }
  for (const edge of graph.edges) {
    if (!placeIds.has(edge.from_place_id)) foreignKeyIssues.push(`edges.${edge.id}.from_place_id:${edge.from_place_id}`);
    if (!placeIds.has(edge.to_place_id)) foreignKeyIssues.push(`edges.${edge.id}.to_place_id:${edge.to_place_id}`);
    if (edge.from_stop_id && !stopIds.has(edge.from_stop_id)) foreignKeyIssues.push(`edges.${edge.id}.from_stop_id:${edge.from_stop_id}`);
    if (edge.to_stop_id && !stopIds.has(edge.to_stop_id)) foreignKeyIssues.push(`edges.${edge.id}.to_stop_id:${edge.to_stop_id}`);
    if (!routePatternIds.has(edge.route_pattern_id)) foreignKeyIssues.push(`edges.${edge.id}.route_pattern_id:${edge.route_pattern_id}`);
    if (edge.operating_rule_id && !operatingRuleIds.has(edge.operating_rule_id)) {
      foreignKeyIssues.push(`edges.${edge.id}.operating_rule_id:${edge.operating_rule_id}`);
    }
    for (const sourceId of edge.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) foreignKeyIssues.push(`edges.${edge.id}.source_ids:${sourceId}`);
    }
  }
  for (const service of graph.od_services) {
    if (!placeIds.has(service.origin_place_id)) foreignKeyIssues.push(`od_services.${service.id}.origin_place_id:${service.origin_place_id}`);
    if (!placeIds.has(service.destination_place_id)) foreignKeyIssues.push(`od_services.${service.id}.destination_place_id:${service.destination_place_id}`);
    if (!routePatternIds.has(service.route_pattern_id)) foreignKeyIssues.push(`od_services.${service.id}.route_pattern_id:${service.route_pattern_id}`);
    if (service.operating_rule_id && !operatingRuleIds.has(service.operating_rule_id)) {
      foreignKeyIssues.push(`od_services.${service.id}.operating_rule_id:${service.operating_rule_id}`);
    }
    for (const placeId of service.via_place_ids ?? []) {
      if (!placeIds.has(placeId)) foreignKeyIssues.push(`od_services.${service.id}.via_place_ids:${placeId}`);
    }
    for (const sourceId of service.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) foreignKeyIssues.push(`od_services.${service.id}.source_ids:${sourceId}`);
    }
  }

  const baseDir = path.dirname(filePath);
  const baseName = path.basename(filePath, ".json");
  const csvChecks: Array<[keyof typeof counts, string]> = [
    ["places", `${baseName}-nodes.csv`],
    ["stops", `${baseName}-stops.csv`],
    ["routePatterns", `${baseName}-route-patterns.csv`],
    ["edges", `${baseName}-edges.csv`],
    ["odServices", `${baseName}-od-services.csv`],
  ];
  const csvCountIssues = csvChecks.flatMap(([key, file]) => {
    const csvPath = path.join(baseDir, file);
    if (!existsSync(csvPath)) return [];
    const csvRows = countCsvRows(csvPath);
    return csvRows === counts[key] ? [] : [`${file}: expected ${counts[key]}, found ${csvRows}`];
  });

  return {
    counts,
    duplicateIds: duplicateIdsFound,
    foreignKeyIssues: foreignKeyIssues.sort(),
    csvCountIssues,
  };
}

export function assertValidTransportGraph(validation: ValidationResult): void {
  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = validation.counts[key as keyof typeof EXPECTED_COUNTS];
    if (actual !== expected) {
      throw new Error(`Expected ${expected} ${key}, found ${actual}`);
    }
  }
  if (validation.duplicateIds.length) {
    throw new Error(`Duplicate transport graph IDs: ${validation.duplicateIds.join(", ")}`);
  }
  if (validation.foreignKeyIssues.length) {
    throw new Error(`Transport graph FK issues: ${validation.foreignKeyIssues.join(", ")}`);
  }
  if (validation.csvCountIssues.length) {
    throw new Error(`Transport graph CSV count issues: ${validation.csvCountIssues.join(", ")}`);
  }
}

function normalizeMode(mode: string): TransportFilterMode | undefined {
  if (mode === "monorail") return "monorail";
  if (mode === "aerial_lift" || mode === "skyliner") return "skyliner";
  if (mode === "ferry_boat" || mode === "watercraft" || mode === "ferry") return "boat";
  if (mode === "walk") return "walk";
  if (mode === "bus") return "bus";
  return undefined;
}

export function buildResortTransportModeSnapshot(
  graph: WdwTransportGraph,
  filePath = DEFAULT_TRANSPORT_GRAPH_PATH,
  resortSlugMap = loadResortSlugMap()
): ResortTransportModeSnapshot {
  const modesByPlaceId = new Map<string, Set<TransportFilterMode>>();
  const sourceIdsByPlaceId = new Map<string, Set<string>>();

  function addPlaceMode(placeId: string, mode: string, sourceIds: string[] = []): void {
    const normalized = normalizeMode(mode);
    if (!normalized) return;
    const modes = modesByPlaceId.get(placeId) ?? new Set<TransportFilterMode>();
    modes.add(normalized);
    modesByPlaceId.set(placeId, modes);

    const sourceSet = sourceIdsByPlaceId.get(placeId) ?? new Set<string>();
    for (const sourceId of sourceIds) sourceSet.add(sourceId);
    sourceIdsByPlaceId.set(placeId, sourceSet);
  }

  for (const place of graph.places) {
    for (const mode of place.official_transport_modes_badged_by_disney ?? []) {
      addPlaceMode(place.id, mode, place.source_ids ?? []);
    }
  }

  for (const stop of graph.stops) {
    for (const placeId of stop.place_ids) {
      addPlaceMode(placeId, stop.mode, stop.source_ids ?? []);
    }
  }
  for (const edge of graph.edges) {
    addPlaceMode(edge.from_place_id, edge.mode, edge.source_ids ?? []);
    addPlaceMode(edge.to_place_id, edge.mode, edge.source_ids ?? []);
  }
  for (const service of graph.od_services) {
    addPlaceMode(service.origin_place_id, service.mode, service.source_ids ?? []);
    addPlaceMode(service.destination_place_id, service.mode, service.source_ids ?? []);
  }

  const resorts = graph.places
    .map((place) => {
      const resortSlug = resortSlugMap[place.id];
      if (!resortSlug) return null;
      return {
        resortSlug,
        placeId: place.id,
        placeName: place.name,
        modes: [...(modesByPlaceId.get(place.id) ?? new Set<TransportFilterMode>())].sort(),
        sourceIds: [...(sourceIdsByPlaceId.get(place.id) ?? new Set<string>())].sort(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const aliases = Object.fromEntries(
    Object.entries(RESORT_ALIASES).flatMap(([canonical, aliasesForResort]) =>
      aliasesForResort.map((alias) => [alias, canonical])
    )
  );

  return {
    generatedAt: new Date().toISOString(),
    graphId: graphId(graph),
    version: graph.metadata.version ?? "0.1.0",
    source: {
      path: filePath,
      sha256: fileSha256(filePath),
    },
    resorts: resorts.sort((a, b) => a.resortSlug.localeCompare(b.resortSlug)),
    aliases,
  };
}

export function buildResortTransportModeMeta(
  snapshot: ResortTransportModeSnapshot
): ResortTransportModeMeta {
  const counts = {
    resorts_with_monorail: 0,
    resorts_with_skyliner: 0,
    resorts_with_boat: 0,
    resorts_with_walk: 0,
    resorts_with_bus: 0,
  } satisfies ResortTransportModeMeta["counts"];
  for (const resort of snapshot.resorts) {
    for (const mode of resort.modes) {
      counts[`resorts_with_${mode}`] += 1;
    }
  }
  return {
    graph_version: snapshot.version,
    graph_checksum_sha256: snapshot.source.sha256,
    generated_at: snapshot.generatedAt,
    source_file: snapshot.source.path,
    counts,
  };
}

export function writeResortTransportModeSnapshot(
  snapshot: ResortTransportModeSnapshot,
  outputPath = DEFAULT_RESORT_MODES_OUTPUT,
  metaOutputPath = DEFAULT_RESORT_MODES_META_OUTPUT
): void {
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(metaOutputPath, `${JSON.stringify(buildResortTransportModeMeta(snapshot), null, 2)}\n`);
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function loadLocalEnv(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

export function createSupabaseServiceClient(): SupabaseClient {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function insertRows(
  supabase: SupabaseClient,
  table: string,
  rows: Array<Record<string, unknown>>,
  chunkSize = 200
): Promise<void> {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

export async function importTransportGraphToSupabase(
  graph: WdwTransportGraph,
  filePath = DEFAULT_TRANSPORT_GRAPH_PATH,
  supabase = createSupabaseServiceClient(),
  resortSlugMap = loadResortSlugMap()
): Promise<void> {
  const id = graphId(graph);
  const datasetId = graph.metadata.dataset_id ?? "aftertheparks_wdw_transport_graph";
  const mappedSlugs = [...new Set(Object.values(resortSlugMap))].sort();
  const { data: resorts, error: resortError } = await supabase
    .from("resorts")
    .select("slug")
    .in("slug", mappedSlugs);
  if (resortError) throw new Error(`resorts slug validation failed: ${resortError.message}`);
  const existingSlugs = new Set((resorts ?? []).map((row) => String(row.slug)));
  const missingSlugs = mappedSlugs.filter((slug) => !existingSlugs.has(slug));
  if (missingSlugs.length) {
    throw new Error(`Mapped transport resort slugs do not exist in public.resorts: ${missingSlugs.join(", ")}`);
  }

  const { error: deactivateError } = await supabase
    .from("wdw_transport_graphs")
    .update({ is_active: false })
    .eq("dataset_id", datasetId);
  if (deactivateError) {
    throw new Error(`wdw_transport_graphs deactivate failed: ${deactivateError.message}`);
  }

  const { error: deleteError } = await supabase
    .from("wdw_transport_graphs")
    .delete()
    .eq("id", id);
  if (deleteError) throw new Error(`wdw_transport_graphs delete failed: ${deleteError.message}`);

  await insertRows(supabase, "wdw_transport_graphs", [
    {
      id,
      dataset_id: datasetId,
      version: graph.metadata.version ?? "0.1.0",
      name: graph.metadata.name ?? "AfterTheParks Walt Disney World Transportation Graph",
      generated_date: graph.metadata.generated_date ?? null,
      checksum_sha256: fileSha256(filePath),
      is_active: true,
      metadata: graph.metadata,
      warnings: graph.warnings ?? [],
      source_sha256: fileSha256(filePath),
    },
  ]);

  await insertRows(
    supabase,
    "wdw_transport_sources",
    Object.entries(graph.sources).map(([sourceId, source]) => ({
      graph_id: id,
      source_id: sourceId,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      source_level: source.source_level,
      notes: source.notes ?? null,
    }))
  );

  await insertRows(
    supabase,
    "wdw_transport_operating_rules",
    Object.entries(graph.operating_rules).map(([ruleId, rule]) => ({
      graph_id: id,
      rule_id: ruleId,
      mode: optionalText(rule.mode),
      summary: optionalText(rule.summary),
      rule_json: rule,
      source_ids: asTextArray(rule.source_ids),
    }))
  );

  await insertRows(
    supabase,
    "wdw_transport_places",
    graph.places.map((place) => ({
      graph_id: id,
      place_id: place.id,
      name: place.name,
      place_type: place.place_type,
      category: place.category ?? null,
      area: place.area,
      official_url: place.official_url ?? null,
      aliases: place.aliases ?? [],
      transport_complex_id: place.transport_complex_id ?? null,
      official_transport_modes_badged_by_disney:
        place.official_transport_modes_badged_by_disney ?? [],
      source_ids: place.source_ids ?? [],
      notes: place.notes ?? [],
      selectable: place.selectable ?? false,
      stop_ids: place.stop_ids ?? [],
      resort_slug: resortSlugMap[place.id] ?? null,
    }))
  );

  await insertRows(
    supabase,
    "wdw_transport_stops",
    graph.stops.map((stop) => ({
      graph_id: id,
      stop_id: stop.id,
      name: stop.name,
      mode: stop.mode,
      place_ids: stop.place_ids,
      transport_complex_id: stop.transport_complex_id ?? null,
      stop_type: stop.stop_type ?? null,
      location_description: stop.location_description ?? null,
      parent_station_id: stop.parent_station_id ?? null,
      source_ids: stop.source_ids ?? [],
      notes: stop.notes ?? [],
    }))
  );

  await insertRows(
    supabase,
    "wdw_transport_route_patterns",
    graph.route_patterns.map((route) => ({
      graph_id: id,
      route_pattern_id: route.id,
      name: route.name,
      mode: route.mode,
      submode: route.submode ?? null,
      gtfs_route_type: route.gtfs_route_type ?? null,
      operating_rule_id: route.operating_rule_id ?? null,
      public_identifier: route.public_identifier ?? null,
      public_color_or_flag: route.public_color_or_flag ?? null,
      color_meaning: route.color_meaning ?? null,
      stop_sequence_place_ids: route.stop_sequence_place_ids ?? [],
      bidirectional: route.bidirectional ?? false,
      directional_loop: route.directional_loop ?? false,
      headway_min: route.headway_min ?? null,
      estimated_total_duration_min: route.estimated_total_duration_min ?? null,
      transfer_notes: route.transfer_notes ?? [],
      evidence_level: route.evidence_level ?? null,
      source_ids: route.source_ids ?? [],
      notes: route.notes ?? [],
    }))
  );

  await insertRows(
    supabase,
    "wdw_transport_edges",
    graph.edges.map((edge) => ({
      graph_id: id,
      edge_id: edge.id,
      from_place_id: edge.from_place_id,
      to_place_id: edge.to_place_id,
      from_stop_id: edge.from_stop_id ?? null,
      to_stop_id: edge.to_stop_id ?? null,
      mode: edge.mode,
      route_pattern_id: edge.route_pattern_id,
      route_public_identifier: edge.route_public_identifier ?? null,
      route_color_or_flag: edge.route_color_or_flag ?? null,
      directness: edge.directness ?? null,
      edge_kind: edge.edge_kind ?? null,
      transfer_count: edge.transfer_count ?? 0,
      bidirectional_service: edge.bidirectional_service ?? false,
      operating_rule_id: edge.operating_rule_id ?? null,
      headway_min: edge.headway_min ?? null,
      duration_min: edge.duration_min ?? {},
      evidence_level: edge.evidence_level ?? null,
      source_ids: edge.source_ids ?? [],
      notes: edge.notes ?? [],
    }))
  );

  await insertRows(
    supabase,
    "wdw_transport_od_services",
    graph.od_services.map((service) => ({
      graph_id: id,
      od_service_id: service.id,
      origin_place_id: service.origin_place_id,
      destination_place_id: service.destination_place_id,
      mode: service.mode,
      route_pattern_id: service.route_pattern_id,
      route_public_identifier: service.route_public_identifier ?? null,
      route_color_or_flag: service.route_color_or_flag ?? null,
      service_type: service.service_type ?? null,
      transfer_count: service.transfer_count ?? 0,
      via_place_ids: service.via_place_ids ?? [],
      operating_rule_id: service.operating_rule_id ?? null,
      estimated_duration_min: service.estimated_duration_min ?? null,
      duration_source_level: service.duration_source_level ?? null,
      evidence_level: service.evidence_level ?? null,
      source_ids: service.source_ids ?? [],
      notes: service.notes ?? [],
    }))
  );
}

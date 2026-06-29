"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PlanItem } from "@/lib/types/occurrence";
import {
  buildTransportConnectionMap,
  transportConnectionPairsForItems,
  transportPairKey,
  type PlanTransportConnectionMap,
  type PlanTransportConnectionOption,
  type PlanTransportMode,
  type PlanTransportOptionKind,
} from "@/lib/plan/transportConnections";

type TransportConnectionRow = {
  option_id: string;
  option_kind: string;
  origin_resort_slug: string;
  origin_name: string;
  destination_resort_slug: string;
  destination_name: string;
  transport_filter_mode: string;
  route_public_identifier: string | null;
  route_color_or_flag: string | null;
  service_type: string | null;
  directness: string | null;
  transfer_count: number | null;
  via_place_ids: string[] | null;
  via_place_names: string[] | null;
  evidence_level: string | null;
  source_ids: string[] | null;
  notes: string[] | null;
};

function isTransportMode(value: string): value is PlanTransportMode {
  return value === "monorail" ||
    value === "skyliner" ||
    value === "boat" ||
    value === "walk" ||
    value === "bus";
}

function optionKind(value: string): PlanTransportOptionKind {
  if (value === "direct_edge") return "direct_edge";
  if (value === "graph_path") return "graph_path";
  return "od_service";
}

function rowToOption(row: TransportConnectionRow): PlanTransportConnectionOption | null {
  if (!isTransportMode(row.transport_filter_mode)) return null;
  return {
    id: row.option_id,
    originResortSlug: row.origin_resort_slug,
    originName: row.origin_name,
    destinationResortSlug: row.destination_resort_slug,
    destinationName: row.destination_name,
    transportMode: row.transport_filter_mode,
    routeLabel: row.route_public_identifier,
    routeColorOrFlag: row.route_color_or_flag,
    serviceType: row.service_type,
    directness: row.directness,
    transferCount: row.transfer_count ?? 0,
    viaPlaceIds: row.via_place_ids ?? [],
    viaPlaceNames: row.via_place_names ?? [],
    evidenceLevel: row.evidence_level,
    sourceIds: row.source_ids ?? [],
    notes: row.notes ?? [],
    optionKind: optionKind(row.option_kind),
  };
}

export function useTransportConnectionsForItems(
  items: PlanItem[]
): PlanTransportConnectionMap | undefined {
  const pairs = useMemo(() => transportConnectionPairsForItems(items), [items]);
  const pairKeys = useMemo(
    () =>
      new Set(
        pairs.map((pair) =>
          transportPairKey(pair.originResortSlug, pair.destinationResortSlug)
        )
      ),
    [pairs]
  );
  const [connections, setConnections] = useState<PlanTransportConnectionMap>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (pairs.length === 0 || !isSupabaseConfigured()) {
        setConnections(undefined);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setConnections(undefined);
        return;
      }

      const origins = [...new Set(pairs.map((pair) => pair.originResortSlug))];
      const destinations = [
        ...new Set(pairs.map((pair) => pair.destinationResortSlug)),
      ];

      const { data, error } = await supabase
        .from("v_public_wdw_transport_connection_options")
        .select(
          "option_id, option_kind, origin_resort_slug, origin_name, destination_resort_slug, destination_name, transport_filter_mode, route_public_identifier, route_color_or_flag, service_type, directness, transfer_count, via_place_ids, via_place_names, evidence_level, source_ids, notes"
        )
        .in("origin_resort_slug", origins)
        .in("destination_resort_slug", destinations);

      if (cancelled) return;
      if (error || !data) {
        setConnections(undefined);
        return;
      }

      const options = (data as TransportConnectionRow[])
        .filter((row) =>
          pairKeys.has(
            transportPairKey(row.origin_resort_slug, row.destination_resort_slug)
          )
        )
        .map(rowToOption)
        .filter((option): option is PlanTransportConnectionOption => Boolean(option));

      setConnections(buildTransportConnectionMap(options));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pairKeys, pairs]);

  return connections;
}

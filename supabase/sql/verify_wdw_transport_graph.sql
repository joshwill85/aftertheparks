do $$
declare
  actual_count integer;
  orphan_count integer;
begin
  select count(*) into actual_count
  from public.wdw_transport_graphs
  where is_active = true;
  if actual_count <> 1 then
    raise exception 'Expected exactly one active WDW transport graph, found %', actual_count;
  end if;

  select count(*) into actual_count from public.wdw_transport_places;
  if actual_count <> 44 then
    raise exception 'Expected 44 WDW transport places, found %', actual_count;
  end if;

  select count(*) into actual_count from public.wdw_transport_stops;
  if actual_count <> 112 then
    raise exception 'Expected 112 WDW transport stops, found %', actual_count;
  end if;

  select count(*) into actual_count from public.wdw_transport_route_patterns;
  if actual_count <> 29 then
    raise exception 'Expected 29 WDW transport route patterns, found %', actual_count;
  end if;

  select count(*) into actual_count from public.wdw_transport_edges;
  if actual_count <> 458 then
    raise exception 'Expected 458 WDW transport edges, found %', actual_count;
  end if;

  select count(*) into actual_count from public.wdw_transport_od_services;
  if actual_count <> 876 then
    raise exception 'Expected 876 WDW transport OD services, found %', actual_count;
  end if;

  select count(*) into orphan_count
  from public.wdw_transport_edges e
  left join public.wdw_transport_places fp
    on fp.graph_id = e.graph_id and fp.place_id = e.from_place_id
  left join public.wdw_transport_places tp
    on tp.graph_id = e.graph_id and tp.place_id = e.to_place_id
  left join public.wdw_transport_route_patterns rp
    on rp.graph_id = e.graph_id and rp.route_pattern_id = e.route_pattern_id
  where fp.place_id is null or tp.place_id is null or rp.route_pattern_id is null;
  if orphan_count <> 0 then
    raise exception 'Expected zero WDW transport edge orphan references, found %', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.wdw_transport_od_services s
  left join public.wdw_transport_places origin
    on origin.graph_id = s.graph_id and origin.place_id = s.origin_place_id
  left join public.wdw_transport_places destination
    on destination.graph_id = s.graph_id and destination.place_id = s.destination_place_id
  left join public.wdw_transport_route_patterns rp
    on rp.graph_id = s.graph_id and rp.route_pattern_id = s.route_pattern_id
  where origin.place_id is null
    or destination.place_id is null
    or rp.route_pattern_id is null;
  if orphan_count <> 0 then
    raise exception 'Expected zero WDW transport OD orphan references, found %', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.wdw_transport_places p
  cross join unnest(p.stop_ids) as stop_refs(stop_id)
  left join public.wdw_transport_stops s
    on s.graph_id = p.graph_id and s.stop_id = stop_refs.stop_id
  where s.stop_id is null;
  if orphan_count <> 0 then
    raise exception 'Expected zero orphan stop IDs in WDW transport places, found %', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.wdw_transport_stops s
  cross join unnest(s.place_ids) as place_refs(place_id)
  left join public.wdw_transport_places p
    on p.graph_id = s.graph_id and p.place_id = place_refs.place_id
  where p.place_id is null;
  if orphan_count <> 0 then
    raise exception 'Expected zero orphan place IDs in WDW transport stops, found %', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.wdw_transport_od_services s
  cross join unnest(s.via_place_ids) as via_refs(place_id)
  left join public.wdw_transport_places p
    on p.graph_id = s.graph_id and p.place_id = via_refs.place_id
  where p.place_id is null;
  if orphan_count <> 0 then
    raise exception 'Expected zero orphan via place IDs in WDW transport OD services, found %', orphan_count;
  end if;

  select count(*) into orphan_count
  from (
    select graph_id, unnest(source_ids) as source_id from public.wdw_transport_operating_rules
    union all
    select graph_id, unnest(source_ids) from public.wdw_transport_places
    union all
    select graph_id, unnest(source_ids) from public.wdw_transport_stops
    union all
    select graph_id, unnest(source_ids) from public.wdw_transport_route_patterns
    union all
    select graph_id, unnest(source_ids) from public.wdw_transport_edges
    union all
    select graph_id, unnest(source_ids) from public.wdw_transport_od_services
  ) referenced_sources
  left join public.wdw_transport_sources available_sources
    on available_sources.graph_id = referenced_sources.graph_id
   and available_sources.source_id = referenced_sources.source_id
  where available_sources.source_id is null;
  if orphan_count <> 0 then
    raise exception 'Expected zero orphan WDW transport source IDs, found %', orphan_count;
  end if;

  select count(*) into actual_count
  from public.v_public_wdw_resort_transport_modes
  where transport_filter_mode not in ('monorail', 'skyliner', 'boat', 'walk', 'bus');
  if actual_count <> 0 then
    raise exception 'Expected no public transport modes outside UI vocabulary, found %', actual_count;
  end if;

  select count(*) into actual_count
  from public.v_public_wdw_transport_connection_options
  where origin_resort_slug is null
    or destination_resort_slug is null
    or origin_resort_slug = destination_resort_slug
    or transport_filter_mode not in ('monorail', 'skyliner', 'boat', 'walk', 'bus');
  if actual_count <> 0 then
    raise exception 'Expected only mapped cross-resort public WDW transport connection options, found % invalid rows', actual_count;
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_transport_connection_options
    where origin_resort_slug = 'polynesian-village-resort'
      and destination_resort_slug = 'grand-floridian-resort-and-spa'
      and transport_filter_mode = 'monorail'
  ) then
    raise exception 'Expected Polynesian Village to Grand Floridian to include monorail connection option';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_transport_connection_options
    where origin_resort_slug = 'polynesian-village-resort'
      and destination_resort_slug = 'grand-floridian-resort-and-spa'
      and transport_filter_mode = 'boat'
  ) then
    raise exception 'Expected Polynesian Village to Grand Floridian to include boat connection option';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_transport_connection_options
    where origin_resort_slug = 'boardwalk-inn'
      and destination_resort_slug = 'yacht-club-resort'
  ) then
    raise exception 'Expected BoardWalk Inn to Yacht Club to include a source-backed connection option';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_transport_connection_options
    where origin_resort_slug = 'cabins-at-fort-wilderness-resort'
      and destination_resort_slug = 'animal-kingdom-villas-kidani-village'
      and option_kind = 'graph_path'
      and transport_filter_mode = 'bus'
      and transfer_count = 1
      and 'animal_kingdom' = any(via_place_ids)
  ) then
    raise exception 'Expected Fort Wilderness Cabins to Kidani to include a one-transfer bus graph path via Animal Kingdom';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'art-of-animation-resort'
      and transport_filter_mode = 'skyliner'
  ) then
    raise exception 'Expected Art of Animation to have Skyliner transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'polynesian-village-resort'
      and transport_filter_mode = 'monorail'
  ) then
    raise exception 'Expected Polynesian Village to have monorail transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'polynesian-village-resort'
      and transport_filter_mode = 'boat'
  ) then
    raise exception 'Expected Polynesian Village to have boat transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'polynesian-village-resort'
      and transport_filter_mode = 'walk'
  ) then
    raise exception 'Expected Polynesian Village to have walk transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'pop-century-resort'
      and transport_filter_mode = 'skyliner'
  ) then
    raise exception 'Expected Pop Century to have Skyliner transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'boardwalk-inn'
      and transport_filter_mode = 'boat'
  ) then
    raise exception 'Expected BoardWalk Inn to have boat transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'boardwalk-inn'
      and transport_filter_mode = 'walk'
  ) then
    raise exception 'Expected BoardWalk Inn to have walk transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'campsites-at-fort-wilderness-resort'
      and transport_filter_mode = 'boat'
  ) then
    raise exception 'Expected Fort Wilderness Campsites to have boat transport mode';
  end if;

  if not exists (
    select 1
    from public.v_public_wdw_resort_transport_modes
    where resort_slug = 'campsites-at-fort-wilderness-resort'
      and transport_filter_mode = 'bus'
  ) then
    raise exception 'Expected Fort Wilderness Campsites to have bus transport mode';
  end if;
end $$;

select
  'wdw_transport_graph' as check_name,
  'pass' as status,
  jsonb_build_object(
    'places', (select count(*) from public.wdw_transport_places),
    'stops', (select count(*) from public.wdw_transport_stops),
    'route_patterns', (select count(*) from public.wdw_transport_route_patterns),
    'edges', (select count(*) from public.wdw_transport_edges),
    'od_services', (select count(*) from public.wdw_transport_od_services),
    'connection_options', (select count(*) from public.v_public_wdw_transport_connection_options),
    'resort_modes', (select count(*) from public.v_public_wdw_resort_transport_modes)
  ) as detail;

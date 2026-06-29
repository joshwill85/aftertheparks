create or replace view public.v_public_wdw_transport_connection_options
with (security_invoker = true) as
with recursive edge_paths as (
  select
    e.graph_id,
    e.from_place_id as origin_place_id,
    e.to_place_id as destination_place_id,
    array[e.from_place_id, e.to_place_id] as place_path,
    array[e.edge_id] as edge_path,
    array[e.mode] as mode_path,
    array[e.route_public_identifier] as route_label_path,
    e.source_ids,
    e.notes,
    1 as depth
  from public.wdw_transport_edges e
  join public.wdw_transport_graphs g
    on g.id = e.graph_id
   and g.is_active = true

  union all

  select
    p.graph_id,
    p.origin_place_id,
    e.to_place_id,
    p.place_path || e.to_place_id,
    p.edge_path || e.edge_id,
    p.mode_path || e.mode,
    p.route_label_path || e.route_public_identifier,
    p.source_ids || e.source_ids,
    p.notes || e.notes,
    p.depth + 1
  from edge_paths p
  join public.wdw_transport_edges e
    on e.graph_id = p.graph_id
   and e.from_place_id = p.destination_place_id
  where p.depth < 2
    and not e.to_place_id = any(p.place_path)
),
od_options as (
  select
    s.graph_id,
    g.version as graph_version,
    'od_service:' || s.od_service_id as option_id,
    'od_service'::text as option_kind,
    s.origin_place_id,
    origin.name as origin_name,
    origin.resort_slug as origin_resort_slug,
    s.destination_place_id,
    destination.name as destination_name,
    destination.resort_slug as destination_resort_slug,
    s.mode,
    case
      when s.mode = 'monorail' then 'monorail'
      when s.mode in ('aerial_lift', 'skyliner') then 'skyliner'
      when s.mode in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when s.mode = 'walk' then 'walk'
      when s.mode = 'bus' then 'bus'
      else s.mode
    end as transport_filter_mode,
    s.route_pattern_id,
    s.route_public_identifier,
    s.route_color_or_flag,
    s.service_type,
    null::text as directness,
    s.transfer_count,
    s.via_place_ids,
    coalesce(
      array(
        select via_place.name
        from unnest(s.via_place_ids) with ordinality as via_refs(place_id, ordinal)
        join public.wdw_transport_places via_place
          on via_place.graph_id = s.graph_id
         and via_place.place_id = via_refs.place_id
        order by via_refs.ordinal
      ),
      '{}'::text[]
    ) as via_place_names,
    s.evidence_level,
    s.source_ids,
    s.notes
  from public.wdw_transport_od_services s
  join public.wdw_transport_graphs g
    on g.id = s.graph_id
   and g.is_active = true
  join public.wdw_transport_places origin
    on origin.graph_id = s.graph_id
   and origin.place_id = s.origin_place_id
  join public.wdw_transport_places destination
    on destination.graph_id = s.graph_id
   and destination.place_id = s.destination_place_id
  where origin.resort_slug is not null
    and destination.resort_slug is not null
    and origin.resort_slug <> destination.resort_slug
),
edge_options as (
  select
    e.graph_id,
    g.version as graph_version,
    'edge:' || e.edge_id as option_id,
    'direct_edge'::text as option_kind,
    e.from_place_id as origin_place_id,
    origin.name as origin_name,
    origin.resort_slug as origin_resort_slug,
    e.to_place_id as destination_place_id,
    destination.name as destination_name,
    destination.resort_slug as destination_resort_slug,
    e.mode,
    case
      when e.mode = 'monorail' then 'monorail'
      when e.mode in ('aerial_lift', 'skyliner') then 'skyliner'
      when e.mode in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when e.mode = 'walk' then 'walk'
      when e.mode = 'bus' then 'bus'
      else e.mode
    end as transport_filter_mode,
    e.route_pattern_id,
    e.route_public_identifier,
    e.route_color_or_flag,
    null::text as service_type,
    e.directness,
    e.transfer_count,
    '{}'::text[] as via_place_ids,
    '{}'::text[] as via_place_names,
    e.evidence_level,
    e.source_ids,
    e.notes
  from public.wdw_transport_edges e
  join public.wdw_transport_graphs g
    on g.id = e.graph_id
   and g.is_active = true
  join public.wdw_transport_places origin
    on origin.graph_id = e.graph_id
   and origin.place_id = e.from_place_id
  join public.wdw_transport_places destination
    on destination.graph_id = e.graph_id
   and destination.place_id = e.to_place_id
  where origin.resort_slug is not null
    and destination.resort_slug is not null
    and origin.resort_slug <> destination.resort_slug
),
graph_path_options as (
  select
    p.graph_id,
    g.version as graph_version,
    'graph_path:' || array_to_string(p.edge_path, '|') as option_id,
    'graph_path'::text as option_kind,
    p.origin_place_id,
    origin.name as origin_name,
    origin.resort_slug as origin_resort_slug,
    p.destination_place_id,
    destination.name as destination_name,
    destination.resort_slug as destination_resort_slug,
    p.mode_path[1] as mode,
    case
      when p.mode_path[1] = 'monorail' then 'monorail'
      when p.mode_path[1] in ('aerial_lift', 'skyliner') then 'skyliner'
      when p.mode_path[1] in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when p.mode_path[1] = 'walk' then 'walk'
      when p.mode_path[1] = 'bus' then 'bus'
      else p.mode_path[1]
    end as transport_filter_mode,
    null::text as route_pattern_id,
    (
      select string_agg(ordered_steps.label, ' + ' order by ordered_steps.first_ordinal)
      from (
        select
          coalesce(nullif(step.route_label, ''), step.mode) as label,
          min(step.ordinal) as first_ordinal
        from unnest(p.mode_path, p.route_label_path) with ordinality as step(mode, route_label, ordinal)
        group by coalesce(nullif(step.route_label, ''), step.mode)
      ) ordered_steps
    ) as route_public_identifier,
    null::text as route_color_or_flag,
    'one_transfer_graph_path'::text as service_type,
    'transfer_path'::text as directness,
    p.depth - 1 as transfer_count,
    coalesce(p.place_path[2:greatest(array_length(p.place_path, 1) - 1, 2)], '{}'::text[]) as via_place_ids,
    coalesce(
      array(
        select via_place.name
        from unnest(coalesce(p.place_path[2:greatest(array_length(p.place_path, 1) - 1, 2)], '{}'::text[])) with ordinality as via_refs(place_id, ordinal)
        join public.wdw_transport_places via_place
          on via_place.graph_id = p.graph_id
         and via_place.place_id = via_refs.place_id
        order by via_refs.ordinal
      ),
      '{}'::text[]
    ) as via_place_names,
    'generated_graph_path'::text as evidence_level,
    array(select distinct source_id from unnest(p.source_ids) as source_refs(source_id)) as source_ids,
    array(
      select distinct note
      from unnest(
        p.notes || array[
          'Graph path with one transfer; confirm current operating hours, destination access, and transfer availability day-of.'
        ]
      ) as note_refs(note)
    ) as notes
  from edge_paths p
  join public.wdw_transport_graphs g
    on g.id = p.graph_id
   and g.is_active = true
  join public.wdw_transport_places origin
    on origin.graph_id = p.graph_id
   and origin.place_id = p.origin_place_id
  join public.wdw_transport_places destination
    on destination.graph_id = p.graph_id
   and destination.place_id = p.destination_place_id
  where p.depth = 2
    and origin.resort_slug is not null
    and destination.resort_slug is not null
    and origin.resort_slug <> destination.resort_slug
)
select *
from od_options
where transport_filter_mode in ('monorail', 'skyliner', 'boat', 'walk', 'bus')
union all
select *
from edge_options
where transport_filter_mode in ('monorail', 'skyliner', 'boat', 'walk', 'bus')
union all
select *
from graph_path_options
where transport_filter_mode in ('monorail', 'skyliner', 'boat', 'walk', 'bus');

grant select on public.v_public_wdw_transport_connection_options to anon, authenticated;

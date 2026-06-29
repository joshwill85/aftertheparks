create or replace view public.v_public_wdw_transport_connection_options
with (security_invoker = true) as
with od_options as (
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
)
select *
from od_options
where transport_filter_mode in ('monorail', 'skyliner', 'boat', 'walk', 'bus')
union all
select *
from edge_options
where transport_filter_mode in ('monorail', 'skyliner', 'boat', 'walk', 'bus');

grant select on public.v_public_wdw_transport_connection_options to anon, authenticated;

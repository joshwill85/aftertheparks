-- One-time Walt Disney World transportation graph ingest.
-- Static public read tables; writes are service-role only.

create table public.wdw_transport_graphs (
  id text primary key,
  dataset_id text not null,
  version text not null,
  name text not null,
  generated_date date,
  checksum_sha256 text not null,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  source_sha256 text,
  imported_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object'),
  check (jsonb_typeof(warnings) = 'array')
);

create unique index wdw_transport_graphs_one_active_idx
  on public.wdw_transport_graphs (is_active)
  where is_active = true;

create table public.wdw_transport_sources (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  source_id text not null,
  title text not null,
  publisher text not null,
  url text not null,
  source_level text not null,
  notes text,
  primary key (graph_id, source_id)
);

create table public.wdw_transport_operating_rules (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  rule_id text not null,
  mode text,
  summary text,
  rule_json jsonb not null default '{}'::jsonb,
  source_ids text[] not null default '{}',
  primary key (graph_id, rule_id),
  check (jsonb_typeof(rule_json) = 'object')
);

create table public.wdw_transport_places (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  place_id text not null,
  name text not null,
  place_type text not null,
  category text,
  area text not null,
  official_url text,
  aliases text[] not null default '{}',
  transport_complex_id text,
  official_transport_modes_badged_by_disney text[] not null default '{}',
  source_ids text[] not null default '{}',
  notes text[] not null default '{}',
  selectable boolean not null default false,
  stop_ids text[] not null default '{}',
  resort_slug text references public.resorts(slug) on delete restrict,
  primary key (graph_id, place_id)
);

create table public.wdw_transport_stops (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  stop_id text not null,
  name text not null,
  mode text not null,
  place_ids text[] not null default '{}',
  transport_complex_id text,
  stop_type text,
  location_description text,
  parent_station_id text,
  source_ids text[] not null default '{}',
  notes text[] not null default '{}',
  primary key (graph_id, stop_id)
);

create table public.wdw_transport_route_patterns (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  route_pattern_id text not null,
  name text not null,
  mode text not null,
  submode text,
  gtfs_route_type integer,
  operating_rule_id text,
  public_identifier text,
  public_color_or_flag text,
  color_meaning text,
  stop_sequence_place_ids text[] not null default '{}',
  bidirectional boolean not null default false,
  directional_loop boolean not null default false,
  headway_min jsonb,
  estimated_total_duration_min jsonb,
  transfer_notes text[] not null default '{}',
  evidence_level text,
  source_ids text[] not null default '{}',
  notes text[] not null default '{}',
  primary key (graph_id, route_pattern_id),
  foreign key (graph_id, operating_rule_id)
    references public.wdw_transport_operating_rules(graph_id, rule_id)
    on delete restrict
);

create table public.wdw_transport_edges (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  edge_id text not null,
  from_place_id text not null,
  to_place_id text not null,
  from_stop_id text,
  to_stop_id text,
  mode text not null,
  route_pattern_id text not null,
  route_public_identifier text,
  route_color_or_flag text,
  directness text,
  edge_kind text,
  transfer_count integer not null default 0,
  bidirectional_service boolean not null default false,
  operating_rule_id text,
  headway_min jsonb,
  duration_min jsonb not null default '{}'::jsonb,
  evidence_level text,
  source_ids text[] not null default '{}',
  notes text[] not null default '{}',
  primary key (graph_id, edge_id),
  foreign key (graph_id, from_place_id)
    references public.wdw_transport_places(graph_id, place_id)
    on delete cascade,
  foreign key (graph_id, to_place_id)
    references public.wdw_transport_places(graph_id, place_id)
    on delete cascade,
  foreign key (graph_id, from_stop_id)
    references public.wdw_transport_stops(graph_id, stop_id)
    on delete restrict,
  foreign key (graph_id, to_stop_id)
    references public.wdw_transport_stops(graph_id, stop_id)
    on delete restrict,
  foreign key (graph_id, route_pattern_id)
    references public.wdw_transport_route_patterns(graph_id, route_pattern_id)
    on delete restrict,
  foreign key (graph_id, operating_rule_id)
    references public.wdw_transport_operating_rules(graph_id, rule_id)
    on delete restrict,
  check (transfer_count >= 0),
  check (jsonb_typeof(duration_min) = 'object')
);

create table public.wdw_transport_od_services (
  graph_id text not null references public.wdw_transport_graphs(id) on delete cascade,
  od_service_id text not null,
  origin_place_id text not null,
  destination_place_id text not null,
  mode text not null,
  route_pattern_id text not null,
  route_public_identifier text,
  route_color_or_flag text,
  service_type text,
  transfer_count integer not null default 0,
  via_place_ids text[] not null default '{}',
  operating_rule_id text,
  estimated_duration_min jsonb,
  duration_source_level text,
  evidence_level text,
  source_ids text[] not null default '{}',
  notes text[] not null default '{}',
  primary key (graph_id, od_service_id),
  foreign key (graph_id, origin_place_id)
    references public.wdw_transport_places(graph_id, place_id)
    on delete cascade,
  foreign key (graph_id, destination_place_id)
    references public.wdw_transport_places(graph_id, place_id)
    on delete cascade,
  foreign key (graph_id, route_pattern_id)
    references public.wdw_transport_route_patterns(graph_id, route_pattern_id)
    on delete restrict,
  foreign key (graph_id, operating_rule_id)
    references public.wdw_transport_operating_rules(graph_id, rule_id)
    on delete restrict,
  check (transfer_count >= 0)
);

create index wdw_transport_places_resort_slug_idx
  on public.wdw_transport_places (resort_slug)
  where resort_slug is not null;
create index wdw_transport_places_selectable_idx
  on public.wdw_transport_places (graph_id, selectable);
create index wdw_transport_stops_mode_idx
  on public.wdw_transport_stops (graph_id, mode);
create index wdw_transport_route_patterns_mode_idx
  on public.wdw_transport_route_patterns (graph_id, mode);
create index wdw_transport_edges_from_idx
  on public.wdw_transport_edges (graph_id, from_place_id, mode);
create index wdw_transport_edges_to_idx
  on public.wdw_transport_edges (graph_id, to_place_id, mode);
create index wdw_transport_edges_from_to_idx
  on public.wdw_transport_edges (graph_id, from_place_id, to_place_id);
create index wdw_transport_edges_mode_idx
  on public.wdw_transport_edges (graph_id, mode);
create index wdw_transport_od_services_origin_destination_idx
  on public.wdw_transport_od_services (
    graph_id,
    origin_place_id,
    destination_place_id,
    mode
  );
create index wdw_transport_od_services_destination_idx
  on public.wdw_transport_od_services (graph_id, destination_place_id, mode);

alter table public.wdw_transport_graphs enable row level security;
alter table public.wdw_transport_sources enable row level security;
alter table public.wdw_transport_operating_rules enable row level security;
alter table public.wdw_transport_places enable row level security;
alter table public.wdw_transport_stops enable row level security;
alter table public.wdw_transport_route_patterns enable row level security;
alter table public.wdw_transport_edges enable row level security;
alter table public.wdw_transport_od_services enable row level security;

revoke all on public.wdw_transport_graphs from anon, authenticated;
revoke all on public.wdw_transport_sources from anon, authenticated;
revoke all on public.wdw_transport_operating_rules from anon, authenticated;
revoke all on public.wdw_transport_places from anon, authenticated;
revoke all on public.wdw_transport_stops from anon, authenticated;
revoke all on public.wdw_transport_route_patterns from anon, authenticated;
revoke all on public.wdw_transport_edges from anon, authenticated;
revoke all on public.wdw_transport_od_services from anon, authenticated;

grant select on public.wdw_transport_graphs to anon, authenticated;
grant select on public.wdw_transport_sources to anon, authenticated;
grant select on public.wdw_transport_operating_rules to anon, authenticated;
grant select on public.wdw_transport_places to anon, authenticated;
grant select on public.wdw_transport_stops to anon, authenticated;
grant select on public.wdw_transport_route_patterns to anon, authenticated;
grant select on public.wdw_transport_edges to anon, authenticated;
grant select on public.wdw_transport_od_services to anon, authenticated;

grant all on public.wdw_transport_graphs to service_role;
grant all on public.wdw_transport_sources to service_role;
grant all on public.wdw_transport_operating_rules to service_role;
grant all on public.wdw_transport_places to service_role;
grant all on public.wdw_transport_stops to service_role;
grant all on public.wdw_transport_route_patterns to service_role;
grant all on public.wdw_transport_edges to service_role;
grant all on public.wdw_transport_od_services to service_role;

create policy "Public can read WDW transport graphs"
  on public.wdw_transport_graphs for select to anon, authenticated using (true);
create policy "Service role manages WDW transport graphs"
  on public.wdw_transport_graphs for all to service_role using (true) with check (true);

create policy "Public can read WDW transport sources"
  on public.wdw_transport_sources for select to anon, authenticated using (true);
create policy "Service role manages WDW transport sources"
  on public.wdw_transport_sources for all to service_role using (true) with check (true);

create policy "Public can read WDW transport operating rules"
  on public.wdw_transport_operating_rules for select to anon, authenticated using (true);
create policy "Service role manages WDW transport operating rules"
  on public.wdw_transport_operating_rules for all to service_role using (true) with check (true);

create policy "Public can read WDW transport places"
  on public.wdw_transport_places for select to anon, authenticated using (true);
create policy "Service role manages WDW transport places"
  on public.wdw_transport_places for all to service_role using (true) with check (true);

create policy "Public can read WDW transport stops"
  on public.wdw_transport_stops for select to anon, authenticated using (true);
create policy "Service role manages WDW transport stops"
  on public.wdw_transport_stops for all to service_role using (true) with check (true);

create policy "Public can read WDW transport route patterns"
  on public.wdw_transport_route_patterns for select to anon, authenticated using (true);
create policy "Service role manages WDW transport route patterns"
  on public.wdw_transport_route_patterns for all to service_role using (true) with check (true);

create policy "Public can read WDW transport edges"
  on public.wdw_transport_edges for select to anon, authenticated using (true);
create policy "Service role manages WDW transport edges"
  on public.wdw_transport_edges for all to service_role using (true) with check (true);

create policy "Public can read WDW transport OD services"
  on public.wdw_transport_od_services for select to anon, authenticated using (true);
create policy "Service role manages WDW transport OD services"
  on public.wdw_transport_od_services for all to service_role using (true) with check (true);

create or replace view public.v_public_wdw_transport_places
with (security_invoker = true) as
select
  p.graph_id,
  g.version as graph_version,
  p.place_id,
  p.name,
  p.place_type,
  p.category,
  p.area,
  p.official_url,
  p.aliases,
  p.transport_complex_id,
  p.official_transport_modes_badged_by_disney,
  p.source_ids,
  p.notes,
  p.selectable,
  p.stop_ids,
  p.resort_slug
from public.wdw_transport_places p
join public.wdw_transport_graphs g on g.id = p.graph_id
where g.is_active = true;

create or replace view public.v_public_wdw_transport_od_services
with (security_invoker = true) as
select
  s.graph_id,
  g.version as graph_version,
  s.od_service_id,
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
  s.transfer_count,
  s.via_place_ids,
  s.operating_rule_id,
  s.estimated_duration_min,
  s.duration_source_level,
  s.evidence_level,
  s.source_ids,
  s.notes
from public.wdw_transport_od_services s
join public.wdw_transport_graphs g on g.id = s.graph_id
join public.wdw_transport_places origin
  on origin.graph_id = s.graph_id and origin.place_id = s.origin_place_id
join public.wdw_transport_places destination
  on destination.graph_id = s.graph_id and destination.place_id = s.destination_place_id
where g.is_active = true;

create or replace view public.v_public_wdw_resort_transport_modes
with (security_invoker = true) as
with place_modes as (
  select
    p.graph_id,
    p.place_id,
    p.name as place_name,
    p.resort_slug,
    case
      when mode_value = 'monorail' then 'monorail'
      when mode_value in ('aerial_lift', 'skyliner') then 'skyliner'
      when mode_value in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when mode_value = 'walk' then 'walk'
      when mode_value = 'bus' then 'bus'
      else null
    end as transport_filter_mode,
    'place_badge'::text as evidence_kind,
    p.source_ids,
    p.notes
  from public.wdw_transport_places p
  join public.wdw_transport_graphs g on g.id = p.graph_id
  cross join unnest(p.official_transport_modes_badged_by_disney) as modes(mode_value)
  where p.resort_slug is not null
    and g.is_active = true
),
stop_modes as (
  select
    p.graph_id,
    p.place_id,
    p.name as place_name,
    p.resort_slug,
    case
      when s.mode = 'monorail' then 'monorail'
      when s.mode in ('aerial_lift', 'skyliner') then 'skyliner'
      when s.mode in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when s.mode = 'walk' then 'walk'
      when s.mode = 'bus' then 'bus'
      else null
    end as transport_filter_mode,
    'stop_mode'::text as evidence_kind,
    s.source_ids,
    s.notes
  from public.wdw_transport_places p
  join public.wdw_transport_graphs g on g.id = p.graph_id
  join public.wdw_transport_stops s
    on s.graph_id = p.graph_id and p.place_id = any(s.place_ids)
  where p.resort_slug is not null
    and g.is_active = true
),
edge_modes as (
  select
    p.graph_id,
    p.place_id,
    p.name as place_name,
    p.resort_slug,
    case
      when e.mode = 'monorail' then 'monorail'
      when e.mode in ('aerial_lift', 'skyliner') then 'skyliner'
      when e.mode in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when e.mode = 'walk' then 'walk'
      when e.mode = 'bus' then 'bus'
      else null
    end as transport_filter_mode,
    'edge_mode'::text as evidence_kind,
    e.source_ids,
    e.notes
  from public.wdw_transport_places p
  join public.wdw_transport_graphs g on g.id = p.graph_id
  join public.wdw_transport_edges e
    on e.graph_id = p.graph_id
    and (e.from_place_id = p.place_id or e.to_place_id = p.place_id)
  where p.resort_slug is not null
    and g.is_active = true
),
od_modes as (
  select
    p.graph_id,
    p.place_id,
    p.name as place_name,
    p.resort_slug,
    case
      when s.mode = 'monorail' then 'monorail'
      when s.mode in ('aerial_lift', 'skyliner') then 'skyliner'
      when s.mode in ('ferry_boat', 'watercraft', 'ferry') then 'boat'
      when s.mode = 'walk' then 'walk'
      when s.mode = 'bus' then 'bus'
      else null
    end as transport_filter_mode,
    'od_service_mode'::text as evidence_kind,
    s.source_ids,
    s.notes
  from public.wdw_transport_places p
  join public.wdw_transport_graphs g on g.id = p.graph_id
  join public.wdw_transport_od_services s
    on s.graph_id = p.graph_id
    and (s.origin_place_id = p.place_id or s.destination_place_id = p.place_id)
  where p.resort_slug is not null
    and g.is_active = true
)
select distinct
  graph_id,
  place_id,
  place_name,
  resort_slug,
  transport_filter_mode,
  evidence_kind,
  source_ids,
  notes
from (
  select * from place_modes
  union all
  select * from stop_modes
  union all
  select * from edge_modes
  union all
  select * from od_modes
) modes
where transport_filter_mode in ('monorail', 'skyliner', 'boat', 'walk', 'bus');

grant select on public.v_public_wdw_transport_places to anon, authenticated;
grant select on public.v_public_wdw_transport_od_services to anon, authenticated;
grant select on public.v_public_wdw_resort_transport_modes to anon, authenticated;

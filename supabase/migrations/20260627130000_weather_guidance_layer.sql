-- Weather guidance cache, official alerts, and material-change ledger

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.weather_locations (
  location_key text primary key,
  display_name text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weather_locations_location_key_check check (
    location_key in (
      'magic_kingdom_resort_area',
      'epcot_boardwalk_area',
      'skyliner_area',
      'animal_kingdom_lodge_area',
      'disney_springs_area',
      'all_wdw'
    )
  ),
  constraint weather_locations_timezone_check check (timezone = 'America/New_York')
);

insert into public.weather_locations (location_key, display_name, latitude, longitude, timezone)
values
  ('magic_kingdom_resort_area', 'Magic Kingdom Resort Area', 28.4177, -81.5812, 'America/New_York'),
  ('epcot_boardwalk_area', 'EPCOT and BoardWalk Area', 28.3707, -81.5527, 'America/New_York'),
  ('skyliner_area', 'Disney Skyliner Area', 28.3650, -81.5434, 'America/New_York'),
  ('animal_kingdom_lodge_area', 'Animal Kingdom Lodge Area', 28.3502, -81.6043, 'America/New_York'),
  ('disney_springs_area', 'Disney Springs Area', 28.3703, -81.5192, 'America/New_York'),
  ('all_wdw', 'Walt Disney World Resort', 28.3772, -81.5707, 'America/New_York')
on conflict (location_key) do update set
  display_name = excluded.display_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  timezone = excluded.timezone,
  updated_at = now();

alter table public.weather_locations enable row level security;

create policy "Service role manages weather locations"
  on public.weather_locations for all to service_role
  using (true) with check (true);

create table if not exists public.activity_weather_profiles (
  activity_slug text primary key,
  profile_tags text[] not null default '{}',
  profile_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_weather_profiles_tags_idx
  on public.activity_weather_profiles using gin (profile_tags);

alter table public.activity_weather_profiles enable row level security;

create policy "Service role manages activity weather profiles"
  on public.activity_weather_profiles for all to service_role
  using (true) with check (true);

create table if not exists public.weather_snapshots (
  cache_key text primary key,
  location_key text not null,
  provider text not null,
  confidence text not null,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  stale_after timestamptz not null,
  is_stale boolean not null default false,
  payload jsonb not null,
  attribution jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weather_snapshots_location_key_check check (
    location_key in (
      'magic_kingdom_resort_area',
      'epcot_boardwalk_area',
      'skyliner_area',
      'animal_kingdom_lodge_area',
      'disney_springs_area',
      'all_wdw'
    )
  ),
  constraint weather_snapshots_provider_check check (
    provider in ('weatherapi', 'nws_forecast', 'visual_crossing')
  ),
  constraint weather_snapshots_confidence_check check (
    confidence in (
      'current_conditions',
      'near_term_hourly',
      'official_7_day',
      'long_range_planning',
      'not_available_yet'
    )
  )
);

create index if not exists weather_snapshots_location_provider_idx
  on public.weather_snapshots (location_key, provider, fetched_at desc);

create index if not exists weather_snapshots_expiry_idx
  on public.weather_snapshots (expires_at, stale_after);

alter table public.weather_snapshots enable row level security;

create policy "Service role manages weather snapshots"
  on public.weather_snapshots for all to service_role
  using (true) with check (true);

create table if not exists public.weather_alerts (
  provider_alert_id text primary key,
  location_key text not null,
  event text not null,
  headline text not null,
  severity text not null,
  urgency text not null,
  certainty text not null,
  effective timestamptz not null,
  expires timestamptz not null,
  area_desc text,
  instruction text,
  description text,
  source_url text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weather_alerts_location_key_check check (
    location_key in (
      'magic_kingdom_resort_area',
      'epcot_boardwalk_area',
      'skyliner_area',
      'animal_kingdom_lodge_area',
      'disney_springs_area',
      'all_wdw'
    )
  ),
  constraint weather_alerts_severity_check check (
    severity in ('Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown')
  ),
  constraint weather_alerts_urgency_check check (
    urgency in ('Immediate', 'Expected', 'Future', 'Past', 'Unknown')
  ),
  constraint weather_alerts_certainty_check check (
    certainty in ('Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown')
  )
);

create index if not exists weather_alerts_active_idx
  on public.weather_alerts (location_key, effective, expires);

create index if not exists weather_alerts_expiry_idx
  on public.weather_alerts (expires);

alter table public.weather_alerts enable row level security;

create policy "Service role manages weather alerts"
  on public.weather_alerts for all to service_role
  using (true) with check (true);

create table if not exists public.plan_weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  snapshot_payload jsonb not null,
  resilience_score jsonb,
  source_snapshot_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists plan_weather_snapshots_plan_idx
  on public.plan_weather_snapshots (plan_id, created_at desc);

alter table public.plan_weather_snapshots enable row level security;

create policy "Service role manages plan weather snapshots"
  on public.plan_weather_snapshots for all to service_role
  using (true) with check (true);

create table if not exists public.weather_material_changes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  location_key text not null,
  previous_guidance jsonb,
  next_guidance jsonb not null,
  change_kind text not null,
  severity text not null,
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint weather_material_changes_entity_type_check check (
    entity_type in ('activity_occurrence', 'plan_item', 'route_leg', 'location_window')
  ),
  constraint weather_material_changes_location_key_check check (
    location_key in (
      'magic_kingdom_resort_area',
      'epcot_boardwalk_area',
      'skyliner_area',
      'animal_kingdom_lodge_area',
      'disney_springs_area',
      'all_wdw'
    )
  ),
  constraint weather_material_changes_change_kind_check check (
    change_kind in (
      'forecast_available',
      'forecast_unavailable',
      'rain_risk_changed',
      'storm_risk_changed',
      'heat_risk_changed',
      'official_alert_started',
      'official_alert_expired',
      'backup_recommended_changed'
    )
  ),
  constraint weather_material_changes_severity_check check (
    severity in ('low', 'medium', 'high')
  )
);

create index if not exists weather_material_changes_entity_idx
  on public.weather_material_changes (entity_type, entity_id, detected_at desc);

create index if not exists weather_material_changes_unacknowledged_idx
  on public.weather_material_changes (detected_at desc)
  where acknowledged_at is null;

alter table public.weather_material_changes enable row level security;

create policy "Service role manages weather material changes"
  on public.weather_material_changes for all to service_role
  using (true) with check (true);

revoke all on table
  public.weather_locations,
  public.activity_weather_profiles,
  public.weather_snapshots,
  public.weather_alerts,
  public.plan_weather_snapshots,
  public.weather_material_changes
from anon, authenticated;

grant all on table
  public.weather_locations,
  public.activity_weather_profiles,
  public.weather_snapshots,
  public.weather_alerts,
  public.plan_weather_snapshots,
  public.weather_material_changes
to service_role;

-- Durable cache state for NWS alert checks, including fresh zero-alert results.

create table if not exists public.weather_alert_cache_state (
  cache_key text primary key,
  location_key text not null,
  fetched_at timestamptz not null,
  stale_after timestamptz not null,
  active_alert_count integer not null default 0,
  status text not null default 'fresh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weather_alert_cache_state_location_key_check check (
    location_key in (
      'magic_kingdom_resort_area',
      'epcot_boardwalk_area',
      'skyliner_area',
      'animal_kingdom_lodge_area',
      'disney_springs_area',
      'all_wdw'
    )
  ),
  constraint weather_alert_cache_state_count_check check (active_alert_count >= 0),
  constraint weather_alert_cache_state_status_check check (
    status in ('fresh', 'stale', 'provider_error')
  )
);

create index if not exists weather_alert_cache_state_stale_idx
  on public.weather_alert_cache_state (stale_after);

alter table public.weather_alert_cache_state enable row level security;

create policy "Service role manages weather alert cache state"
  on public.weather_alert_cache_state for all to service_role
  using (true) with check (true);

revoke all on table public.weather_alert_cache_state from anon, authenticated;
grant all on table public.weather_alert_cache_state to service_role;

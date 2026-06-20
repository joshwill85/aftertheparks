-- PRD Section 12 enrichment + planning + search support

create extension if not exists pg_trgm;

create type public.activity_status as enum ('active', 'seasonal', 'paused', 'needs_review');
create type public.weather_dependency as enum ('indoor', 'outdoor', 'mixed', 'weather_dependent');
create type public.price_state as enum ('free', 'fee', 'unknown');
create type public.correction_status as enum ('pending', 'reviewed', 'applied', 'rejected');

-- 1:1 enrichment per catalog activity
create table public.activity_enrichment (
  activity_catalog_id uuid primary key references public.activity_catalog(id) on delete cascade,
  summary_original text,
  duration_minutes smallint,
  weather_dependency public.weather_dependency,
  price_state public.price_state not null default 'unknown',
  price_notes text,
  age_fit jsonb not null default '{"all_ages": true}'::jsonb,
  environment text[] not null default '{}',
  sensory jsonb not null default '{}'::jsonb,
  accessibility jsonb not null default '{}'::jsonb,
  reservation_required boolean,
  reservation_url text,
  reservation_notes text,
  geo_lat double precision,
  geo_lng double precision,
  meeting_location_detail text,
  hero_image_url text,
  image_rights jsonb,
  status public.activity_status not null default 'active',
  verification_last_checked timestamptz,
  verification_source_url text,
  search_vector tsvector,
  updated_at timestamptz not null default now()
);

create index activity_enrichment_status_idx on public.activity_enrichment (status);
create index activity_enrichment_search_idx on public.activity_enrichment using gin (search_vector);

-- Normalized occurrence rules (bridges activity_schedules)
create table public.activity_occurrence_rules (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  edition_id uuid references public.calendar_editions(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  effective_from date,
  effective_until date,
  timezone text not null default 'America/New_York',
  schedule_notes text,
  is_daily boolean not null default false,
  created_at timestamptz not null default now()
);

create index activity_occurrence_rules_catalog_idx
  on public.activity_occurrence_rules (activity_catalog_id, edition_id);

-- Shareable plan snapshots
create table public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  share_slug text not null unique,
  payload jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

create index saved_plans_slug_idx on public.saved_plans (share_slug);

-- User corrections queue
create table public.content_corrections (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid references public.activity_catalog(id) on delete set null,
  field text not null,
  suggested_value text not null,
  submitted_at timestamptz not null default now(),
  status public.correction_status not null default 'pending'
);

-- Search vector maintenance
create or replace function public.activity_enrichment_search_vector_update()
returns trigger language plpgsql as $$
declare
  activity_name text;
begin
  select ac.canonical_name into activity_name
  from public.activity_catalog ac
  where ac.id = new.activity_catalog_id;

  new.search_vector :=
    setweight(to_tsvector('english', coalesce(activity_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary_original, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.meeting_location_detail, '')), 'C');
  return new;
end;
$$;

create trigger activity_enrichment_search_vector_trg
  before insert or update on public.activity_enrichment
  for each row execute function public.activity_enrichment_search_vector_update();

-- Backfill occurrence rules from legacy schedules where catalog_id is set
insert into public.activity_occurrence_rules (
  activity_catalog_id, edition_id, day_of_week, start_time, end_time, schedule_notes, is_daily
)
select
  s.activity_catalog_id,
  s.edition_id,
  case s.day_of_week
    when 'sunday' then 0 when 'monday' then 1 when 'tuesday' then 2
    when 'wednesday' then 3 when 'thursday' then 4 when 'friday' then 5
    when 'saturday' then 6
  end,
  s.start_time,
  s.end_time,
  s.schedule_notes,
  s.is_daily
from public.activity_schedules s
where s.activity_catalog_id is not null
on conflict do nothing;

-- Seed enrichment rows for all catalog activities
insert into public.activity_enrichment (
  activity_catalog_id,
  price_state,
  status,
  verification_source_url
)
select
  ac.id,
  case
    when rae.is_fee_based then 'fee'::public.price_state
    else 'free'::public.price_state
  end,
  case when rae.needs_review then 'needs_review'::public.activity_status else 'active'::public.activity_status end,
  sd.canonical_url
from public.activity_catalog ac
join public.resort_activity_editions rae on rae.activity_catalog_id = ac.id
join public.calendar_editions ce on ce.id = rae.edition_id and ce.is_current = true
left join public.source_documents sd on sd.id = ce.source_document_id
where rae.is_active = true
on conflict (activity_catalog_id) do nothing;

update public.activity_enrichment ae
set
  verification_last_checked = now(),
  summary_original = coalesce(
    ae.summary_original,
    left(rae.description, 500)
  ),
  meeting_location_detail = coalesce(ae.meeting_location_detail, rae.location),
  environment = case rae.category
    when 'poolside' then array['pool', 'outdoor']
    when 'campfire' then array['outdoor', 'evening']
    when 'movies_under_stars' then array['outdoor', 'evening']
    when 'fitness_wellness' then array['fitness']
    when 'arts_crafts' then array['indoor']
    else array['resort']
  end::text[],
  weather_dependency = case
    when rae.category in ('poolside', 'campfire', 'movies_under_stars') then 'outdoor'::public.weather_dependency
    when rae.category = 'fitness_wellness' then 'indoor'::public.weather_dependency
    else 'mixed'::public.weather_dependency
  end
from public.resort_activity_editions rae
join public.calendar_editions ce on ce.id = rae.edition_id and ce.is_current = true
where ae.activity_catalog_id = rae.activity_catalog_id
  and rae.is_active = true;

-- Search RPC
create or replace function public.search_activities(
  query_text text,
  filters jsonb default '{}'::jsonb
)
returns table (
  activity_catalog_id uuid,
  activity_name text,
  normalized_name text,
  resort_slug text,
  resort_name text,
  category public.activity_category,
  rank real
)
language sql stable as $$
  with base as (
    select
      v.activity_catalog_id,
      v.activity_name,
      v.normalized_name,
      v.resort_slug,
      v.resort_name,
      v.category,
      coalesce(
        ts_rank(ae.search_vector, websearch_to_tsquery('english', query_text)),
        similarity(v.activity_name, query_text)
      ) as rank
    from public.v_resort_activities_today v
    left join public.activity_enrichment ae on ae.activity_catalog_id = v.activity_catalog_id
    where v.needs_review = false
      and coalesce(ae.status, 'active') != 'needs_review'
      and (
        query_text is null or query_text = ''
        or ae.search_vector @@ websearch_to_tsquery('english', query_text)
        or v.activity_name % query_text
        or v.resort_name % query_text
      )
      and (
        filters->>'resort' is null
        or v.resort_slug = filters->>'resort'
      )
      and (
        filters->>'category' is null
        or v.category::text = filters->>'category'
      )
  )
  select * from base
  order by rank desc nulls last, activity_name
  limit coalesce((filters->>'limit')::int, 50);
$$;

grant execute on function public.search_activities(text, jsonb) to anon, authenticated;

-- RLS
alter table public.activity_enrichment enable row level security;
alter table public.activity_occurrence_rules enable row level security;
alter table public.saved_plans enable row level security;
alter table public.content_corrections enable row level security;

create policy "Activity enrichment publicly readable"
  on public.activity_enrichment for select to anon, authenticated using (status != 'needs_review');

create policy "Occurrence rules publicly readable"
  on public.activity_occurrence_rules for select to anon, authenticated using (true);

create policy "Saved plans publicly readable"
  on public.saved_plans for select to anon, authenticated using (expires_at > now());

create policy "Anyone can create saved plans"
  on public.saved_plans for insert to anon, authenticated with check (true);

create policy "Anyone can submit corrections"
  on public.content_corrections for insert to anon, authenticated with check (true);

create policy "Service role manages enrichment"
  on public.activity_enrichment for all to service_role using (true) with check (true);
create policy "Service role manages occurrence rules"
  on public.activity_occurrence_rules for all to service_role using (true) with check (true);
create policy "Service role manages saved plans"
  on public.saved_plans for all to service_role using (true) with check (true);
create policy "Service role manages corrections"
  on public.content_corrections for all to service_role using (true) with check (true);

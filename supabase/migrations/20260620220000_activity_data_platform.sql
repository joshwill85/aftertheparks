-- Medallion activity data platform: lineage, temporal editions, enrichment

create type public.source_type as enum ('pdf', 'html', 'events_tours');
create type public.ingest_status as enum ('running', 'success', 'failed', 'partial');
create type public.ingest_trigger as enum ('scheduled', 'manual', 'discovery');
create type public.cross_resort_rule_type as enum ('full_access', 'specific_activities');

-- Bronze: immutable source artifacts
create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_type public.source_type not null,
  canonical_url text not null,
  fetched_url text,
  content_sha256 text not null,
  etag text,
  content_length bigint,
  storage_path text,
  http_status smallint,
  calendar_group_key text references public.activity_calendar_groups(calendar_group_key) on delete set null,
  fetched_at timestamptz not null default now(),
  unique (content_sha256)
);

create index source_documents_group_idx on public.source_documents (calendar_group_key);
create index source_documents_url_idx on public.source_documents (canonical_url);

-- Audit trail for ingest runs
create table public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status public.ingest_status not null default 'running',
  parser_version text not null,
  trigger public.ingest_trigger not null default 'manual',
  summary_json jsonb not null default '{}'::jsonb
);

-- Silver: raw extractions (recomputable from bronze)
create table public.raw_extractions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  ingest_run_id uuid references public.ingest_runs(id) on delete set null,
  parser_version text not null,
  profile_key text not null default 'aframe_standard',
  ocr_text text,
  extraction_json jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index raw_extractions_source_idx on public.raw_extractions (source_document_id);

-- Parser profiles for layout variance
create table public.parse_profiles (
  profile_key text primary key,
  section_headers_json jsonb not null default '[]'::jsonb,
  layout_hints_json jsonb not null default '{}'::jsonb,
  parser_version text not null,
  description text
);

insert into public.parse_profiles (profile_key, section_headers_json, parser_version, description) values
  ('aframe_standard', '["FAMILY WELLNESS","RESORT ACTIVITIES","SIGNATURE ACTIVITIES","MOVIE UNDER THE STARS"]'::jsonb, '2.0.0', 'Standard A-frame recreation calendar'),
  ('aframe_caribbean_graphic', '["FAMILY WELLNESS","RESORT ACTIVITIES","SIGNATURE ACTIVITIES","MOVIE UNDER THE STARS"]'::jsonb, '2.0.0', 'Graphic headings; uses layout block inference'),
  ('fort_wilderness_html', '[]'::jsonb, '2.0.0', 'Manual HTML-curated activities');

-- Temporal edition spine
create table public.calendar_editions (
  id uuid primary key default gen_random_uuid(),
  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  edition_code text not null,
  valid_from date,
  valid_until date,
  source_document_id uuid references public.source_documents(id) on delete set null,
  is_current boolean not null default false,
  supersedes_edition_id uuid references public.calendar_editions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (calendar_group_key, edition_code)
);

create index calendar_editions_current_idx on public.calendar_editions (calendar_group_key, is_current)
  where is_current = true;

alter table public.activity_calendar_groups
  add column current_edition_id uuid references public.calendar_editions(id) on delete set null;

-- Stable activity identity across editions
create table public.activity_catalog (
  id uuid primary key,
  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  canonical_name text not null,
  normalized_name text not null,
  default_category public.activity_category not null,
  is_deprecated boolean not null default false,
  unique (calendar_group_key, normalized_name)
);

-- SCD Type 2 activity facts per edition
create table public.resort_activity_editions (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  edition_id uuid not null references public.calendar_editions(id) on delete cascade,
  name text not null,
  category public.activity_category not null,
  section text not null,
  location text,
  schedule_text text,
  description text,
  is_fee_based boolean not null default false,
  is_daily boolean not null default false,
  fee_amount_cents integer,
  parse_confidence numeric(4, 3) not null default 1,
  needs_review boolean not null default false,
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  raw_extraction_id uuid references public.raw_extractions(id) on delete set null,
  unique (activity_catalog_id, edition_id)
);

create index resort_activity_editions_edition_idx on public.resort_activity_editions (edition_id);
create index resort_activity_editions_active_idx on public.resort_activity_editions (edition_id, is_active)
  where is_active = true;

-- Cross-resort participation rules
create table public.activity_cross_resort_access (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.calendar_editions(id) on delete cascade,
  host_calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  guest_resort_id uuid not null references public.resorts(id) on delete cascade,
  rule_type public.cross_resort_rule_type not null default 'full_access',
  notes text,
  unique (edition_id, host_calendar_group_key, guest_resort_id)
);

-- Extend schedules and movie nights with edition scope
alter table public.activity_schedules
  add column edition_id uuid references public.calendar_editions(id) on delete cascade,
  add column activity_catalog_id uuid references public.activity_catalog(id) on delete cascade;

alter table public.movie_nights
  add column edition_id uuid references public.calendar_editions(id) on delete cascade,
  add column activity_catalog_id uuid references public.activity_catalog(id) on delete cascade,
  add column rain_backup_location text,
  add column parse_confidence numeric(4, 3) not null default 1;

create index activity_schedules_edition_idx on public.activity_schedules (edition_id);
create index movie_nights_edition_idx on public.movie_nights (edition_id);

-- Phase 2 enrichment tables
create table public.activity_booking_metadata (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  price_cents_min integer,
  price_cents_max integer,
  age_minimum smallint,
  duration_minutes smallint,
  reservation_required boolean,
  booking_url text,
  cancellation_policy text,
  updated_at timestamptz not null default now(),
  unique (activity_catalog_id)
);

create table public.resort_pools (
  id uuid primary key default gen_random_uuid(),
  resort_id uuid not null references public.resorts(id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  name text not null,
  slug text not null,
  is_feature_pool boolean not null default false,
  hours_text text,
  disney_url text,
  unique (resort_id, slug)
);

create table public.activity_pool_links (
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  pool_id uuid not null references public.resort_pools(id) on delete cascade,
  primary key (activity_catalog_id, pool_id)
);

create table public.seasonal_overlays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  valid_from date not null,
  valid_until date not null,
  source_document_id uuid references public.source_documents(id) on delete set null,
  disney_url text,
  description text
);

create table public.calendar_edition_overlays (
  edition_id uuid not null references public.calendar_editions(id) on delete cascade,
  overlay_id uuid not null references public.seasonal_overlays(id) on delete cascade,
  primary key (edition_id, overlay_id)
);

create table public.character_appearances (
  id uuid primary key default gen_random_uuid(),
  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  edition_id uuid references public.calendar_editions(id) on delete cascade,
  character_name text not null,
  location text,
  day_of_week public.day_of_week,
  appearance_time time,
  is_scheduled boolean not null default true,
  source_document_id uuid references public.source_documents(id) on delete set null
);

-- Supabase Storage bucket for bronze PDFs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-documents',
  'source-documents',
  false,
  52428800,
  array['application/pdf', 'text/html']
)
on conflict (id) do nothing;

-- RLS: public read on all new tables
alter table public.source_documents enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.raw_extractions enable row level security;
alter table public.parse_profiles enable row level security;
alter table public.calendar_editions enable row level security;
alter table public.activity_catalog enable row level security;
alter table public.resort_activity_editions enable row level security;
alter table public.activity_cross_resort_access enable row level security;
alter table public.activity_booking_metadata enable row level security;
alter table public.resort_pools enable row level security;
alter table public.activity_pool_links enable row level security;
alter table public.seasonal_overlays enable row level security;
alter table public.calendar_edition_overlays enable row level security;
alter table public.character_appearances enable row level security;

create policy "Source documents publicly readable"
  on public.source_documents for select to anon, authenticated using (true);
create policy "Ingest runs publicly readable"
  on public.ingest_runs for select to anon, authenticated using (true);
create policy "Raw extractions publicly readable"
  on public.raw_extractions for select to anon, authenticated using (true);
create policy "Parse profiles publicly readable"
  on public.parse_profiles for select to anon, authenticated using (true);
create policy "Calendar editions publicly readable"
  on public.calendar_editions for select to anon, authenticated using (true);
create policy "Activity catalog publicly readable"
  on public.activity_catalog for select to anon, authenticated using (true);
create policy "Resort activity editions publicly readable"
  on public.resort_activity_editions for select to anon, authenticated using (true);
create policy "Cross resort access publicly readable"
  on public.activity_cross_resort_access for select to anon, authenticated using (true);
create policy "Booking metadata publicly readable"
  on public.activity_booking_metadata for select to anon, authenticated using (true);
create policy "Resort pools publicly readable"
  on public.resort_pools for select to anon, authenticated using (true);
create policy "Activity pool links publicly readable"
  on public.activity_pool_links for select to anon, authenticated using (true);
create policy "Seasonal overlays publicly readable"
  on public.seasonal_overlays for select to anon, authenticated using (true);
create policy "Character appearances publicly readable"
  on public.character_appearances for select to anon, authenticated using (true);

-- Service role write policies for ingest pipeline
create policy "Service role manages source documents"
  on public.source_documents for all to service_role using (true) with check (true);
create policy "Service role manages ingest runs"
  on public.ingest_runs for all to service_role using (true) with check (true);
create policy "Service role manages raw extractions"
  on public.raw_extractions for all to service_role using (true) with check (true);
create policy "Service role manages calendar editions"
  on public.calendar_editions for all to service_role using (true) with check (true);
create policy "Service role manages activity catalog"
  on public.activity_catalog for all to service_role using (true) with check (true);
create policy "Service role manages resort activity editions"
  on public.resort_activity_editions for all to service_role using (true) with check (true);
create policy "Service role manages cross resort access"
  on public.activity_cross_resort_access for all to service_role using (true) with check (true);
create policy "Service role manages booking metadata"
  on public.activity_booking_metadata for all to service_role using (true) with check (true);
create policy "Service role manages resort pools"
  on public.resort_pools for all to service_role using (true) with check (true);
create policy "Service role manages activity pool links"
  on public.activity_pool_links for all to service_role using (true) with check (true);
create policy "Service role manages seasonal overlays"
  on public.seasonal_overlays for all to service_role using (true) with check (true);
create policy "Service role manages character appearances"
  on public.character_appearances for all to service_role using (true) with check (true);
create policy "Service role manages calendar groups"
  on public.activity_calendar_groups for all to service_role using (true) with check (true);
create policy "Service role manages resort activities projection"
  on public.resort_activities for all to service_role using (true) with check (true);
create policy "Service role manages activity schedules"
  on public.activity_schedules for all to service_role using (true) with check (true);
create policy "Service role manages movie nights"
  on public.movie_nights for all to service_role using (true) with check (true);

create policy "Service role storage source documents"
  on storage.objects for all to service_role
  using (bucket_id = 'source-documents')
  with check (bucket_id = 'source-documents');

-- Canonical app query view
create or replace view public.v_resort_activities_today as
select
  r.id as resort_id,
  r.slug as resort_slug,
  r.name as resort_name,
  acg.calendar_group_key,
  ce.id as edition_id,
  ce.edition_code,
  ce.valid_from as edition_valid_from,
  ce.valid_until as edition_valid_until,
  ac.id as activity_catalog_id,
  rae.id as activity_edition_id,
  rae.name as activity_name,
  ac.normalized_name,
  rae.category,
  rae.section,
  rae.location,
  rae.schedule_text,
  rae.description,
  rae.is_fee_based,
  rae.is_daily,
  rae.fee_amount_cents,
  rae.parse_confidence,
  rae.needs_review,
  sd.canonical_url as source_url,
  sd.content_sha256 as source_sha256
from public.resorts r
join public.resort_activity_sources ras on ras.resort_id = r.id
join public.activity_calendar_groups acg on acg.calendar_group_key = ras.calendar_group_key
join public.calendar_editions ce on ce.id = acg.current_edition_id and ce.is_current = true
join public.resort_activity_editions rae on rae.edition_id = ce.id and rae.is_active = true
join public.activity_catalog ac on ac.id = rae.activity_catalog_id
left join public.source_documents sd on sd.id = ce.source_document_id
where (
  ce.valid_from is null or ce.valid_from <= current_date
) and (
  ce.valid_until is null or ce.valid_until >= current_date
);

-- Compatibility projection view over legacy resort_activities table
create or replace view public.v_resort_activities_current as
select
  ra.id,
  ra.calendar_group_key,
  ra.name,
  ra.normalized_name,
  ra.category,
  ra.section,
  ra.location,
  ra.schedule_text,
  ra.description,
  ra.is_fee_based,
  ra.is_daily,
  ra.source_pdf_url
from public.resort_activities ra;

grant select on public.v_resort_activities_today to anon, authenticated;
grant select on public.v_resort_activities_current to anon, authenticated;

-- Post-publish monitoring checks (return rows = failure)
create or replace function public.check_activity_data_health()
returns table (check_name text, detail text)
language sql stable as $$
  select 'missing_current_edition'::text, acg.calendar_group_key
  from public.activity_calendar_groups acg
  where acg.current_edition_id is null
    and acg.calendar_group_key != 'fort-wilderness'

  union all

  select 'ocr_garbage_movie_title', mn.movie_title
  from public.movie_nights mn
  where length(regexp_replace(mn.movie_title, '[^a-zA-Z]', '', 'g'))::float
        / nullif(length(mn.movie_title), 0) < 0.5
    and length(mn.movie_title) > 10

  union all

  select 'needs_review_published', ac.normalized_name
  from public.resort_activity_editions rae
  join public.activity_catalog ac on ac.id = rae.activity_catalog_id
  join public.calendar_editions ce on ce.id = rae.edition_id
  where rae.needs_review = true and rae.is_active = true and ce.is_current = true;
$$;

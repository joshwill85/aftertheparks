-- Magical Resort Guide factual enrichment.
--
-- These fields are third-party factual enrichment. They complement official
-- Disney source-backed records but do not replace official source provenance.

alter table public.activity_booking_metadata
  add column if not exists price_basis text,
  add column if not exists price_options_json jsonb not null default '[]'::jsonb,
  add column if not exists tax_notes text,
  add column if not exists reservation_method text,
  add column if not exists reservation_phone text,
  add column if not exists booking_window_days smallint,
  add column if not exists reservation_recommended boolean,
  add column if not exists walk_ups_allowed boolean,
  add column if not exists same_day_available boolean,
  add column if not exists payment_timing text,
  add column if not exists payment_methods text[] not null default '{}',
  add column if not exists check_in_offset_minutes smallint,
  add column if not exists source_url text,
  add column if not exists evidence jsonb not null default '[]'::jsonb;

alter table public.activity_enrichment
  add column if not exists program_family text,
  add column if not exists activity_variant text,
  add column if not exists exact_venue text,
  add column if not exists host_area_or_wing text,
  add column if not exists hidden_character_name text,
  add column if not exists redemption_location text,
  add column if not exists prize_or_completion_rule text,
  add column if not exists access_notes text,
  add column if not exists resort_guest_only boolean,
  add column if not exists pool_gated boolean,
  add column if not exists open_to_non_resort_guests boolean,
  add column if not exists sister_resort_access boolean,
  add column if not exists operator_type text,
  add column if not exists source_facts jsonb not null default '{}'::jsonb;

alter table public.public_activity_gold
  add column if not exists enrichment jsonb not null default '{}'::jsonb,
  add column if not exists external_facts jsonb not null default '[]'::jsonb;

create table public.external_activity_facts (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.source_documents(id) on delete set null,
  source_provider text not null default 'magical_resort_guide',
  source_url text not null,
  source_page_kind text not null check (
    source_page_kind in (
      'paid_recreation',
      'free_recreation',
      'pools_wellness',
      'activity_center',
      'topical_guide',
      'calendar_validity',
      'seasonal_archive'
    )
  ),
  source_content_sha256 text,
  fetched_at timestamptz,
  calendar_group_key text references public.activity_calendar_groups(calendar_group_key) on delete set null,
  resort_slugs text[] not null default '{}',
  activity_catalog_id uuid references public.activity_catalog(id) on delete set null,
  activity_slug text not null,
  activity_title text not null,
  match_status text not null default 'unmatched' check (
    match_status in ('unmatched', 'matched', 'ambiguous', 'rejected')
  ),
  match_type text,
  match_confidence numeric(4, 3) check (
    match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)
  ),
  facts_json jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '[]'::jsonb,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'reviewed', 'applied', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_provider, source_url, calendar_group_key, activity_slug, source_content_sha256)
);

create index external_activity_facts_catalog_idx
  on public.external_activity_facts (activity_catalog_id);
create index external_activity_facts_group_slug_idx
  on public.external_activity_facts (calendar_group_key, activity_slug);
create index external_activity_facts_review_idx
  on public.external_activity_facts (review_status, match_status);

create table public.activity_price_options (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  source_fact_id uuid references public.external_activity_facts(id) on delete set null,
  source_document_id uuid references public.source_documents(id) on delete set null,
  option_key text not null default 'standard',
  option_name text,
  price_cents_min integer check (price_cents_min is null or price_cents_min >= 0),
  price_cents_max integer check (price_cents_max is null or price_cents_max >= 0),
  price_basis text,
  day_of_week public.day_of_week,
  notes text,
  evidence jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index activity_price_options_catalog_idx
  on public.activity_price_options (activity_catalog_id);
create unique index activity_price_options_fact_option_idx
  on public.activity_price_options (source_fact_id, option_key);

create table public.activity_programs (
  program_key text primary key,
  label text not null,
  category public.activity_category,
  description text,
  created_at timestamptz not null default now()
);

insert into public.activity_programs (program_key, label, category) values
  ('mickey_tie_dye', 'Mickey Tie-Dye', 'arts_crafts'),
  ('tie_dye', 'Tie-Dye', 'arts_crafts'),
  ('mosaic', 'Mosaic Art', 'arts_crafts'),
  ('painting', 'Painting', 'arts_crafts'),
  ('woodcraft', 'Wood Craft', 'arts_crafts'),
  ('hidden_character_hunt', 'Hidden Character Hunt', 'resort_activity'),
  ('movies_under_stars', 'Movies Under the Stars', 'movies_under_stars'),
  ('arcade', 'Arcade', 'arcade'),
  ('caricature', 'Caricature', 'arts_crafts'),
  ('fitness_wellness', 'Fitness and Wellness', 'fitness_wellness'),
  ('campfire', 'Campfire', 'campfire'),
  ('sangria_class', 'Sangria Class', 'signature'),
  ('safari', 'Safari', 'signature'),
  ('craft', 'Craft', 'arts_crafts')
on conflict (program_key) do nothing;

create table public.activity_program_links (
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  program_key text not null references public.activity_programs(program_key) on delete cascade,
  source_fact_id uuid references public.external_activity_facts(id) on delete set null,
  variant_name text,
  primary key (activity_catalog_id, program_key)
);

create table public.activity_access_rules (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  source_fact_id uuid references public.external_activity_facts(id) on delete set null,
  source_document_id uuid references public.source_documents(id) on delete set null,
  resort_guest_only boolean,
  pool_gated boolean,
  open_to_non_resort_guests boolean,
  sister_resort_access boolean,
  adult_required boolean,
  access_notes text,
  evidence jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (activity_catalog_id)
);

create index activity_access_rules_catalog_idx
  on public.activity_access_rules (activity_catalog_id);

drop view if exists public.v_public_activity_gold;
create or replace view public.v_public_activity_gold
with (security_invoker = true) as
select
  id,
  activity_catalog_id,
  calendar_group_key,
  resort_slugs,
  canonical_slug,
  title,
  category,
  schedule,
  location,
  description,
  price,
  enrichment,
  external_facts,
  claims,
  field_provenance,
  source_url,
  source_sha256,
  source_pdf_edition,
  trust_state,
  valid_from,
  valid_until
from public.public_activity_gold
where is_current = true
  and trust_state != 'needs_review';

grant select on public.v_public_activity_gold to anon, authenticated;

alter table public.external_activity_facts enable row level security;
alter table public.activity_price_options enable row level security;
alter table public.activity_programs enable row level security;
alter table public.activity_program_links enable row level security;
alter table public.activity_access_rules enable row level security;

grant select on public.external_activity_facts to anon, authenticated;
grant select on public.activity_price_options to anon, authenticated;
grant select on public.activity_programs to anon, authenticated;
grant select on public.activity_program_links to anon, authenticated;
grant select on public.activity_access_rules to anon, authenticated;

grant all on public.external_activity_facts to service_role;
grant all on public.activity_price_options to service_role;
grant all on public.activity_programs to service_role;
grant all on public.activity_program_links to service_role;
grant all on public.activity_access_rules to service_role;

create policy "Public can read reviewed external activity facts"
  on public.external_activity_facts for select to anon, authenticated using (
    review_status in ('reviewed', 'applied')
  );
create policy "Service role manages external activity facts"
  on public.external_activity_facts for all to service_role using (true) with check (true);

create policy "Public can read activity price options"
  on public.activity_price_options for select to anon, authenticated using (true);
create policy "Service role manages activity price options"
  on public.activity_price_options for all to service_role using (true) with check (true);

create policy "Public can read activity programs"
  on public.activity_programs for select to anon, authenticated using (true);
create policy "Service role manages activity programs"
  on public.activity_programs for all to service_role using (true) with check (true);

create policy "Public can read activity program links"
  on public.activity_program_links for select to anon, authenticated using (true);
create policy "Service role manages activity program links"
  on public.activity_program_links for all to service_role using (true) with check (true);

create policy "Public can read activity access rules"
  on public.activity_access_rules for select to anon, authenticated using (true);
create policy "Service role manages activity access rules"
  on public.activity_access_rules for all to service_role using (true) with check (true);

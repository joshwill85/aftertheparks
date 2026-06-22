-- Official Disney recreation offerings: evergreen, reservation-based, and
-- calendar-dependent activities that should not be coerced into timed events.

create table public.official_activity_programs (
  id uuid primary key default gen_random_uuid(),
  program_key text not null unique,
  title text not null,
  category public.activity_category not null default 'resort_activity',
  description text,
  tags text[] not null default '{}',
  availability jsonb not null default '{}'::jsonb,
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  source_url text not null,
  source_sha256 text not null,
  field_provenance jsonb not null default '{}'::jsonb,
  trust_state text not null default 'source_backed' check (
    trust_state in ('source_backed', 'reviewed', 'confirm_before_going', 'needs_review')
  ),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(field_provenance) = 'object'),
  check (field_provenance ? 'title')
);

create table public.official_activity_offerings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.official_activity_programs(id) on delete cascade,
  offering_key text not null unique,
  resort_slug text not null references public.resorts(slug) on delete restrict,
  variant_key text not null default 'default',
  title text not null,
  description text,
  category public.activity_category not null default 'resort_activity',
  tags text[] not null default '{}',
  location jsonb not null default '{}'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  price jsonb not null default '{"state": "unknown"}'::jsonb,
  booking jsonb not null default '{}'::jsonb,
  eligibility jsonb not null default '{}'::jsonb,
  amenities text[] not null default '{}',
  claims jsonb not null default '{}'::jsonb,
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  source_url text not null,
  source_sha256 text not null,
  field_provenance jsonb not null default '{}'::jsonb,
  trust_state text not null default 'source_backed' check (
    trust_state in ('source_backed', 'reviewed', 'confirm_before_going', 'needs_review')
  ),
  is_current boolean not null default true,
  promoted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(field_provenance) = 'object'),
  check (
    field_provenance ? 'title'
    and field_provenance ? 'resort_join'
  )
);

create unique index official_activity_offerings_current_variant_idx
  on public.official_activity_offerings (program_id, resort_slug, variant_key)
  where is_current = true;
create index official_activity_offerings_resort_idx
  on public.official_activity_offerings (resort_slug, is_current);
create index official_activity_offerings_program_idx
  on public.official_activity_offerings (program_id);

create table public.official_activity_ingest_quarantine (
  id uuid primary key default gen_random_uuid(),
  program_key text not null,
  source_document_id uuid references public.source_documents(id) on delete set null,
  source_url text not null,
  source_sha256 text not null,
  reason_code text not null,
  detail text,
  source_spans jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (
    status in ('pending', 'reviewed', 'resolved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_key, source_sha256, reason_code)
);

-- The API should expose only reviewed/current public rows. Ingest internals remain
-- service-role managed.
revoke all on public.official_activity_programs from anon, authenticated;
revoke all on public.official_activity_offerings from anon, authenticated;
revoke all on public.official_activity_ingest_quarantine from anon, authenticated;

grant select on public.official_activity_programs to anon, authenticated;
grant select on public.official_activity_offerings to anon, authenticated;
grant select on public.resorts to anon, authenticated;
grant all on public.official_activity_programs to service_role;
grant all on public.official_activity_offerings to service_role;
grant all on public.official_activity_ingest_quarantine to service_role;

alter table public.official_activity_programs enable row level security;
alter table public.official_activity_offerings enable row level security;
alter table public.official_activity_ingest_quarantine enable row level security;

create policy "Public can read current official activity programs"
  on public.official_activity_programs for select to anon, authenticated using (
    is_current = true and trust_state != 'needs_review'
  );
create policy "Service role manages official activity programs"
  on public.official_activity_programs for all to service_role using (true) with check (true);

create policy "Public can read current official activity offerings"
  on public.official_activity_offerings for select to anon, authenticated using (
    is_current = true and trust_state != 'needs_review'
  );
create policy "Service role manages official activity offerings"
  on public.official_activity_offerings for all to service_role using (true) with check (true);

create policy "Service role manages official activity quarantine"
  on public.official_activity_ingest_quarantine for all to service_role using (true) with check (true);

create or replace view public.v_public_activity_offerings
with (security_invoker = true) as
select
  o.id,
  o.program_id,
  p.program_key,
  o.offering_key,
  o.resort_slug,
  r.name as resort_name,
  r.category as resort_category,
  r.resort_area,
  o.variant_key,
  o.title,
  coalesce(o.description, p.description) as description,
  o.category,
  array(
    select distinct tag
    from unnest(coalesce(p.tags, '{}'::text[]) || coalesce(o.tags, '{}'::text[])) as tag
    where tag <> ''
  ) as tags,
  o.location,
  o.availability,
  o.price,
  o.booking,
  o.eligibility,
  o.amenities,
  o.claims,
  o.field_provenance,
  o.source_document_id,
  o.source_url,
  o.source_sha256,
  o.trust_state
from public.official_activity_offerings o
join public.official_activity_programs p on p.id = o.program_id
join public.resorts r on r.slug = o.resort_slug
where o.is_current = true
  and p.is_current = true
  and o.trust_state != 'needs_review'
  and p.trust_state != 'needs_review';

grant select on public.v_public_activity_offerings to anon, authenticated;

create or replace function public.check_official_activity_offerings_health()
returns table (check_name text, detail text)
language sql stable as $$
  select 'official_program_missing_title_provenance'::text, program_key
  from public.official_activity_programs
  where is_current = true
    and not (field_provenance ? 'title')

  union all

  select 'official_offering_missing_required_provenance', offering_key
  from public.official_activity_offerings
  where is_current = true
    and not (
      field_provenance ? 'title'
      and field_provenance ? 'resort_join'
    )

  union all

  select 'official_offering_missing_source_document', offering_key
  from public.official_activity_offerings
  where is_current = true
    and (source_document_id is null or source_sha256 = '' or source_url = '')

  union all

  select 'official_offering_program_not_current', o.offering_key
  from public.official_activity_offerings o
  join public.official_activity_programs p on p.id = o.program_id
  where o.is_current = true
    and p.is_current = false;
$$;

grant execute on function public.check_official_activity_offerings_health() to service_role;

-- Activity pipeline v2: source evidence, Silver candidates, review queue, claims, and Gold public data.
-- Public UI should ultimately read only public_activity_gold plus activity_slug_redirects.

create table public.activity_layout_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.source_documents(id) on delete cascade,
  content_sha256 text not null,
  parser_version text not null,
  snapshot_json jsonb not null,
  page_count integer not null check (page_count > 0),
  created_at timestamptz not null default now(),
  unique (content_sha256, parser_version)
);

create index activity_layout_snapshots_source_idx
  on public.activity_layout_snapshots (source_document_id);

create table public.activity_extraction_candidates (
  candidate_id text primary key,
  layout_snapshot_id uuid references public.activity_layout_snapshots(id) on delete set null,
  source_document_id uuid references public.source_documents(id) on delete cascade,
  ingest_run_id uuid references public.ingest_runs(id) on delete set null,
  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  content_sha256 text not null,
  activity_slug text not null,
  parser_version text not null,
  profile_key text not null,
  raw_fields jsonb not null,
  normalized_fields jsonb not null,
  source_spans jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null default 0 check (confidence >= 0 and confidence <= 1),
  warnings jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  status text not null default 'candidate' check (
    status in ('candidate', 'validated', 'needs_review', 'promoted', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_sha256, calendar_group_key, activity_slug, parser_version)
);

create index activity_extraction_candidates_status_idx
  on public.activity_extraction_candidates (status);
create index activity_extraction_candidates_group_slug_idx
  on public.activity_extraction_candidates (calendar_group_key, activity_slug);

create table public.activity_field_provenance (
  id uuid primary key default gen_random_uuid(),
  candidate_id text not null references public.activity_extraction_candidates(candidate_id) on delete cascade,
  field_name text not null,
  field_value text,
  source_type text not null default 'pdf_layout',
  source_spans jsonb not null default '[]'::jsonb,
  transformation text,
  confidence numeric(4, 3) not null default 1 check (confidence >= 0 and confidence <= 1),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (candidate_id, field_name)
);

create table public.activity_review_queue (
  id uuid primary key default gen_random_uuid(),
  candidate_id text references public.activity_extraction_candidates(candidate_id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  calendar_group_key text references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  reason_code text not null,
  detail text,
  severity text not null default 'error' check (severity in ('warning', 'error', 'blocker')),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'applied')
  ),
  reviewer text,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

create index activity_review_queue_status_idx
  on public.activity_review_queue (status, severity, created_at);

create table public.activity_claims (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid references public.activity_catalog(id) on delete cascade,
  candidate_id text references public.activity_extraction_candidates(candidate_id) on delete set null,
  claim_kind text not null,
  claim_value text not null default 'unknown',
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric(4, 3) not null default 0 check (confidence >= 0 and confidence <= 1),
  status text not null default 'needs_review' check (status in ('active', 'needs_review', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    claim_value in ('unknown', 'not_applicable')
    or jsonb_array_length(evidence) > 0
  )
);

create index activity_claims_catalog_idx
  on public.activity_claims (activity_catalog_id, claim_kind);
create index activity_claims_candidate_idx
  on public.activity_claims (candidate_id);

create table public.public_activity_gold (
  id uuid primary key default gen_random_uuid(),
  activity_catalog_id uuid not null references public.activity_catalog(id) on delete cascade,
  calendar_group_key text not null references public.activity_calendar_groups(calendar_group_key) on delete cascade,
  resort_slugs text[] not null default '{}',
  canonical_slug text not null,
  title text not null,
  category public.activity_category not null,
  schedule jsonb not null,
  location jsonb not null,
  description text,
  price jsonb not null default '{"state": "unknown"}'::jsonb,
  claims jsonb not null default '{}'::jsonb,
  field_provenance jsonb not null,
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  source_url text not null,
  source_sha256 text not null,
  source_pdf_edition text,
  trust_state text not null default 'source_backed' check (
    trust_state in ('source_backed', 'reviewed', 'confirm_before_going', 'needs_review')
  ),
  valid_from date,
  valid_until date,
  is_current boolean not null default true,
  promoted_from_candidate_id text references public.activity_extraction_candidates(candidate_id) on delete set null,
  promoted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(field_provenance) = 'object'),
  check (
    field_provenance ? 'title'
    and field_provenance ? 'schedule'
    and field_provenance ? 'location'
  )
);

create unique index public_activity_gold_current_slug_idx
  on public.public_activity_gold (calendar_group_key, canonical_slug)
  where is_current = true;
create index public_activity_gold_catalog_idx
  on public.public_activity_gold (activity_catalog_id);

create table public.activity_slug_redirects (
  legacy_slug text primary key,
  canonical_slug text not null,
  reason text,
  created_at timestamptz not null default now(),
  check (legacy_slug <> canonical_slug)
);

insert into public.activity_slug_redirects (legacy_slug, canonical_slug, reason)
values
  ('wellnessscav-engerhunt', 'wellness-scavenger-hunt', 'OCR title split in early public URL'),
  ('w-e-l-l-n-e-s-s-s-c-av-e-n-g-e-r-h-u-nt', 'wellness-scavenger-hunt', 'OCR letter-spaced bootstrap slug')
on conflict (legacy_slug) do update set
  canonical_slug = excluded.canonical_slug,
  reason = excluded.reason;

-- Lock down v2 internal tables. Supabase public-schema tables can be exposed by grants,
-- so revoke anon/authenticated access explicitly and grant only service-role writes.
revoke all on public.activity_layout_snapshots from anon, authenticated;
revoke all on public.activity_extraction_candidates from anon, authenticated;
revoke all on public.activity_field_provenance from anon, authenticated;
revoke all on public.activity_review_queue from anon, authenticated;
revoke all on public.activity_claims from anon, authenticated;

grant all on public.activity_layout_snapshots to service_role;
grant all on public.activity_extraction_candidates to service_role;
grant all on public.activity_field_provenance to service_role;
grant all on public.activity_review_queue to service_role;
grant all on public.activity_claims to service_role;

grant select on public.public_activity_gold to anon, authenticated;
grant all on public.public_activity_gold to service_role;
grant select on public.activity_slug_redirects to anon, authenticated;
grant all on public.activity_slug_redirects to service_role;

alter table public.activity_layout_snapshots enable row level security;
alter table public.activity_extraction_candidates enable row level security;
alter table public.activity_field_provenance enable row level security;
alter table public.activity_review_queue enable row level security;
alter table public.activity_claims enable row level security;
alter table public.public_activity_gold enable row level security;
alter table public.activity_slug_redirects enable row level security;

create policy "Service role manages layout snapshots"
  on public.activity_layout_snapshots for all to service_role using (true) with check (true);
create policy "Service role manages extraction candidates"
  on public.activity_extraction_candidates for all to service_role using (true) with check (true);
create policy "Service role manages field provenance"
  on public.activity_field_provenance for all to service_role using (true) with check (true);
create policy "Service role manages review queue"
  on public.activity_review_queue for all to service_role using (true) with check (true);
create policy "Service role manages claims"
  on public.activity_claims for all to service_role using (true) with check (true);

create policy "Public can read current Gold activities"
  on public.public_activity_gold for select to anon, authenticated using (
    is_current = true and trust_state != 'needs_review'
  );
create policy "Service role manages Gold activities"
  on public.public_activity_gold for all to service_role using (true) with check (true);

create policy "Public can read slug redirects"
  on public.activity_slug_redirects for select to anon, authenticated using (true);
create policy "Service role manages slug redirects"
  on public.activity_slug_redirects for all to service_role using (true) with check (true);

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

create or replace function public.check_activity_pipeline_v2_health()
returns table (check_name text, detail text)
language sql stable as $$
  select 'gold_missing_required_provenance'::text, canonical_slug
  from public.public_activity_gold
  where is_current = true
    and not (
      field_provenance ? 'title'
      and field_provenance ? 'schedule'
      and field_provenance ? 'location'
    )

  union all

  select 'gold_missing_source_document', canonical_slug
  from public.public_activity_gold
  where is_current = true
    and (source_document_id is null or source_sha256 = '' or source_url = '')

  union all

  select 'active_claim_without_evidence', coalesce(ac.normalized_name, candidate_id, claim_kind)
  from public.activity_claims cl
  left join public.activity_catalog ac on ac.id = cl.activity_catalog_id
  where cl.status = 'active'
    and cl.claim_value not in ('unknown', 'not_applicable')
    and jsonb_array_length(cl.evidence) = 0

  union all

  select 'pending_blocker_review', coalesce(candidate_id, reason_code)
  from public.activity_review_queue
  where status = 'pending'
    and severity = 'blocker';
$$;

grant execute on function public.check_activity_pipeline_v2_health() to service_role;

create or replace function public.check_activity_data_health()
returns table (check_name text, detail text)
language sql stable as $$
  select 'missing_current_edition'::text, acg.calendar_group_key
  from public.activity_calendar_groups acg
  where acg.current_edition_id is null
    and acg.calendar_group_key != 'fort-wilderness'

  union all

  select 'ocr_garbage_movie_title', movie_title
  from (
    select mn.movie_title
    from public.movie_nights mn
    where mn.movie_title is not null
  ) movies
  where length(regexp_replace(regexp_replace(movie_title, '\(\d{4}\)', '', 'g'), '[^a-zA-Z0-9 ''’":,&.!?-]', '', 'g'))::float
        / nullif(length(regexp_replace(movie_title, '\(\d{4}\)', '', 'g')), 0) < 0.9

  union all

  select 'needs_review_published', ac.normalized_name
  from public.resort_activity_editions rae
  join public.activity_catalog ac on ac.id = rae.activity_catalog_id
  join public.calendar_editions ce on ce.id = rae.edition_id
  where rae.needs_review = true and rae.is_active = true and ce.is_current = true

  union all

  select check_name, detail
  from public.check_activity_pipeline_v2_health();
$$;

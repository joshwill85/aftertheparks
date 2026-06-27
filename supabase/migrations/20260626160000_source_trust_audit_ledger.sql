-- Source trust audit ledger: source graph, currentness checks, and field audit observations.
-- These tables are service-role managed and support reproducible source-to-UI audits.

create table if not exists public.source_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_source_document_id uuid references public.source_documents(id) on delete cascade,
  child_source_document_id uuid not null references public.source_documents(id) on delete cascade,
  relationship_type text not null check (
    relationship_type in (
      'index_links_parent_detail',
      'index_lists_resort_join',
      'resort_page_links_pdf',
      'resort_page_links_detail',
      'detail_page_links_menu',
      'secondary_enriches_disney_row'
    )
  ),
  relationship_evidence jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  unique (parent_source_document_id, child_source_document_id, relationship_type)
);

create table if not exists public.source_currentness_checks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.source_documents(id) on delete cascade,
  canonical_url text not null,
  fetched_url text,
  live_content_sha256 text,
  stored_content_sha256 text,
  http_status smallint,
  currentness text not null check (
    currentness in (
      'current',
      'url_changed',
      'hash_changed',
      'missing_from_parent',
      'unreachable',
      'unchecked'
    )
  ),
  checked_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

create table if not exists public.field_audit_observations (
  id uuid primary key default gen_random_uuid(),
  published_row_id uuid,
  source_document_id uuid references public.source_documents(id) on delete set null,
  row_kind text not null check (row_kind in ('gold_activity', 'official_offering')),
  row_key text not null,
  field_name text not null,
  observed_value text,
  method text not null check (
    method in (
      'deterministic_parser',
      'gpt_visual_audit',
      'manual_visual_review',
      'db_publication_audit',
      'ui_api_audit'
    )
  ),
  confidence text not null check (confidence in ('high', 'medium', 'low', 'unknown')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists source_relationships_parent_idx
  on public.source_relationships (parent_source_document_id);
create index if not exists source_relationships_child_idx
  on public.source_relationships (child_source_document_id);
create index if not exists source_currentness_checks_document_idx
  on public.source_currentness_checks (source_document_id, checked_at desc);
create index if not exists field_audit_observations_row_idx
  on public.field_audit_observations (row_kind, row_key, field_name);

alter table public.source_relationships enable row level security;
alter table public.source_currentness_checks enable row level security;
alter table public.field_audit_observations enable row level security;

revoke all on public.source_relationships from anon, authenticated;
revoke all on public.source_currentness_checks from anon, authenticated;
revoke all on public.field_audit_observations from anon, authenticated;

grant all on public.source_relationships to service_role;
grant all on public.source_currentness_checks to service_role;
grant all on public.field_audit_observations to service_role;

create policy "Service role manages source relationships"
  on public.source_relationships for all to service_role using (true) with check (true);
create policy "Service role manages source currentness checks"
  on public.source_currentness_checks for all to service_role using (true) with check (true);
create policy "Service role manages field audit observations"
  on public.field_audit_observations for all to service_role using (true) with check (true);

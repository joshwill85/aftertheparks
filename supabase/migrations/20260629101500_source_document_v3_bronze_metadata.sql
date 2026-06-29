-- Source Document Vision Pipeline v3 bronze metadata.
-- These columns let source_documents preserve the exact official source bytes
-- plus enough type/dimension metadata for PDF and image-like Disney sources.

alter table public.source_documents
  add column if not exists mime_type text,
  add column if not exists http_content_type text,
  add column if not exists detected_content_type text,
  add column if not exists file_extension text,
  add column if not exists raw_page_count integer,
  add column if not exists raw_width integer,
  add column if not exists raw_height integer;

comment on column public.source_documents.mime_type is
  'Normalized MIME type detected for the immutable bronze source bytes.';
comment on column public.source_documents.http_content_type is
  'HTTP Content-Type header normalized without parameters.';
comment on column public.source_documents.detected_content_type is
  'Content type detected from the downloaded source bytes.';
comment on column public.source_documents.file_extension is
  'Canonical file extension used for source byte storage.';
comment on column public.source_documents.raw_page_count is
  'Raw page count for PDFs or 1 for image sources.';
comment on column public.source_documents.raw_width is
  'Raw source image width in pixels when source_type is image.';
comment on column public.source_documents.raw_height is
  'Raw source image height in pixels when source_type is image.';

create table if not exists public.source_document_pages (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  content_sha256 text not null,
  page_number integer not null,
  page_kind text not null,
  canonical_image_storage_path text not null,
  canonical_image_sha256 text not null,
  width_px integer not null,
  height_px integer not null,
  render_engine text,
  render_engine_version text,
  render_dpi integer,
  render_scale numeric,
  image_orientation integer,
  image_quality jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_document_id, page_number, canonical_image_sha256)
);

create index if not exists source_document_pages_source_idx
  on public.source_document_pages (source_document_id, page_number);
create index if not exists source_document_pages_image_hash_idx
  on public.source_document_pages (canonical_image_sha256);

alter table public.source_document_pages enable row level security;

create policy "Source document pages are publicly readable"
  on public.source_document_pages
  for select
  to anon, authenticated
  using (true);

create policy "Service role can manage source document pages"
  on public.source_document_pages
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.source_document_pages is
  'Canonical rendered page images for v3 source-document vision evidence.';
comment on column public.source_document_pages.canonical_image_sha256 is
  'Hash of the canonical page image used for source spans, crops, reviews, and overlays.';
comment on column public.source_document_pages.image_quality is
  'Page-image sidecar quality and derivative metadata such as thumbnail path/hash.';

create or replace function public.check_activity_pipeline_v3_health()
returns table (check_name text, detail text)
language sql stable as $$
  with v3_gold as (
    select
      gold.id,
      gold.canonical_slug,
      gold.calendar_group_key,
      gold.source_document_id,
      gold.promoted_from_candidate_id,
      gold.field_provenance,
      gold.source,
      candidate.candidate_id,
      candidate.parser_version
    from public.public_activity_gold gold
    left join public.activity_extraction_candidates candidate
      on candidate.candidate_id = gold.promoted_from_candidate_id
    where gold.is_current = true
      and (
        coalesce(gold.source->>'pipelineVersion', '') like 'vision_v3%'
        or coalesce(gold.source->'runtimeLineage'->>'pipeline_version', '') like 'vision_v3%'
        or coalesce(candidate.parser_version, '') like 'vision_v3%'
      )
  )

  select 'gold_v3_missing_required_provenance'::text,
    calendar_group_key || ':' || canonical_slug
  from v3_gold
  where not (
    field_provenance ? 'title'
    and field_provenance ? 'schedule'
    and field_provenance ? 'location'
    and field_provenance ? 'fee'
  )

  union all

  select 'gold_v3_missing_structured_source',
    calendar_group_key || ':' || canonical_slug
  from v3_gold
  where jsonb_typeof(source) != 'object'
    or source->>'documentHash' is null
    or source->>'url' is null
    or jsonb_typeof(source->'fieldEvidence') != 'object'
    or jsonb_typeof(source->'sourcePages') != 'array'
    or jsonb_typeof(source->'canonicalPageImageSha256s') != 'array'

  union all

  select 'gold_v3_missing_promoted_candidate',
    calendar_group_key || ':' || canonical_slug
  from v3_gold
  where promoted_from_candidate_id is null
    or candidate_id is null
    or coalesce(parser_version, '') not like 'vision_v3%'

  union all

  select 'gold_v3_missing_field_provenance',
    v3_gold.calendar_group_key || ':' || v3_gold.canonical_slug
  from v3_gold
  where exists (
    select 1
    from unnest(array['title', 'schedule', 'location', 'fee']) as required(field_name)
    left join public.activity_field_provenance provenance
      on provenance.candidate_id = v3_gold.promoted_from_candidate_id
     and provenance.field_name = required.field_name
    where provenance.candidate_id is null
  )

  union all

  select 'gold_v3_missing_source_document_page',
    v3_gold.calendar_group_key || ':' || v3_gold.canonical_slug || ':' || page_hashes.page_hash
  from v3_gold
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(v3_gold.source->'canonicalPageImageSha256s') = 'array'
        then v3_gold.source->'canonicalPageImageSha256s'
      else '[]'::jsonb
    end
  ) as page_hashes(page_hash)
  where not exists (
    select 1
    from public.source_document_pages page_row
    where page_row.source_document_id = v3_gold.source_document_id
      and page_row.content_sha256 = v3_gold.source->>'documentHash'
      and page_row.canonical_image_sha256 = page_hashes.page_hash
  )

  union all

  select 'gold_v3_missing_layout_snapshot',
    calendar_group_key || ':' || canonical_slug
  from v3_gold
  where not exists (
    select 1
    from public.activity_layout_snapshots layout_snapshot
    where layout_snapshot.source_document_id = v3_gold.source_document_id
      and layout_snapshot.content_sha256 = v3_gold.source->>'documentHash'
      and layout_snapshot.parser_version like 'vision_v3%'
      and layout_snapshot.snapshot_json->>'snapshot_kind' = 'vision_layout_v3'
      and (
        v3_gold.source->>'configHash' is null
        or layout_snapshot.snapshot_json->>'config_hash' = v3_gold.source->>'configHash'
      )
  )

  union all

  select 'gold_v3_missing_currentness_check',
    calendar_group_key || ':' || canonical_slug
  from v3_gold
  where not exists (
    select 1
    from public.source_currentness_checks check_row
    where check_row.source_document_id = v3_gold.source_document_id
      and check_row.currentness = 'current'
  );
$$;

grant execute on function public.check_activity_pipeline_v3_health() to service_role;

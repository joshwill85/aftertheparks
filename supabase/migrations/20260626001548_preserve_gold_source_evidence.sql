-- Preserve structured source evidence, including PDF footer/key legends, on
-- published Gold rows. The flat source_url/source_sha256 columns remain for
-- indexing and simple health checks; this JSON payload carries document-level
-- evidence that does not fit a single public field.

alter table public.public_activity_gold
  add column if not exists source jsonb not null default '{}'::jsonb;

update public.public_activity_gold
set source = jsonb_strip_nulls(
  jsonb_build_object(
    'url', source_url,
    'documentHash', source_sha256,
    'documentId', source_document_id,
    'edition', source_pdf_edition,
    'documentKeyLegends', '[]'::jsonb
  )
)
where source = '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'public_activity_gold_source_object'
      and conrelid = 'public.public_activity_gold'::regclass
  ) then
    alter table public.public_activity_gold
      add constraint public_activity_gold_source_object
      check (jsonb_typeof(source) = 'object');
  end if;
end $$;

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
  source,
  source_document_id,
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

  select 'gold_missing_structured_source', canonical_slug
  from public.public_activity_gold
  where is_current = true
    and (
      jsonb_typeof(source) != 'object'
      or source->>'url' is null
      or source->>'documentHash' is null
      or source->>'documentHash' != source_sha256
    )

  union all

  select 'gold_malformed_key_legend', canonical_slug
  from public.public_activity_gold
  where is_current = true
    and source ? 'documentKeyLegends'
    and jsonb_typeof(source->'documentKeyLegends') != 'array'

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

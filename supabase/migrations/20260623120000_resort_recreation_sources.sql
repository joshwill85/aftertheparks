-- One official Disney recreation source row per active resort.
-- Shared activity calendars are derived from these rows; discovery must not scrape only
-- the first resort in a shared activity group.

create table public.resort_recreation_sources (
  id uuid primary key default gen_random_uuid(),
  resort_id uuid not null references public.resorts(id) on delete cascade,
  resort_slug text not null,
  disney_recreation_slug text not null,
  recreation_page_url text not null,
  source_kind text not null check (source_kind in ('pdf', 'official_web')),
  discovered_pdf_url text,
  source_document_id uuid references public.source_documents(id) on delete set null,
  last_discovered_at timestamptz,
  status text not null default 'pending' check (
    status in ('pending', 'unchanged', 'url_changed', 'html_only', 'unreachable', 'missing', 'error')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resort_recreation_sources_resort_key unique (resort_id),
  constraint resort_recreation_sources_slug_key unique (resort_slug)
);

comment on table public.resort_recreation_sources is
  'Official Disney recreation page/PDF source mapping at resort granularity. Activity calendar groups aggregate after source discovery.';

create index resort_recreation_sources_kind_idx
  on public.resort_recreation_sources (source_kind, status);
create index resort_recreation_sources_document_idx
  on public.resort_recreation_sources (source_document_id);

alter table public.resort_recreation_sources enable row level security;

revoke all on public.resort_recreation_sources from anon, authenticated;
grant all on public.resort_recreation_sources to service_role;

with source_rows (
  resort_slug,
  disney_recreation_slug,
  recreation_page_url,
  source_kind,
  discovered_pdf_url,
  notes
) as (
  values
    ('all-star-movies-resort', 'all-star-movies-resort', 'https://disneyworld.disney.go.com/resorts/all-star-movies-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/recreation/guide/All-Star-Movies_Aframe_Recreation_1125.pdf', null),
    ('all-star-music-resort', 'all-star-music-resort', 'https://disneyworld.disney.go.com/resorts/all-star-music-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q1/All-Star-Music_Aframe_Recreation_0126-V3_DRAFT.pdf', null),
    ('all-star-sports-resort', 'all-star-sports-resort', 'https://disneyworld.disney.go.com/resorts/all-star-sports-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q1/All-Star-Sports_Aframe_Recreation_0126_V3_DRAFT.pdf', null),
    ('art-of-animation-resort', 'art-of-animation-resort', 'https://disneyworld.disney.go.com/resorts/art-of-animation-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/resorts/art-of-animation/experience/DAAR_Aframe_Recreation-0525_DIGITAL.pdf', null),
    ('pop-century-resort', 'pop-century-resort', 'https://disneyworld.disney.go.com/resorts/pop-century-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/POP_Aframe_Recreation-0326.pdf', null),
    ('caribbean-beach-resort', 'caribbean-beach-resort', 'https://disneyworld.disney.go.com/resorts/caribbean-beach-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/CBR_Aframe_Recreation-0326.pdf', null),
    ('coronado-springs-resort', 'coronado-springs-resort', 'https://disneyworld.disney.go.com/resorts/coronado-springs-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/CSR_Aframe_Recreation-0326.pdf', null),
    ('port-orleans-resort-french-quarter', 'port-orleans-resort-french-quarter', 'https://disneyworld.disney.go.com/resorts/port-orleans-resort-french-quarter/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/POFQ_Aframe_Recreation-0326.pdf', 'Guests may participate in activities at Riverside and French Quarter.'),
    ('port-orleans-resort-riverside', 'port-orleans-resort-riverside', 'https://disneyworld.disney.go.com/resorts/port-orleans-resort-riverside/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/PORS_Aframe_Recreation-0326.pdf', 'Guests may participate in activities at Riverside and French Quarter.'),
    ('animal-kingdom-lodge', 'animal-kingdom-lodge', 'https://disneyworld.disney.go.com/resorts/animal-kingdom-lodge/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q1/DAKL_Aframe_Recreation_0126_Jambo.pdf', 'Jambo House calendar; Kidani Village has a separate calendar.'),
    ('animal-kingdom-villas-jambo-house', 'animal-kingdom-villas-jambo-house', 'https://disneyworld.disney.go.com/resorts/animal-kingdom-villas-jambo-house/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q1/DAKL_Aframe_Recreation_0126_Jambo.pdf', 'Jambo House calendar; Kidani Village has a separate calendar.'),
    ('animal-kingdom-villas-kidani-village', 'animal-kingdom-villas-kidani-village', 'https://disneyworld.disney.go.com/resorts/animal-kingdom-villas-kidani-village/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q1/DAKL_Aframe_Recreation_0126_Kidani.pdf', 'Kidani Village calendar; Jambo House has a separate calendar.'),
    ('beach-club-resort', 'beach-club-resort', 'https://disneyworld.disney.go.com/resorts/beach-club-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/recreation/guide/YB_Aframe_Recreation-1125.pdf', 'Shared calendar for Disney''s Beach Club and Yacht Club Resorts.'),
    ('yacht-club-resort', 'yacht-club-resort', 'https://disneyworld.disney.go.com/resorts/yacht-club-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/recreation/guide/YB_Aframe_Recreation-1125.pdf', 'Shared calendar for Disney''s Beach Club and Yacht Club Resorts.'),
    ('beach-club-villas', 'beach-club-villas', 'https://disneyworld.disney.go.com/resorts/beach-club-villas/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/recreation/guide/YB_Aframe_Recreation-1125.pdf', 'Shared calendar for Disney''s Beach Club and Yacht Club Resorts.'),
    ('boardwalk-inn', 'boardwalk-inn', 'https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/BW_Aframe_Recreation-0326.pdf', 'Shared calendar for Disney''s BoardWalk Inn and BoardWalk Villas.'),
    ('boardwalk-villas', 'boardwalk-villas', 'https://disneyworld.disney.go.com/resorts/boardwalk-villas/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/BW_Aframe_Recreation-0326.pdf', 'Shared calendar for Disney''s BoardWalk Inn and BoardWalk Villas.'),
    ('contemporary-resort', 'contemporary-resort', 'https://disneyworld.disney.go.com/resorts/contemporary-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/CTR_Aframe_Recreation-0326.pdf', 'Shared calendar for Contemporary Resort and Bay Lake Tower.'),
    ('bay-lake-tower-at-contemporary-resort', 'bay-lake-tower-at-contemporary-resort', 'https://disneyworld.disney.go.com/resorts/bay-lake-tower-at-contemporary-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/CTR_Aframe_Recreation-0326.pdf', 'Shared calendar for Contemporary Resort and Bay Lake Tower.'),
    ('grand-floridian-resort-and-spa', 'grand-floridian-resort-and-spa', 'https://disneyworld.disney.go.com/resorts/grand-floridian-resort-and-spa/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/recreation/guide/GF_Aframe_Recreation-1125.pdf', 'Shared calendar for Grand Floridian Resort & Spa and Villas.'),
    ('villas-at-grand-floridian-resort-and-spa', 'villas-at-grand-floridian-resort-and-spa', 'https://disneyworld.disney.go.com/resorts/villas-at-grand-floridian-resort-and-spa/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-platform/parks-global-assets/disney-world/recreation/guide/GF_Aframe_Recreation-1125.pdf', 'Shared calendar for Grand Floridian Resort & Spa and Villas.'),
    ('polynesian-village-resort', 'polynesian-village-resort', 'https://disneyworld.disney.go.com/resorts/polynesian-village-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/Polynesian_Aframe_Recreation-0326.pdf', 'Shared calendar for Polynesian Village Resort and Polynesian Villas & Bungalows.'),
    ('polynesian-villas-and-bungalows', 'polynesian-villas-and-bungalows', 'https://disneyworld.disney.go.com/resorts/polynesian-villas-and-bungalows/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/Polynesian_Aframe_Recreation-0326.pdf', 'Shared calendar for Polynesian Village Resort and Polynesian Villas & Bungalows.'),
    ('wilderness-lodge', 'wilderness-lodge', 'https://disneyworld.disney.go.com/resorts/wilderness-lodge/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/WL_Aframe_Recreation-0326.pdf', 'Shared calendar for Wilderness Lodge and DVC villa wings.'),
    ('boulder-ridge-villas-at-wilderness-lodge', 'boulder-ridge-villas-at-wilderness-lodge', 'https://disneyworld.disney.go.com/resorts/boulder-ridge-villas-at-wilderness-lodge/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/WL_Aframe_Recreation-0326.pdf', 'Shared calendar for Wilderness Lodge and DVC villa wings.'),
    ('copper-creek-villas-and-cabins-at-wilderness-lodge', 'copper-creek-villas-and-cabins-at-wilderness-lodge', 'https://disneyworld.disney.go.com/resorts/copper-creek-villas-and-cabins-at-wilderness-lodge/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/WL_Aframe_Recreation-0326.pdf', 'Shared calendar for Wilderness Lodge and DVC villa wings.'),
    ('old-key-west-resort', 'old-key-west-resort', 'https://disneyworld.disney.go.com/resorts/old-key-west-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/OKWR_Aframe_Recreation-0326.pdf', null),
    ('riviera-resort', 'riviera-resort', 'https://disneyworld.disney.go.com/resorts/riviera-resort/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/DRR_Aframe_Recreation-0326.pdf', null),
    ('saratoga-springs-resort-and-spa', 'saratoga-springs-resort-and-spa', 'https://disneyworld.disney.go.com/resorts/saratoga-springs-resort-and-spa/recreation/', 'pdf', 'https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/SSR_Aframe_Recreation-0326.pdf', null),
    ('campsites-at-fort-wilderness-resort', 'campsites-at-fort-wilderness-resort', 'https://disneyworld.disney.go.com/resorts/campsites-at-fort-wilderness-resort/recreation/', 'official_web', null, 'No A-frame recreation PDF found; activities sourced from official recreation page.'),
    ('cabins-at-fort-wilderness-resort', 'dvc-cabins-at-fort-wilderness-resort', 'https://disneyworld.disney.go.com/resorts/dvc-cabins-at-fort-wilderness-resort/recreation/', 'official_web', null, 'No A-frame recreation PDF found; activities sourced from official recreation page.')
)
insert into public.resort_recreation_sources (
  resort_id,
  resort_slug,
  disney_recreation_slug,
  recreation_page_url,
  source_kind,
  discovered_pdf_url,
  status,
  notes
)
select
  r.id,
  s.resort_slug,
  s.disney_recreation_slug,
  s.recreation_page_url,
  s.source_kind,
  s.discovered_pdf_url,
  case when s.source_kind = 'official_web' then 'html_only' else 'unchanged' end,
  s.notes
from source_rows s
join public.resorts r on r.slug = s.resort_slug
on conflict (resort_slug) do update set
  resort_id = excluded.resort_id,
  disney_recreation_slug = excluded.disney_recreation_slug,
  recreation_page_url = excluded.recreation_page_url,
  source_kind = excluded.source_kind,
  discovered_pdf_url = excluded.discovered_pdf_url,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = now();

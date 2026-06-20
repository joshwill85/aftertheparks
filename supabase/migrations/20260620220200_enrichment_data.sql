-- Phase 2 enrichment: booking metadata and resort pools

insert into public.activity_booking_metadata (
  activity_catalog_id, price_cents_min, price_cents_max, age_minimum, reservation_required, booking_url
)
select ac.id, 1700, 2000, 3, true, 'https://disneyworld.disney.go.com/events-tours/mickey-tie-dye/'
from public.activity_catalog ac
where ac.normalized_name in ('mickey-tie-dye', 'mickey-tie-dye-experience')
on conflict (activity_catalog_id) do update set
  price_cents_min = excluded.price_cents_min,
  price_cents_max = excluded.price_cents_max,
  booking_url = excluded.booking_url;

insert into public.resort_pools (resort_id, slug, name, is_feature_pool, disney_url)
select r.id, 'hippy-dippy-pool', 'Hippy Dippy Pool', true,
  'https://disneyworld.disney.go.com/recreation/pop-century-resort/pools/'
from public.resorts r where r.slug = 'pop-century-resort'
on conflict (resort_id, slug) do nothing;

insert into public.resort_pools (resort_id, slug, name, is_feature_pool, disney_url)
select r.id, 'fuentes-del-morro', 'Fuentes del Morro Feature Pool', true,
  'https://disneyworld.disney.go.com/recreation/caribbean-beach-resort/pools/'
from public.resorts r where r.slug = 'caribbean-beach-resort'
on conflict (resort_id, slug) do nothing;

insert into public.resort_pools (resort_id, slug, name, is_feature_pool, disney_url)
select r.id, 'contemporary-feature-pool', 'Feature Pool', true,
  'https://disneyworld.disney.go.com/recreation/contemporary-resort/pools/'
from public.resorts r where r.slug = 'contemporary-resort'
on conflict (resort_id, slug) do nothing;

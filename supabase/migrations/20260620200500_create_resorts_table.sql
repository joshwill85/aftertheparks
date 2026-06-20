-- Official Walt Disney World Resort hotels (Disney-owned and operated)
-- Source: https://disneyworld.disney.go.com/resorts/ (31 properties as of June 2026)

create type public.resort_category as enum (
  'value',
  'moderate',
  'deluxe',
  'deluxe_villa',
  'campground'
);

create type public.resort_area as enum (
  'magic_kingdom',
  'epcot',
  'animal_kingdom',
  'disney_springs',
  'wide_world_of_sports'
);

create table public.resorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  category public.resort_category not null,
  resort_area public.resort_area not null,
  disney_url text not null,
  is_dvc boolean not null default false,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resorts_name_key unique (name),
  constraint resorts_slug_key unique (slug),
  constraint resorts_sort_order_key unique (sort_order)
);

comment on table public.resorts is
  'Official Disney-owned and operated Walt Disney World resort hotels. Excludes Swan/Dolphin and Disney Springs Area third-party hotels.';

create index resorts_category_idx on public.resorts (category);
create index resorts_resort_area_idx on public.resorts (resort_area);

alter table public.resorts enable row level security;

create policy "Resorts are publicly readable"
  on public.resorts
  for select
  to anon, authenticated
  using (true);

insert into public.resorts (name, slug, category, resort_area, disney_url, is_dvc, sort_order) values
  -- Value Resorts (5)
  ('Disney''s All-Star Movies Resort', 'all-star-movies-resort', 'value', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/all-star-movies-resort/', false, 1),
  ('Disney''s All-Star Music Resort', 'all-star-music-resort', 'value', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/all-star-music-resort/', false, 2),
  ('Disney''s All-Star Sports Resort', 'all-star-sports-resort', 'value', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/all-star-sports-resort/', false, 3),
  ('Disney''s Art of Animation Resort', 'art-of-animation-resort', 'value', 'wide_world_of_sports', 'https://disneyworld.disney.go.com/resorts/art-of-animation-resort/', false, 4),
  ('Disney''s Pop Century Resort', 'pop-century-resort', 'value', 'wide_world_of_sports', 'https://disneyworld.disney.go.com/resorts/pop-century-resort/', false, 5),

  -- Moderate Resorts (4)
  ('Disney''s Caribbean Beach Resort', 'caribbean-beach-resort', 'moderate', 'epcot', 'https://disneyworld.disney.go.com/resorts/caribbean-beach-resort/', false, 6),
  ('Disney''s Coronado Springs Resort', 'coronado-springs-resort', 'moderate', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/coronado-springs-resort/', false, 7),
  ('Disney''s Port Orleans Resort - French Quarter', 'port-orleans-resort-french-quarter', 'moderate', 'disney_springs', 'https://disneyworld.disney.go.com/resorts/port-orleans-resort-french-quarter/', false, 8),
  ('Disney''s Port Orleans Resort - Riverside', 'port-orleans-resort-riverside', 'moderate', 'disney_springs', 'https://disneyworld.disney.go.com/resorts/port-orleans-resort-riverside/', false, 9),

  -- Deluxe Resorts (8)
  ('Disney''s Animal Kingdom Lodge', 'animal-kingdom-lodge', 'deluxe', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/animal-kingdom-lodge/', false, 10),
  ('Disney''s Beach Club Resort', 'beach-club-resort', 'deluxe', 'epcot', 'https://disneyworld.disney.go.com/resorts/beach-club-resort/', false, 11),
  ('Disney''s BoardWalk Inn', 'boardwalk-inn', 'deluxe', 'epcot', 'https://disneyworld.disney.go.com/resorts/boardwalk-inn/', false, 12),
  ('Disney''s Contemporary Resort', 'contemporary-resort', 'deluxe', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/contemporary-resort/', false, 13),
  ('Disney''s Grand Floridian Resort & Spa', 'grand-floridian-resort-and-spa', 'deluxe', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/grand-floridian-resort-and-spa/', false, 14),
  ('Disney''s Polynesian Village Resort', 'polynesian-village-resort', 'deluxe', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/polynesian-village-resort/', false, 15),
  ('Disney''s Wilderness Lodge', 'wilderness-lodge', 'deluxe', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/wilderness-lodge/', false, 16),
  ('Disney''s Yacht Club Resort', 'yacht-club-resort', 'deluxe', 'epcot', 'https://disneyworld.disney.go.com/resorts/yacht-club-resort/', false, 17),

  -- Deluxe Villa Resorts / Disney Vacation Club (13)
  ('Disney''s Animal Kingdom Villas - Jambo House', 'animal-kingdom-villas-jambo-house', 'deluxe_villa', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/animal-kingdom-villas-jambo-house/', true, 18),
  ('Disney''s Animal Kingdom Villas - Kidani Village', 'animal-kingdom-villas-kidani-village', 'deluxe_villa', 'animal_kingdom', 'https://disneyworld.disney.go.com/resorts/animal-kingdom-villas-kidani-village/', true, 19),
  ('Bay Lake Tower at Disney''s Contemporary Resort', 'bay-lake-tower-at-contemporary-resort', 'deluxe_villa', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/bay-lake-tower-at-contemporary-resort/', true, 20),
  ('Disney''s Beach Club Villas', 'beach-club-villas', 'deluxe_villa', 'epcot', 'https://disneyworld.disney.go.com/resorts/beach-club-villas/', true, 21),
  ('Disney''s BoardWalk Villas', 'boardwalk-villas', 'deluxe_villa', 'epcot', 'https://disneyworld.disney.go.com/resorts/boardwalk-villas/', true, 22),
  ('Boulder Ridge Villas at Disney''s Wilderness Lodge', 'boulder-ridge-villas-at-wilderness-lodge', 'deluxe_villa', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/boulder-ridge-villas-at-wilderness-lodge/', true, 23),
  ('Copper Creek Villas & Cabins at Disney''s Wilderness Lodge', 'copper-creek-villas-and-cabins-at-wilderness-lodge', 'deluxe_villa', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/copper-creek-villas-and-cabins-at-wilderness-lodge/', true, 24),
  ('Disney''s Old Key West Resort', 'old-key-west-resort', 'deluxe_villa', 'disney_springs', 'https://disneyworld.disney.go.com/resorts/old-key-west-resort/', true, 25),
  ('Disney''s Polynesian Villas & Bungalows', 'polynesian-villas-and-bungalows', 'deluxe_villa', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/polynesian-villas-and-bungalows/', true, 26),
  ('Disney''s Riviera Resort', 'riviera-resort', 'deluxe_villa', 'epcot', 'https://disneyworld.disney.go.com/resorts/riviera-resort/', true, 27),
  ('Disney''s Saratoga Springs Resort & Spa', 'saratoga-springs-resort-and-spa', 'deluxe_villa', 'disney_springs', 'https://disneyworld.disney.go.com/resorts/saratoga-springs-resort-and-spa/', true, 28),
  ('The Villas at Disney''s Grand Floridian Resort & Spa', 'villas-at-grand-floridian-resort-and-spa', 'deluxe_villa', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/villas-at-grand-floridian-resort-and-spa/', true, 29),
  ('The Cabins at Disney''s Fort Wilderness Resort - A Disney Vacation Club Resort', 'cabins-at-fort-wilderness-resort', 'deluxe_villa', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/cabins-at-fort-wilderness-resort/', true, 30),

  -- Campground (1)
  ('The Campsites at Disney''s Fort Wilderness Resort', 'campsites-at-fort-wilderness-resort', 'campground', 'magic_kingdom', 'https://disneyworld.disney.go.com/resorts/campsites-at-fort-wilderness-resort/', false, 31);

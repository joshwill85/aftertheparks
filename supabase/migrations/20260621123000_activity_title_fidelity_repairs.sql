-- Repair OCR-spaced public titles from the initial temporal bootstrap and
-- expand database health checks so title/source fidelity regressions fail loud.

with title_repairs(repair_key, clean_name, clean_slug) as (
  values
    ('WELLNESSSCAVENGERHUNT', 'Wellness Scavenger Hunt', 'wellness-scavenger-hunt'),
    ('REELFUNARCADE', 'Reel Fun Arcade', 'reel-fun-arcade'),
    ('FINDAFRIEND', 'Find A Friend', 'find-a-friend'),
    ('MICKEYTIEDYE', 'Mickey Tie-Dye', 'mickey-tie-dye'),
    ('ARCADETOURNAMENT', 'Arcade Tournament', 'arcade-tournament'),
    ('ARCADIAGAMES', 'Arcadia Games', 'arcadia-games'),
    ('ALLSTARLOBBYPARTY', 'All-Star Lobby Party', 'all-star-lobby-party'),
    ('BOATRENTALS', 'Boat Rentals', 'boat-rentals'),
    ('CABANARENTALS', 'Cabana Rentals', 'cabana-rentals'),
    ('GAMEPOINTARCADE', 'Game Point Arcade', 'game-point-arcade'),
    ('GLOWPARTY', 'Glow Party', 'glow-party'),
    ('HEALTHCLUB', 'Health Club', 'health-club'),
    ('LAFFERTYPLACEARCADE', 'Lafferty Place Arcade', 'lafferty-place-arcade'),
    ('MEDALLIONRUBBING', 'Medallion Rubbing', 'medallion-rubbing'),
    ('NIGHTTIMETRIVIA', 'Nighttime Trivia', 'nighttime-trivia'),
    ('PAJAMAPARTY', 'Pajama Party', 'pajama-party'),
    ('POOLSIDEACTIVITIES', 'Poolside Activities', 'poolside-activities'),
    ('ARTSCRAFTS', 'Arts & Crafts', 'arts-crafts'),
    ('ARTSANDCRAFTS', 'Arts & Crafts', 'arts-crafts'),
    ('SHIPSHAPEFITNESSCENTER', 'Ship Shape Fitness Center', 'ship-shape-fitness-center'),
    ('SIGNATURECRAFT', 'Signature Craft', 'signature-craft'),
    ('SILENTDISCO', 'Silent Disco', 'silent-disco'),
    ('SURVIVALOFTHEFITTEST', 'Survival of the Fittest', 'survival-of-the-fittest'),
    ('ULTIMATETRIVIACHALLENGE', 'Ultimate Trivia Challenge', 'ultimate-trivia-challenge'),
    ('WINTERTHEMEDACTIVITIES', 'Winter-Themed Activities', 'winter-themed-activities'),
    ('CALYPSOCAMPFIRE', 'Calypso Campfire', 'calypso-campfire'),
    ('CAMPFIRE', 'Campfire', 'campfire'),
    ('MOVIEUNDERTHESTARS', 'Movie Under the Stars', 'movie-under-the-stars'),
    ('MOVIESUNDERTHESTARS', 'Movies Under the Stars', 'movies-under-the-stars'),
    ('VIDEOGAMEDANCEPARTY', 'Video Game Dance Party', 'video-game-dance-party'),
    ('STORYTIMEYOGACLASS', 'Storytime Yoga Class', 'storytime-yoga-class'),
    ('STORYTIMEYOGA', 'Storytime Yoga', 'storytime-yoga'),
    ('CHESHIRECHALLENGES', 'Cheshire Challenges', 'cheshire-challenges'),
    ('COMMUNITYHALL', 'Community Hall', 'community-hall'),
    ('FAMILYWELLNESSFEATUREDCRAFT', 'Family Wellness Featured Craft', 'family-wellness-featured-craft'),
    ('FITNESSCENTER', 'Fitness Center', 'fitness-center')
),
corrupt_catalog as (
  select ac.id, ac.calendar_group_key, tr.clean_name, tr.clean_slug
  from public.activity_catalog ac
  join title_repairs tr
    on regexp_replace(upper(ac.canonical_name), '[^A-Z0-9]+', '', 'g') = tr.repair_key
  where ac.normalized_name <> tr.clean_slug
),
duplicate_clean_catalog as (
  select corrupt.id as corrupt_id, clean.id as clean_id
  from corrupt_catalog corrupt
  join public.activity_catalog clean
    on clean.calendar_group_key = corrupt.calendar_group_key
   and clean.normalized_name = corrupt.clean_slug
   and clean.id <> corrupt.id
)
update public.resort_activity_editions rae
set needs_review = true,
    is_active = false
from duplicate_clean_catalog dupes
where rae.activity_catalog_id = dupes.corrupt_id;

with title_repairs(repair_key, clean_name, clean_slug) as (
  values
    ('WELLNESSSCAVENGERHUNT', 'Wellness Scavenger Hunt', 'wellness-scavenger-hunt'),
    ('REELFUNARCADE', 'Reel Fun Arcade', 'reel-fun-arcade'),
    ('FINDAFRIEND', 'Find A Friend', 'find-a-friend'),
    ('MICKEYTIEDYE', 'Mickey Tie-Dye', 'mickey-tie-dye'),
    ('ARCADETOURNAMENT', 'Arcade Tournament', 'arcade-tournament'),
    ('ARCADIAGAMES', 'Arcadia Games', 'arcadia-games'),
    ('ALLSTARLOBBYPARTY', 'All-Star Lobby Party', 'all-star-lobby-party'),
    ('BOATRENTALS', 'Boat Rentals', 'boat-rentals'),
    ('CABANARENTALS', 'Cabana Rentals', 'cabana-rentals'),
    ('GAMEPOINTARCADE', 'Game Point Arcade', 'game-point-arcade'),
    ('GLOWPARTY', 'Glow Party', 'glow-party'),
    ('HEALTHCLUB', 'Health Club', 'health-club'),
    ('LAFFERTYPLACEARCADE', 'Lafferty Place Arcade', 'lafferty-place-arcade'),
    ('MEDALLIONRUBBING', 'Medallion Rubbing', 'medallion-rubbing'),
    ('NIGHTTIMETRIVIA', 'Nighttime Trivia', 'nighttime-trivia'),
    ('PAJAMAPARTY', 'Pajama Party', 'pajama-party'),
    ('POOLSIDEACTIVITIES', 'Poolside Activities', 'poolside-activities'),
    ('ARTSCRAFTS', 'Arts & Crafts', 'arts-crafts'),
    ('ARTSANDCRAFTS', 'Arts & Crafts', 'arts-crafts'),
    ('SHIPSHAPEFITNESSCENTER', 'Ship Shape Fitness Center', 'ship-shape-fitness-center'),
    ('SIGNATURECRAFT', 'Signature Craft', 'signature-craft'),
    ('SILENTDISCO', 'Silent Disco', 'silent-disco'),
    ('SURVIVALOFTHEFITTEST', 'Survival of the Fittest', 'survival-of-the-fittest'),
    ('ULTIMATETRIVIACHALLENGE', 'Ultimate Trivia Challenge', 'ultimate-trivia-challenge'),
    ('WINTERTHEMEDACTIVITIES', 'Winter-Themed Activities', 'winter-themed-activities'),
    ('CALYPSOCAMPFIRE', 'Calypso Campfire', 'calypso-campfire'),
    ('CAMPFIRE', 'Campfire', 'campfire'),
    ('MOVIEUNDERTHESTARS', 'Movie Under the Stars', 'movie-under-the-stars'),
    ('MOVIESUNDERTHESTARS', 'Movies Under the Stars', 'movies-under-the-stars'),
    ('VIDEOGAMEDANCEPARTY', 'Video Game Dance Party', 'video-game-dance-party'),
    ('STORYTIMEYOGACLASS', 'Storytime Yoga Class', 'storytime-yoga-class'),
    ('STORYTIMEYOGA', 'Storytime Yoga', 'storytime-yoga'),
    ('CHESHIRECHALLENGES', 'Cheshire Challenges', 'cheshire-challenges'),
    ('COMMUNITYHALL', 'Community Hall', 'community-hall'),
    ('FAMILYWELLNESSFEATUREDCRAFT', 'Family Wellness Featured Craft', 'family-wellness-featured-craft'),
    ('FITNESSCENTER', 'Fitness Center', 'fitness-center')
),
repairable_catalog as (
  select ac.id, tr.clean_name, tr.clean_slug
  from public.activity_catalog ac
  join title_repairs tr
    on regexp_replace(upper(ac.canonical_name), '[^A-Z0-9]+', '', 'g') = tr.repair_key
  where not exists (
    select 1
    from public.activity_catalog existing
    where existing.calendar_group_key = ac.calendar_group_key
      and existing.normalized_name = tr.clean_slug
      and existing.id <> ac.id
  )
)
update public.activity_catalog ac
set canonical_name = repairable.clean_name,
    normalized_name = repairable.clean_slug
from repairable_catalog repairable
where ac.id = repairable.id;

with title_repairs(repair_key, clean_name) as (
  values
    ('WELLNESSSCAVENGERHUNT', 'Wellness Scavenger Hunt'),
    ('REELFUNARCADE', 'Reel Fun Arcade'),
    ('FINDAFRIEND', 'Find A Friend'),
    ('MICKEYTIEDYE', 'Mickey Tie-Dye'),
    ('ARCADETOURNAMENT', 'Arcade Tournament'),
    ('ARCADIAGAMES', 'Arcadia Games'),
    ('ALLSTARLOBBYPARTY', 'All-Star Lobby Party'),
    ('BOATRENTALS', 'Boat Rentals'),
    ('CABANARENTALS', 'Cabana Rentals'),
    ('GAMEPOINTARCADE', 'Game Point Arcade'),
    ('GLOWPARTY', 'Glow Party'),
    ('HEALTHCLUB', 'Health Club'),
    ('LAFFERTYPLACEARCADE', 'Lafferty Place Arcade'),
    ('MEDALLIONRUBBING', 'Medallion Rubbing'),
    ('NIGHTTIMETRIVIA', 'Nighttime Trivia'),
    ('PAJAMAPARTY', 'Pajama Party'),
    ('POOLSIDEACTIVITIES', 'Poolside Activities'),
    ('ARTSCRAFTS', 'Arts & Crafts'),
    ('ARTSANDCRAFTS', 'Arts & Crafts'),
    ('SHIPSHAPEFITNESSCENTER', 'Ship Shape Fitness Center'),
    ('SIGNATURECRAFT', 'Signature Craft'),
    ('SILENTDISCO', 'Silent Disco'),
    ('SURVIVALOFTHEFITTEST', 'Survival of the Fittest'),
    ('ULTIMATETRIVIACHALLENGE', 'Ultimate Trivia Challenge'),
    ('WINTERTHEMEDACTIVITIES', 'Winter-Themed Activities'),
    ('CALYPSOCAMPFIRE', 'Calypso Campfire'),
    ('CAMPFIRE', 'Campfire'),
    ('MOVIEUNDERTHESTARS', 'Movie Under the Stars'),
    ('MOVIESUNDERTHESTARS', 'Movies Under the Stars'),
    ('VIDEOGAMEDANCEPARTY', 'Video Game Dance Party'),
    ('STORYTIMEYOGACLASS', 'Storytime Yoga Class'),
    ('STORYTIMEYOGA', 'Storytime Yoga'),
    ('CHESHIRECHALLENGES', 'Cheshire Challenges'),
    ('COMMUNITYHALL', 'Community Hall'),
    ('FAMILYWELLNESSFEATUREDCRAFT', 'Family Wellness Featured Craft'),
    ('FITNESSCENTER', 'Fitness Center')
)
update public.resort_activity_editions rae
set name = tr.clean_name
from title_repairs tr
where regexp_replace(upper(rae.name), '[^A-Z0-9]+', '', 'g') = tr.repair_key;

with blocked_title_keys(repair_key) as (
  values
    ('ADISNEYVACATIONCLUBRESORT'),
    ('ARTOFANIMATION'),
    ('CAMPFIREANDFAMILYACTIVITIES'),
    ('CODEFORMORE'),
    ('DISNEYCHARACTER'),
    ('DISNEYFANFAMILYFUN'),
    ('FAMILYWELLNESS'),
    ('HOUSE'),
    ('INDOORACTIVITIES'),
    ('JAMBO'),
    ('KIDANI'),
    ('MEMORIESACTIVITIES'),
    ('RESORT'),
    ('RESORTACTIVITIES'),
    ('RESORTSPA'),
    ('SIGNATUREACTIVITY'),
    ('STRINGOF'),
    ('VILLAGE'),
    ('ZAHANATIFITNESSCENTER')
)
update public.resort_activity_editions rae
set needs_review = true,
    is_active = false
from public.activity_catalog ac
join blocked_title_keys blocked
  on regexp_replace(upper(ac.canonical_name), '[^A-Z0-9]+', '', 'g') = blocked.repair_key
where rae.activity_catalog_id = ac.id;

create or replace function public.check_activity_data_health()
returns table (check_name text, detail text)
language sql stable as $$
  with active_current as (
    select ac.normalized_name, rae.name, rae.location, rae.schedule_text, rae.description, rae.needs_review, mn.movie_title
    from public.activity_catalog ac
    join public.resort_activity_editions rae on rae.activity_catalog_id = ac.id
    join public.calendar_editions ce on ce.id = rae.edition_id and ce.is_current = true
    left join public.movie_nights mn on mn.activity_catalog_id = ac.id and mn.edition_id = ce.id
    where rae.is_active = true
  )
  select 'missing_current_edition'::text, acg.calendar_group_key
  from public.activity_calendar_groups acg
  where acg.current_edition_id is null
    and acg.calendar_group_key != 'fort-wilderness'

  union all

  select 'ocr_garbage_movie_title', movie_title
  from active_current
  where movie_title is not null
    and length(regexp_replace(regexp_replace(movie_title, '\(\d{4}\)', '', 'g'), '[^a-zA-Z0-9 ''’":,&.!?-]', '', 'g'))::float
        / nullif(length(regexp_replace(movie_title, '\(\d{4}\)', '', 'g')), 0) < 0.9

  union all

  select 'needs_review_published', normalized_name
  from active_current
  where needs_review = true

  union all

  select 'ocr_spaced_activity_title', normalized_name || ': ' || name
  from active_current
  where name ~* '(^|[[:space:]])([[:alpha:]]{1,2}[[:space:]-]+){4,}[[:alpha:]]{1,2}($|[[:space:]])'

  union all

  select 'blocked_activity_title', normalized_name || ': ' || name
  from active_current
  where regexp_replace(upper(name), '[^A-Z0-9]+', '', 'g') in (
    'ADISNEYVACATIONCLUBRESORT',
    'ARTOFANIMATION',
    'CAMPFIREANDFAMILYACTIVITIES',
    'CODEFORMORE',
    'DISNEYCHARACTER',
    'DISNEYFANFAMILYFUN',
    'FAMILYWELLNESS',
    'HOUSE',
    'INDOORACTIVITIES',
    'JAMBO',
    'KIDANI',
    'MEMORIESACTIVITIES',
    'RESORT',
    'RESORTACTIVITIES',
    'RESORTSPA',
    'SIGNATUREACTIVITY',
    'STRINGOF',
    'VILLAGE',
    'ZAHANATIFITNESSCENTER'
  )

  union all

  select 'pdf_boilerplate_public_field', normalized_name
  from active_current
  where coalesce(location, '') || ' ' || coalesce(schedule_text, '') || ' ' || coalesce(description, '')
    ~* 'ACTIVITIES SCHEDULE TO VIEW|THIS INFORMATION DIGITALLY|SCAN THIS QR|S[[:space:]]*O[[:space:]]*R[[:space:]]*C';
$$;

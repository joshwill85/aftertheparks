-- Persistent TMDB poster cache keyed by normalized movie title.
-- Stores both hits and misses so we never re-query TMDB for the same title.

create table if not exists public.movie_poster_cache (
  title_key text primary key,
  display_title text not null,
  tmdb_id integer,
  poster_path text,
  poster_url text,
  backdrop_path text,
  backdrop_url text,
  release_year integer,
  lookup_status text not null default 'found'
    check (lookup_status in ('found', 'not_found')),
  resolved_at timestamptz not null default now()
);

create index if not exists movie_poster_cache_status_idx
  on public.movie_poster_cache (lookup_status);

alter table public.movie_poster_cache enable row level security;

create policy "movie_poster_cache_public_read"
  on public.movie_poster_cache for select
  to anon, authenticated
  using (true);

create policy "movie_poster_cache_service_write"
  on public.movie_poster_cache for all
  to service_role
  using (true)
  with check (true);

grant select on public.movie_poster_cache to anon, authenticated;
grant all on public.movie_poster_cache to service_role;

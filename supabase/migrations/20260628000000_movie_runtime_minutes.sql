alter table public.movie_poster_cache
  add column if not exists runtime_minutes integer;

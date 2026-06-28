alter table public.movie_poster_cache
  add column if not exists overview text,
  add column if not exists vote_average numeric(3, 1);

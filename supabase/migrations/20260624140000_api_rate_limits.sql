-- Distributed API rate limiting (fixed-window counters, service-role only)

create table public.api_rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (bucket_key, window_start)
);

create index api_rate_limit_buckets_window_idx
  on public.api_rate_limit_buckets (window_start);

alter table public.api_rate_limit_buckets enable row level security;

create policy "Service role manages rate limit buckets"
  on public.api_rate_limit_buckets for all to service_role
  using (true) with check (true);

-- Atomically increment a bucket and report whether the request is allowed.
create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_retry integer;
  v_epoch integer;
begin
  if p_max_requests <= 0 or p_window_seconds <= 0 then
    return query select true, 0, p_max_requests;
    return;
  end if;

  v_epoch := floor(extract(epoch from now()))::integer;
  v_window_start := to_timestamp(
    (v_epoch / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limit_buckets as b (
    bucket_key,
    window_start,
    request_count
  )
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set request_count = b.request_count + 1
  returning request_count into v_count;

  if v_count > p_max_requests then
    v_retry := p_window_seconds - (v_epoch % p_window_seconds);
    if v_retry <= 0 then
      v_retry := p_window_seconds;
    end if;
    return query select false, v_retry, 0;
  end if;

  return query select true, 0, greatest(p_max_requests - v_count, 0);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Best-effort cleanup for windows older than 48 hours (call from cron or occasionally).
create or replace function public.prune_api_rate_limit_buckets(
  p_older_than interval default interval '48 hours'
)
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.api_rate_limit_buckets
    where window_start < now() - p_older_than
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.prune_api_rate_limit_buckets(interval) from public;
grant execute on function public.prune_api_rate_limit_buckets(interval) to service_role;

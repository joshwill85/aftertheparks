-- Plan quotas support + anonymous cleanup (lean MVP v2.0)

create table if not exists public.plan_interest_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  marketing_consent boolean not null default false,
  consent_version text not null default '2026-06-24-v1',
  source text not null default 'plan_preview',
  created_at timestamptz not null default now()
);

create index plan_interest_signups_email_idx on public.plan_interest_signups (email);

alter table public.plan_interest_signups enable row level security;

create policy "Service role manages plan interest signups"
  on public.plan_interest_signups for all to service_role
  using (true) with check (true);

-- Cleanup abandoned guest plans (run via cron /api/cron/plan-cleanup)
create or replace function public.cleanup_abandoned_guest_plans()
returns table (
  deleted_itineraries integer,
  deleted_items integer,
  pruned_rate_buckets integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_itineraries integer := 0;
  v_deleted_items integer := 0;
  v_pruned integer := 0;
begin
  -- Soft-delete empty active plans older than 7 days
  with empty_plans as (
    select i.id
    from public.itineraries i
    where i.status = 'active'
      and i.deleted_at is null
      and i.updated_at < now() - interval '7 days'
      and not exists (
        select 1 from public.itinerary_items it
        where it.itinerary_id = i.id and it.deleted_at is null
      )
  ),
  marked as (
    update public.itineraries i
    set status = 'deleted', deleted_at = now()
    from empty_plans e
    where i.id = e.id
    returning i.id
  )
  select count(*)::integer into v_deleted_itineraries from marked;

  -- Hard-delete soft-deleted items older than 30 days
  with removed as (
    delete from public.itinerary_items
    where deleted_at is not null
      and deleted_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer into v_deleted_items from removed;

  select public.prune_api_rate_limit_buckets(interval '48 hours')
  into v_pruned;

  return query select v_deleted_itineraries, v_deleted_items, v_pruned;
end;
$$;

revoke all on function public.cleanup_abandoned_guest_plans() from public;
grant execute on function public.cleanup_abandoned_guest_plans() to service_role;

-- Guest itinerary: server-backed plans with owner RLS (PRD 2026-06-24)

create type public.itinerary_status as enum ('active', 'archived', 'deleted');
create type public.itinerary_share_status as enum ('active', 'revoked');
create type public.marketing_consent_status as enum ('subscribed', 'unsubscribed');
create type public.itinerary_item_source_type as enum (
  'scheduled_occurrence',
  'offering',
  'custom'
);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My Rest Day Plan',
  timezone text not null default 'America/New_York',
  trip_start_date date,
  trip_end_date date,
  status public.itinerary_status not null default 'active',
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz,
  deleted_at timestamptz
);

create index itineraries_owner_active_idx
  on public.itineraries (owner_user_id)
  where status = 'active' and deleted_at is null;

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  source_type public.itinerary_item_source_type not null default 'scheduled_occurrence',
  source_activity_id text,
  source_occurrence_id text,
  title text not null,
  resort_id text,
  resort_name text not null,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  category text,
  price_label text,
  source_url text,
  source_verified_at timestamptz,
  saved_source_version text,
  snapshot_json jsonb not null default '{}'::jsonb,
  user_note text,
  sort_order integer,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index itinerary_items_occurrence_unique
  on public.itinerary_items (itinerary_id, source_occurrence_id)
  where source_occurrence_id is not null and deleted_at is null;

create index itinerary_items_itinerary_idx
  on public.itinerary_items (itinerary_id)
  where deleted_at is null;

create table public.itinerary_shares (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  token_hash text not null unique,
  status public.itinerary_share_status not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  view_count integer not null default 0
);

create unique index itinerary_shares_one_active_per_plan
  on public.itinerary_shares (itinerary_id)
  where status = 'active';

create table public.processed_plan_operations (
  operation_id uuid primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  operation_type text not null,
  processed_at timestamptz not null default now(),
  result_reference uuid
);

create index processed_plan_ops_owner_idx
  on public.processed_plan_operations (owner_user_id, processed_at desc);

create table public.email_marketing_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  status public.marketing_consent_status not null,
  consent_version text not null,
  source text not null,
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index email_marketing_consents_email_idx
  on public.email_marketing_consents (email);

-- updated_at maintenance
create or replace function public.touch_itinerary_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger itineraries_updated_at_trg
  before update on public.itineraries
  for each row execute function public.touch_itinerary_updated_at();

create trigger itinerary_items_updated_at_trg
  before update on public.itinerary_items
  for each row execute function public.touch_itinerary_updated_at();

-- RLS
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.itinerary_shares enable row level security;
alter table public.processed_plan_operations enable row level security;
alter table public.email_marketing_consents enable row level security;

create policy "Owners read own itineraries"
  on public.itineraries for select to authenticated
  using (owner_user_id = auth.uid() and deleted_at is null);

create policy "Owners insert own itineraries"
  on public.itineraries for insert to authenticated
  with check (owner_user_id = auth.uid());

create policy "Owners update own itineraries"
  on public.itineraries for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "Owners delete own itineraries"
  on public.itineraries for delete to authenticated
  using (owner_user_id = auth.uid());

create policy "Owners read own itinerary items"
  on public.itinerary_items for select to authenticated
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
        and i.deleted_at is null
    )
    and deleted_at is null
  );

create policy "Owners insert own itinerary items"
  on public.itinerary_items for insert to authenticated
  with check (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
        and i.deleted_at is null
    )
  );

create policy "Owners update own itinerary items"
  on public.itinerary_items for update to authenticated
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
    )
  );

create policy "Owners delete own itinerary items"
  on public.itinerary_items for delete to authenticated
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
    )
  );

create policy "Owners read own itinerary shares"
  on public.itinerary_shares for select to authenticated
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
    )
  );

create policy "Owners insert own itinerary shares"
  on public.itinerary_shares for insert to authenticated
  with check (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
        and i.deleted_at is null
    )
  );

create policy "Owners update own itinerary shares"
  on public.itinerary_shares for update to authenticated
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and i.owner_user_id = auth.uid()
    )
  );

create policy "Owners read own processed operations"
  on public.processed_plan_operations for select to authenticated
  using (owner_user_id = auth.uid());

create policy "Owners insert own processed operations"
  on public.processed_plan_operations for insert to authenticated
  with check (owner_user_id = auth.uid());

create policy "Users read own marketing consents"
  on public.email_marketing_consents for select to authenticated
  using (user_id = auth.uid());

create policy "Users insert own marketing consents"
  on public.email_marketing_consents for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);

create policy "Users update own marketing consents"
  on public.email_marketing_consents for update to authenticated
  using (user_id = auth.uid());

-- Service role bypass for public share resolver and admin
create policy "Service role manages itineraries"
  on public.itineraries for all to service_role using (true) with check (true);
create policy "Service role manages itinerary items"
  on public.itinerary_items for all to service_role using (true) with check (true);
create policy "Service role manages itinerary shares"
  on public.itinerary_shares for all to service_role using (true) with check (true);
create policy "Service role manages processed operations"
  on public.processed_plan_operations for all to service_role using (true) with check (true);
create policy "Service role manages marketing consents"
  on public.email_marketing_consents for all to service_role using (true) with check (true);

grant select, insert, update, delete on public.itineraries to authenticated;
grant select, insert, update, delete on public.itinerary_items to authenticated;
grant select, insert, update on public.itinerary_shares to authenticated;
grant select, insert on public.processed_plan_operations to authenticated;
grant select, insert, update on public.email_marketing_consents to authenticated;

-- Optional stay shell settings for My Plan.

alter table public.itineraries
  add column if not exists home_resort_slug text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itineraries_home_resort_slug_fkey'
      and conrelid = 'public.itineraries'::regclass
  ) then
    alter table public.itineraries
      add constraint itineraries_home_resort_slug_fkey
      foreign key (home_resort_slug)
      references public.resorts (slug)
      on delete set null;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itineraries_trip_date_range_check'
      and conrelid = 'public.itineraries'::regclass
  ) then
    alter table public.itineraries
      add constraint itineraries_trip_date_range_check
      check (
        (trip_start_date is null and trip_end_date is null)
        or (
          trip_start_date is not null
          and trip_end_date is not null
          and trip_start_date <= trip_end_date
        )
      );
  end if;
end;
$$;

create or replace function public.update_itinerary_settings_operation(
  p_operation_id uuid,
  p_owner_user_id uuid,
  p_home_resort_slug text,
  p_trip_start_date date,
  p_trip_end_date date
)
returns table (
  id uuid,
  title text,
  timezone text,
  version bigint,
  updated_at timestamptz,
  owner_user_id uuid,
  home_resort_slug text,
  trip_start_date date,
  trip_end_date date
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_itinerary public.itineraries%rowtype;
  v_itinerary_id uuid;
begin
  if p_owner_user_id is distinct from auth.uid() then
    raise exception 'Cannot mutate another user plan';
  end if;

  if (p_trip_start_date is null) is distinct from (p_trip_end_date is null) then
    raise exception 'Both trip dates are required';
  end if;

  if p_trip_start_date is not null and p_trip_start_date > p_trip_end_date then
    raise exception 'Trip start date must be before trip end date';
  end if;

  if p_home_resort_slug is not null and not exists (
    select 1 from public.resorts r where r.slug = p_home_resort_slug
  ) then
    raise exception 'Unknown home resort';
  end if;

  if not exists (
    select 1 from public.processed_plan_operations ppo
    where ppo.operation_id = p_operation_id
      and ppo.owner_user_id = p_owner_user_id
  ) then
    select active_plan.id
      into v_itinerary_id
    from public.get_or_create_active_itinerary(p_owner_user_id) as active_plan
    limit 1;

    update public.itineraries i
    set home_resort_slug = nullif(trim(p_home_resort_slug), ''),
      trip_start_date = p_trip_start_date,
      trip_end_date = p_trip_end_date,
      version = i.version + 1
    where i.id = v_itinerary_id
    returning * into v_itinerary;

    insert into public.processed_plan_operations (
      operation_id,
      owner_user_id,
      operation_type,
      result_reference
    )
    values (p_operation_id, p_owner_user_id, 'update_plan_settings', v_itinerary.id)
    on conflict (operation_id) do nothing;
  else
    select *
      into v_itinerary
    from public.itineraries i
    where i.owner_user_id = p_owner_user_id
      and i.status = 'active'
      and i.deleted_at is null
    order by i.updated_at desc
    limit 1;
  end if;

  if not found then
    raise exception 'Plan not found';
  end if;

  return query
    select v_itinerary.id,
      v_itinerary.title,
      v_itinerary.timezone,
      v_itinerary.version,
      v_itinerary.updated_at,
      v_itinerary.owner_user_id,
      v_itinerary.home_resort_slug,
      v_itinerary.trip_start_date,
      v_itinerary.trip_end_date;
end;
$$;

grant execute on function public.update_itinerary_settings_operation(uuid, uuid, text, date, date) to authenticated;

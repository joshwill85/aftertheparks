-- Qualify plan RPC internals so output-column variables do not shadow table columns.

create or replace function public.add_itinerary_item_operation(
  p_operation_id uuid,
  p_owner_user_id uuid,
  p_source_type public.itinerary_item_source_type,
  p_source_activity_id text,
  p_source_occurrence_id text,
  p_title text,
  p_resort_id text,
  p_resort_name text,
  p_location text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_category text,
  p_price_label text,
  p_source_url text,
  p_source_verified_at timestamptz,
  p_saved_source_version text,
  p_snapshot_json jsonb,
  p_user_note text,
  p_max_active_items integer,
  p_max_lifetime_items integer
)
returns table (
  plan_id uuid,
  plan_title text,
  plan_timezone text,
  plan_version bigint,
  plan_updated_at timestamptz,
  item_created boolean,
  id uuid,
  itinerary_id uuid,
  source_type text,
  source_activity_id text,
  source_occurrence_id text,
  title text,
  resort_id text,
  resort_name text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  category text,
  price_label text,
  source_url text,
  source_verified_at timestamptz,
  saved_source_version text,
  snapshot_json jsonb,
  user_note text,
  sort_order integer,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_itinerary public.itineraries%rowtype;
  v_item public.itinerary_items%rowtype;
  v_result_reference uuid;
  v_itinerary_id uuid;
  v_active_count integer;
  v_lifetime_count integer;
begin
  if p_owner_user_id is distinct from auth.uid() then
    raise exception 'Cannot mutate another user plan';
  end if;

  select ppo.result_reference
    into v_result_reference
  from public.processed_plan_operations ppo
  where ppo.operation_id = p_operation_id
    and ppo.owner_user_id = p_owner_user_id;

  select active_plan.id
    into v_itinerary_id
  from public.get_or_create_active_itinerary(p_owner_user_id) as active_plan
  limit 1;

  select *
    into v_itinerary
  from public.itineraries i
  where i.id = v_itinerary_id;

  if v_result_reference is not null then
    select *
      into v_item
    from public.itinerary_items it
    where it.id = v_result_reference
      and it.itinerary_id = v_itinerary.id;

    if not found and p_source_occurrence_id is not null then
      select *
        into v_item
      from public.itinerary_items it
      where it.itinerary_id = v_itinerary.id
        and it.source_occurrence_id = p_source_occurrence_id
        and it.deleted_at is null
      limit 1;
    end if;

    if not found then
      raise exception 'Idempotent item missing';
    end if;

    return query
      select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
        v_itinerary.version, v_itinerary.updated_at, false,
        v_item.id, v_item.itinerary_id, v_item.source_type::text,
        v_item.source_activity_id, v_item.source_occurrence_id, v_item.title,
        v_item.resort_id, v_item.resort_name, v_item.location,
        v_item.starts_at, v_item.ends_at, v_item.category, v_item.price_label,
        v_item.source_url, v_item.source_verified_at, v_item.saved_source_version,
        v_item.snapshot_json, v_item.user_note, v_item.sort_order, v_item.created_at;
    return;
  end if;

  if p_source_occurrence_id is not null then
    select *
      into v_item
    from public.itinerary_items it
    where it.itinerary_id = v_itinerary.id
      and it.source_occurrence_id = p_source_occurrence_id
      and it.deleted_at is null
    limit 1;

    if found then
      insert into public.processed_plan_operations (
        operation_id,
        owner_user_id,
        operation_type,
        result_reference
      )
      values (p_operation_id, p_owner_user_id, 'add_item', v_item.id)
      on conflict (operation_id) do nothing;

      return query
        select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
          v_itinerary.version, v_itinerary.updated_at, false,
          v_item.id, v_item.itinerary_id, v_item.source_type::text,
          v_item.source_activity_id, v_item.source_occurrence_id, v_item.title,
          v_item.resort_id, v_item.resort_name, v_item.location,
          v_item.starts_at, v_item.ends_at, v_item.category, v_item.price_label,
          v_item.source_url, v_item.source_verified_at, v_item.saved_source_version,
          v_item.snapshot_json, v_item.user_note, v_item.sort_order, v_item.created_at;
      return;
    end if;
  end if;

  select count(*)::integer
    into v_active_count
  from public.itinerary_items it
  where it.itinerary_id = v_itinerary.id
    and it.deleted_at is null;

  if v_active_count >= p_max_active_items then
    raise exception 'Active item quota reached';
  end if;

  select count(*)::integer
    into v_lifetime_count
  from public.itinerary_items it
  where it.itinerary_id = v_itinerary.id;

  if v_lifetime_count >= p_max_lifetime_items then
    raise exception 'Lifetime item quota reached';
  end if;

  insert into public.itinerary_items (
    itinerary_id,
    source_type,
    source_activity_id,
    source_occurrence_id,
    title,
    resort_id,
    resort_name,
    location,
    starts_at,
    ends_at,
    category,
    price_label,
    source_url,
    source_verified_at,
    saved_source_version,
    snapshot_json,
    user_note
  )
  values (
    v_itinerary.id,
    p_source_type,
    p_source_activity_id,
    p_source_occurrence_id,
    left(p_title, 500),
    p_resort_id,
    left(p_resort_name, 200),
    left(p_location, 300),
    p_starts_at,
    p_ends_at,
    p_category,
    p_price_label,
    p_source_url,
    p_source_verified_at,
    p_saved_source_version,
    coalesce(p_snapshot_json, '{}'::jsonb) ||
      jsonb_build_object('sourceStatus', 'current'),
    p_user_note
  )
  returning * into v_item;

  update public.itineraries i
  set version = i.version + 1
  where i.id = v_itinerary.id
  returning * into v_itinerary;

  insert into public.processed_plan_operations (
    operation_id,
    owner_user_id,
    operation_type,
    result_reference
  )
  values (p_operation_id, p_owner_user_id, 'add_item', v_item.id)
  on conflict (operation_id) do nothing;

  return query
    select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
      v_itinerary.version, v_itinerary.updated_at, true,
      v_item.id, v_item.itinerary_id, v_item.source_type::text,
      v_item.source_activity_id, v_item.source_occurrence_id, v_item.title,
      v_item.resort_id, v_item.resort_name, v_item.location,
      v_item.starts_at, v_item.ends_at, v_item.category, v_item.price_label,
      v_item.source_url, v_item.source_verified_at, v_item.saved_source_version,
      v_item.snapshot_json, v_item.user_note, v_item.sort_order, v_item.created_at;
end;
$$;

create or replace function public.remove_itinerary_item_operation(
  p_operation_id uuid,
  p_owner_user_id uuid,
  p_item_id uuid
)
returns table (
  id uuid,
  title text,
  timezone text,
  version bigint,
  updated_at timestamptz,
  owner_user_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_itinerary public.itineraries%rowtype;
  v_changed integer;
begin
  if p_owner_user_id is distinct from auth.uid() then
    raise exception 'Cannot mutate another user plan';
  end if;

  if exists (
    select 1 from public.processed_plan_operations ppo
    where ppo.operation_id = p_operation_id
      and ppo.owner_user_id = p_owner_user_id
  ) then
    select *
      into v_itinerary
    from public.itineraries i
    where i.owner_user_id = p_owner_user_id
      and i.status = 'active'
      and i.deleted_at is null
    order by i.updated_at desc
    limit 1;

    if not found then
      raise exception 'Plan not found';
    end if;

    return query
      select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
        v_itinerary.version, v_itinerary.updated_at, v_itinerary.owner_user_id;
    return;
  end if;

  select *
    into v_itinerary
  from public.itineraries i
  where i.owner_user_id = p_owner_user_id
    and i.status = 'active'
    and i.deleted_at is null
  order by i.updated_at desc
  limit 1;

  if not found then
    raise exception 'No active plan';
  end if;

  update public.itinerary_items it
  set deleted_at = now()
  where it.id = p_item_id
    and it.itinerary_id = v_itinerary.id
    and it.deleted_at is null;

  get diagnostics v_changed = row_count;

  if v_changed > 0 then
    update public.itineraries i
    set version = i.version + 1
    where i.id = v_itinerary.id
    returning * into v_itinerary;
  end if;

  insert into public.processed_plan_operations (
    operation_id,
    owner_user_id,
    operation_type,
    result_reference
  )
  values (p_operation_id, p_owner_user_id, 'remove_item', p_item_id)
  on conflict (operation_id) do nothing;

  return query
    select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
      v_itinerary.version, v_itinerary.updated_at, v_itinerary.owner_user_id;
end;
$$;

create or replace function public.update_itinerary_item_note_operation(
  p_operation_id uuid,
  p_owner_user_id uuid,
  p_item_id uuid,
  p_user_note text
)
returns table (
  id uuid,
  title text,
  timezone text,
  version bigint,
  updated_at timestamptz,
  owner_user_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_itinerary public.itineraries%rowtype;
begin
  if p_owner_user_id is distinct from auth.uid() then
    raise exception 'Cannot mutate another user plan';
  end if;

  if exists (
    select 1 from public.processed_plan_operations ppo
    where ppo.operation_id = p_operation_id
      and ppo.owner_user_id = p_owner_user_id
  ) then
    select *
      into v_itinerary
    from public.itineraries i
    where i.owner_user_id = p_owner_user_id
      and i.status = 'active'
      and i.deleted_at is null
    order by i.updated_at desc
    limit 1;
  else
    select *
      into v_itinerary
    from public.itineraries i
    where i.owner_user_id = p_owner_user_id
      and i.status = 'active'
      and i.deleted_at is null
    order by i.updated_at desc
    limit 1;

    if not found then
      raise exception 'No active plan';
    end if;

    update public.itinerary_items it
    set user_note = nullif(left(coalesce(p_user_note, ''), 1000), '')
    where it.id = p_item_id
      and it.itinerary_id = v_itinerary.id
      and it.deleted_at is null;

    update public.itineraries i
    set version = i.version + 1
    where i.id = v_itinerary.id
    returning * into v_itinerary;

    insert into public.processed_plan_operations (
      operation_id,
      owner_user_id,
      operation_type,
      result_reference
    )
    values (p_operation_id, p_owner_user_id, 'update_item_note', p_item_id)
    on conflict (operation_id) do nothing;
  end if;

  if not found then
    raise exception 'Plan not found';
  end if;

  return query
    select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
      v_itinerary.version, v_itinerary.updated_at, v_itinerary.owner_user_id;
end;
$$;

create or replace function public.rename_itinerary_operation(
  p_operation_id uuid,
  p_owner_user_id uuid,
  p_title text
)
returns table (
  id uuid,
  title text,
  timezone text,
  version bigint,
  updated_at timestamptz,
  owner_user_id uuid
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

  if not exists (
    select 1 from public.processed_plan_operations ppo
    where ppo.operation_id = p_operation_id
      and ppo.owner_user_id = p_owner_user_id
  ) then
    select active_plan.id
      into v_itinerary_id
    from public.get_or_create_active_itinerary(p_owner_user_id) as active_plan
    limit 1;

    select *
      into v_itinerary
    from public.itineraries i
    where i.id = v_itinerary_id;

    update public.itineraries i
    set title = coalesce(nullif(left(trim(regexp_replace(p_title, '[<>]', '', 'g')), 80), ''), 'My Rest Day Plan'),
      version = i.version + 1
    where i.id = v_itinerary.id
    returning * into v_itinerary;

    insert into public.processed_plan_operations (
      operation_id,
      owner_user_id,
      operation_type
    )
    values (p_operation_id, p_owner_user_id, 'rename_plan')
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
    select v_itinerary.id, v_itinerary.title, v_itinerary.timezone,
      v_itinerary.version, v_itinerary.updated_at, v_itinerary.owner_user_id;
end;
$$;

grant execute on function public.add_itinerary_item_operation(
  uuid,
  uuid,
  public.itinerary_item_source_type,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  timestamptz,
  text,
  jsonb,
  text,
  integer,
  integer
) to authenticated;
grant execute on function public.remove_itinerary_item_operation(uuid, uuid, uuid) to authenticated;
grant execute on function public.update_itinerary_item_note_operation(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.rename_itinerary_operation(uuid, uuid, text) to authenticated;

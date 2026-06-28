with expected(table_name) as (
  values
    ('weather_locations'),
    ('activity_weather_profiles'),
    ('weather_snapshots'),
    ('weather_alerts'),
    ('weather_alert_cache_state'),
    ('plan_weather_snapshots'),
    ('weather_material_changes')
),
table_state as (
  select
    e.table_name,
    t.table_name is not null as exists,
    coalesce(c.relrowsecurity, false) as rls_enabled
  from expected e
  left join information_schema.tables t
    on t.table_schema = 'public'
    and t.table_name = e.table_name
  left join pg_class c
    on c.relname = e.table_name
    and c.relnamespace = 'public'::regnamespace
)
select
  table_name,
  exists,
  rls_enabled,
  has_table_privilege('service_role', format('public.%I', table_name), 'insert') as service_role_can_insert,
  has_table_privilege('service_role', format('public.%I', table_name), 'update') as service_role_can_update,
  has_table_privilege('service_role', format('public.%I', table_name), 'select') as service_role_can_select
from table_state
order by table_name;

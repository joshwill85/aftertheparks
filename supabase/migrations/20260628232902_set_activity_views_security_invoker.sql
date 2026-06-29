-- Existing public activity views should respect caller RLS/permissions.
alter view public.v_resort_activities_today set (security_invoker = true);
alter view public.v_resort_activities_current set (security_invoker = true);

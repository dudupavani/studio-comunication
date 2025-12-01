-- Remove legacy org_users_view view (was used by early Supabase scaffolding).
-- All queries now read profiles/org_members directly, so the view can be dropped.

drop view if exists public.org_users_view;

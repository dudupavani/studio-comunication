-- Fix RLS policies for org_members table
-- Previous policy org_members_select_authenticated was insecure as it allowed any authenticated user
-- to SELECT all records from org_members without proper organization isolation.
-- This migration implements proper multi-tenant isolation:
-- - platform_admin can read all records
-- - regular users can only read records belonging to their organization
-- - org_admin and managers can perform operations within their organization only

-- Drop all existing policies to ensure clean slate
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'org_members'
  loop
    execute format('drop policy if exists %I on public.org_members', pol.policyname);
  end loop;
end$$;

-- Re-enable RLS for the table
alter table if exists public.org_members enable row level security;

-- SELECT policy: allows platform_admin to read all records OR users to read only their own organization
create policy org_members_select
  on public.org_members
  for select
  using (
    -- platform_admin can read all records
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
    or
    -- regular user can only read records in their organization
    (
      exists (
        select 1
        from public.org_members om_auth
        where om_auth.user_id = auth.uid()
          and om_auth.org_id = org_members.org_id
      )
    )
  );

-- INSERT policy: allows platform_admin to insert anywhere OR org_admin/unit_master to insert within their organization
create policy org_members_insert
  on public.org_members
  for insert
  with check (
    -- platform_admin has full access
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
    or
    -- organization admins and masters can insert members for their organization
    exists (
      select 1
      from public.org_members om_auth
      where om_auth.user_id = auth.uid()
        and om_auth.org_id = org_members.org_id
        and om_auth.role in ('org_admin', 'org_master', 'unit_master')
    )
  );

-- UPDATE policy: allows platform_admin to update any record OR org_admin/unit_master to update within their organization
create policy org_members_update
  on public.org_members
  for update
  using (
    -- platform_admin has full access
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
    or
    -- organization admins and masters can update members of their organization
    exists (
      select 1
      from public.org_members om_auth
      where om_auth.user_id = auth.uid()
        and om_auth.org_id = org_members.org_id
        and om_auth.role in ('org_admin', 'org_master', 'unit_master')
    )
  )
  with check (
    -- platform_admin has full access
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
    or
    -- organization admins and masters can update members of their organization
    exists (
      select 1
      from public.org_members om_auth
      where om_auth.user_id = auth.uid()
        and om_auth.org_id = org_members.org_id
        and om_auth.role in ('org_admin', 'org_master', 'unit_master')
    )
  );

-- DELETE policy: allows platform_admin to delete any record OR org_admin/unit_master to delete within their organization
create policy org_members_delete
  on public.org_members
  for delete
  using (
    -- platform_admin has full access
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
    or
    -- organization admins and masters can delete members of their organization
    exists (
      select 1
      from public.org_members om_auth
      where om_auth.user_id = auth.uid()
        and om_auth.org_id = org_members.org_id
        and om_auth.role in ('org_admin', 'org_master', 'unit_master')
    )
  );
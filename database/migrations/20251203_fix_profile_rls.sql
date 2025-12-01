-- Rebuild org_members/profiles policies to avoid recursive checks.

-- org_members: drop previous manager policies (they caused recursive evaluation)
drop policy if exists org_members_select_self_or_managers on public.org_members;
drop policy if exists org_members_insert_managers on public.org_members;
drop policy if exists org_members_update_managers on public.org_members;
drop policy if exists org_members_delete_managers on public.org_members;

-- Allow each user to see their own memberships (used by auth context & unit detection)
drop policy if exists org_members_select_self on public.org_members;
create policy org_members_select_self
  on public.org_members
  for select
  using (auth.uid() = user_id);

-- Allow platform admins (global_role=platform_admin) to operate on org_members
drop policy if exists org_members_all_platform_admin on public.org_members;
create policy org_members_all_platform_admin
  on public.org_members
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

-- profiles: keep only self-update policy (manager updates happen via service role)
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_update_org_managers on public.profiles;

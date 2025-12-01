-- Remove any remaining recursive policies on org_members/profiles and recreate safe ones.

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

alter table if exists public.org_members enable row level security;

create policy org_members_select_self
  on public.org_members
  for select
  using (auth.uid() = user_id);

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

do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname not in ('profiles_read_for_authenticated')
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end$$;

alter table if exists public.profiles enable row level security;

create policy profiles_update_self
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

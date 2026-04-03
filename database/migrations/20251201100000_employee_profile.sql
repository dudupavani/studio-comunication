-- Perfil corporativo separado do perfil pessoal
create table if not exists public.employee_profile (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cargo text,
  data_entrada date,
  time_principal_id uuid references public.equipes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_profile_user_org_unique unique (org_id, user_id)
);

create index if not exists idx_employee_profile_org on public.employee_profile(org_id);
create index if not exists idx_employee_profile_user on public.employee_profile(user_id);
create index if not exists idx_employee_profile_team on public.employee_profile(time_principal_id);

-- Aliás legível para equipe_members
create or replace view public.team_members as
  select
    em.equipe_id as team_id,
    em.user_id,
    em.org_id,
    em.created_at
  from public.equipe_members em;

-- RLS: apenas gestores da mesma organização (ou o próprio usuário) podem ler/escrever
alter table public.employee_profile enable row level security;

drop policy if exists employee_profile_select_same_org_managers on public.employee_profile;
create policy employee_profile_select_same_org_managers
  on public.employee_profile
  for select
  using (
    auth.uid() is not null
    and (
      employee_profile.user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = employee_profile.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists employee_profile_insert_same_org_managers on public.employee_profile;
create policy employee_profile_insert_same_org_managers
  on public.employee_profile
  for insert
  with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = employee_profile.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists employee_profile_update_same_org_managers on public.employee_profile;
create policy employee_profile_update_same_org_managers
  on public.employee_profile
  for update
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = employee_profile.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  )
  with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = employee_profile.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists employee_profile_delete_same_org_managers on public.employee_profile;
create policy employee_profile_delete_same_org_managers
  on public.employee_profile
  for delete
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = employee_profile.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

-- RLS: org_members restrito a gestores da organização
alter table public.org_members enable row level security;

drop policy if exists org_members_select_self_or_managers on public.org_members;
create policy org_members_select_self_or_managers
  on public.org_members
  for select
  using (
    auth.uid() is not null
    and (
      org_members.user_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = org_members.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists org_members_insert_managers on public.org_members;
create policy org_members_insert_managers
  on public.org_members
  for insert
  with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = org_members.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists org_members_update_managers on public.org_members;
create policy org_members_update_managers
  on public.org_members
  for update
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = org_members.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  )
  with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = org_members.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists org_members_delete_managers on public.org_members;
create policy org_members_delete_managers
  on public.org_members
  for delete
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = org_members.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

-- RLS: perfis só podem ser atualizados pelo dono ou gestor da mesma organização
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_update_org_managers on public.profiles;
create policy profiles_update_org_managers
  on public.profiles
  for update
  using (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members manager
        join public.org_members target
          on target.user_id = public.profiles.id
         and target.org_id = manager.org_id
        where manager.user_id = auth.uid()
          and manager.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  )
  with check (
    auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members manager
        join public.org_members target
          on target.user_id = public.profiles.id
         and target.org_id = manager.org_id
        where manager.user_id = auth.uid()
          and manager.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

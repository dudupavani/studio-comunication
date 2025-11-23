-- Módulo Equipes

create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  leader_user_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_equipes_org_name_unique on public.equipes(org_id, lower(name));
create index if not exists idx_equipes_org on public.equipes(org_id);
create index if not exists idx_equipes_leader on public.equipes(leader_user_id);

create table if not exists public.equipe_members (
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint equipe_members_pkey primary key (equipe_id, user_id)
);

create index if not exists idx_equipe_members_user on public.equipe_members(user_id);
create index if not exists idx_equipe_members_org on public.equipe_members(org_id);

alter table public.equipes enable row level security;
alter table public.equipe_members enable row level security;

-- ===== Policies: Equipes =====
drop policy if exists equipes_select_same_org on public.equipes;
create policy equipes_select_same_org on public.equipes for select using (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipes.org_id
  )
);

drop policy if exists equipes_insert_managers on public.equipes;
create policy equipes_insert_managers on public.equipes for insert with check (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipes.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
);

drop policy if exists equipes_update_managers on public.equipes;
create policy equipes_update_managers on public.equipes for update using (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipes.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
) with check (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipes.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
);

drop policy if exists equipes_delete_managers on public.equipes;
create policy equipes_delete_managers on public.equipes for delete using (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipes.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
);

-- ===== Policies: Equipe Members =====
drop policy if exists equipe_members_select_same_org on public.equipe_members;
create policy equipe_members_select_same_org on public.equipe_members for select using (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipe_members.org_id
  )
);

drop policy if exists equipe_members_insert_managers on public.equipe_members;
create policy equipe_members_insert_managers on public.equipe_members for insert with check (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipe_members.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
);

drop policy if exists equipe_members_update_managers on public.equipe_members;
create policy equipe_members_update_managers on public.equipe_members for update using (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipe_members.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
) with check (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipe_members.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
);

drop policy if exists equipe_members_delete_managers on public.equipe_members;
create policy equipe_members_delete_managers on public.equipe_members for delete using (
  exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = equipe_members.org_id
      and om.role in ('org_admin', 'org_master', 'unit_master')
  )
);

-- Reintroduz políticas de leitura para usuários autenticados e mantém plataforma/admin com poderes totais.

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

-- Leitura: qualquer usuário autenticado pode ler org_members (necessário para menus, equipes, etc).
create policy org_members_select_authenticated
  on public.org_members
  for select
  to authenticated
  using (true);

-- Plataforma: pode tudo (compatível com flows administrativos).
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

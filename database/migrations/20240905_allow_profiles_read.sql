-- Permite que qualquer usuário autenticado leia nome/avatar de outros perfis.
-- Execute via Supabase CLI após aplicar este commit.

alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles read for authenticated'
  ) then
    create policy "profiles read for authenticated"
      on public.profiles
      for select
      to authenticated
      using (true);
  end if;
end$$;

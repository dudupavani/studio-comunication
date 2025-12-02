-- Allow authenticated users to create their own profile rows (for /profile self-service upsert).
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles
  for insert
  with check (auth.uid() = id);

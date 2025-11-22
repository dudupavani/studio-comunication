-- Atualiza a função update_profile_self para não depender de profiles.email
-- e suportar corretamente remoção/manutenção do avatar.

create or replace function public.update_profile_self(
  p_full_name text,
  p_phone text,
  p_avatar_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avatar_keep constant text := '__KEEP_AVATAR__';
begin
  update public.profiles
     set full_name = coalesce(p_full_name, full_name),
         phone = case when p_phone is null then phone else p_phone end,
         avatar_url = case
            when p_avatar_url = avatar_keep then avatar_url
            when p_avatar_url is null then null
            else p_avatar_url
         end
   where id = auth.uid();
end;
$$;

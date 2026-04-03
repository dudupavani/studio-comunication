-- Base do módulo de chats (tabelas + RLS)

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'chat_type'
  ) then
    create type public.chat_type as enum ('direct', 'group', 'broadcast');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'chat_member_role'
  ) then
    create type public.chat_member_role as enum ('admin', 'member');
  end if;
end$$;

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text null,
  type public.chat_type not null,
  allow_replies boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  id bigserial primary key,
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.chat_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint chat_members_unique_chat_user unique (chat_id, user_id)
);

create table if not exists public.chat_messages (
  id bigserial primary key,
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  attachments jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chats_org_created on public.chats(org_id, created_at desc);
create index if not exists idx_chats_created_by on public.chats(created_by);
create index if not exists idx_chat_members_user on public.chat_members(user_id, joined_at desc);
create index if not exists idx_chat_messages_chat_created on public.chat_messages(chat_id, created_at desc);
create index if not exists idx_chat_messages_sender_created on public.chat_messages(sender_id, created_at desc);

create or replace function public.is_chat_member(p_chat_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_members cm
    where cm.chat_id = p_chat_id
      and cm.user_id = p_user_id
  );
$$;

create or replace function public.is_chat_admin(p_chat_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_members cm
    where cm.chat_id = p_chat_id
      and cm.user_id = p_user_id
      and cm.role = 'admin'
  );
$$;

grant execute on function public.is_chat_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_chat_admin(uuid, uuid) to authenticated, service_role;

alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chats_select_member on public.chats;
create policy chats_select_member
  on public.chats
  for select
  using (
    public.is_chat_member(chats.id, auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chats_insert_manager on public.chats;
create policy chats_insert_manager
  on public.chats
  for insert
  with check (
    auth.uid() = created_by
    and (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
      or exists (
        select 1
        from public.org_members om
        where om.user_id = auth.uid()
          and om.org_id = chats.org_id
          and om.role in ('org_admin', 'org_master', 'unit_master')
      )
    )
  );

drop policy if exists chats_update_admin on public.chats;
create policy chats_update_admin
  on public.chats
  for update
  using (
    public.is_chat_admin(chats.id, auth.uid())
    or chats.created_by = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  )
  with check (
    public.is_chat_admin(chats.id, auth.uid())
    or chats.created_by = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chats_delete_admin on public.chats;
create policy chats_delete_admin
  on public.chats
  for delete
  using (
    public.is_chat_admin(chats.id, auth.uid())
    or chats.created_by = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chat_members_select_member on public.chat_members;
create policy chat_members_select_member
  on public.chat_members
  for select
  using (
    public.is_chat_member(chat_members.chat_id, auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chat_members_insert_admin on public.chat_members;
create policy chat_members_insert_admin
  on public.chat_members
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
    or (
      (
        public.is_chat_admin(chat_members.chat_id, auth.uid())
        or exists (
          select 1
          from public.chats c
          where c.id = chat_members.chat_id
            and c.created_by = auth.uid()
        )
      )
      and exists (
        select 1
        from public.chats c
        join public.org_members om_target
          on om_target.org_id = c.org_id
         and om_target.user_id = chat_members.user_id
        where c.id = chat_members.chat_id
      )
    )
  );

drop policy if exists chat_members_update_admin on public.chat_members;
create policy chat_members_update_admin
  on public.chat_members
  for update
  using (
    public.is_chat_admin(chat_members.chat_id, auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  )
  with check (
    public.is_chat_admin(chat_members.chat_id, auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chat_members_delete_admin on public.chat_members;
create policy chat_members_delete_admin
  on public.chat_members
  for delete
  using (
    public.is_chat_admin(chat_members.chat_id, auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chat_messages_select_member on public.chat_messages;
create policy chat_messages_select_member
  on public.chat_messages
  for select
  using (
    public.is_chat_member(chat_messages.chat_id, auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'platform_admin'
    )
  );

drop policy if exists chat_messages_insert_member on public.chat_messages;
create policy chat_messages_insert_member
  on public.chat_messages
  for insert
  with check (
    chat_messages.sender_id = auth.uid()
    and (
      public.is_chat_member(chat_messages.chat_id, auth.uid())
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.global_role = 'platform_admin'
      )
    )
  );

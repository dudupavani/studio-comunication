-- Infraestrutura central de notificações e push

-- Enum de tipos de notificação
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'chat.message',
      'chat.mention',
      'announcement.sent',
      'designer.asset_ready',
      'calendar.event_created'
    );
  end if;
end$$;

-- Fonte da verdade de notificações
drop table if exists public.notifications cascade;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  action_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index idx_notifications_org_user_created
  on public.notifications (org_id, user_id, created_at desc);
create index idx_notifications_user_unread
  on public.notifications (user_id, read_at, created_at desc);
create index idx_notifications_org_read
  on public.notifications (org_id, read_at);

alter table public.notifications enable row level security;

-- Seleção: usuário dono ou administradores da organização
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select using (
  notifications.user_id = auth.uid()
  or exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = notifications.org_id
      and om.role in ('org_admin', 'org_master')
  )
);

-- Atualização: apenas o usuário pode marcar como lida/não lida
drop policy if exists notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications
for update using (notifications.user_id = auth.uid())
with check (notifications.user_id = auth.uid());

-- Publicação para realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end$$;

-- Tabela de subscriptions para futuro push (PWA)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_len check (char_length(endpoint) <= 2048)
);

create unique index if not exists idx_push_subscriptions_user_endpoint
  on public.push_subscriptions(user_id, endpoint);
create index if not exists idx_push_subscriptions_org on public.push_subscriptions(org_id);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
for select using (
  push_subscriptions.user_id = auth.uid()
  and exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = push_subscriptions.org_id
  )
);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
for insert with check (
  push_subscriptions.user_id = auth.uid()
  and exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = push_subscriptions.org_id
  )
);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
for update using (
  push_subscriptions.user_id = auth.uid()
  and exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = push_subscriptions.org_id
  )
)
with check (
  push_subscriptions.user_id = auth.uid()
  and exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = push_subscriptions.org_id
  )
);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
for delete using (
  push_subscriptions.user_id = auth.uid()
  and exists (
    select 1
    from public.org_members om
    where om.user_id = auth.uid()
      and om.org_id = push_subscriptions.org_id
  )
);

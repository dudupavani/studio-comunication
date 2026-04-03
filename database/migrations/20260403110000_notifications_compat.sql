-- Compatibilidade da tabela notifications com o contrato atual da aplicação
-- Preserva dados legados e adiciona colunas necessárias para chat/inbox modernos.

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

alter table if exists public.notifications
  add column if not exists org_id uuid references public.orgs(id) on delete cascade,
  add column if not exists type public.notification_type,
  add column if not exists body text,
  add column if not exists action_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz null;

-- Backfill mínimo para manter comportamento previsível no inbox/chat.
update public.notifications
set body = coalesce(body, message)
where body is null;

update public.notifications n
set org_id = om.org_id
from public.org_members om
where n.org_id is null
  and om.user_id = n.user_id;

update public.notifications
set type = 'announcement.sent'::public.notification_type
where type is null;

update public.notifications
set action_url = '/inbox'
where action_url is null;

update public.notifications
set read_at = created_at
where read_at is null
  and read is true;

create index if not exists idx_notifications_org_user_created
  on public.notifications (org_id, user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, read_at, created_at desc);
create index if not exists idx_notifications_org_read
  on public.notifications (org_id, read_at);

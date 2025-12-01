-- Notificações automáticas para mensagens de chat

create or replace function public.handle_chat_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat record;
  v_title text;
  v_snippet text;
begin
  select id, name, org_id
    into v_chat
  from public.chats
  where id = new.chat_id;

  if not found then
    return new;
  end if;

  v_title := coalesce(nullif(trim(v_chat.name), ''), 'Chat');

  v_snippet := trim(regexp_replace(coalesce(new.message, ''), '\s+', ' ', 'g'));
  if v_snippet is null or v_snippet = '' then
    v_snippet := 'Nova mensagem no chat';
  elsif char_length(v_snippet) > 160 then
    v_snippet := left(v_snippet, 160);
  end if;

  insert into public.notifications (
    org_id,
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  )
  select
    v_chat.org_id,
    cm.user_id,
    'chat.message'::public.notification_type,
    v_title,
    v_snippet,
    '/chats/' || new.chat_id,
    jsonb_build_object(
      'chat_id', new.chat_id,
      'message_id', new.id,
      'sender_id', new.sender_id,
      'org_id', v_chat.org_id,
      'snippet', v_snippet
    )
  from public.chat_members cm
  where cm.chat_id = new.chat_id
    and cm.user_id is not null
    and cm.user_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists chat_message_notifications on public.chat_messages;

create trigger chat_message_notifications
after insert on public.chat_messages
for each row execute function public.handle_chat_message_notifications();

-- Função utilitária para mapear notificações de chats não lidas
create or replace function public.get_unread_chat_notifications(p_user_id uuid)
returns table (
  chat_id uuid,
  unread_count integer,
  last_notification_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    (metadata ->> 'chat_id')::uuid as chat_id,
    count(*)::integer as unread_count,
    max(created_at) as last_notification_at
  from public.notifications
  where user_id = p_user_id
    and type = 'chat.message'
    and read_at is null
    and metadata ? 'chat_id'
  group by (metadata ->> 'chat_id');
$$;

grant execute on function public.get_unread_chat_notifications(uuid) to authenticated, service_role;

-- Ajusta a função para ignorar menções inválidas ao invés de falhar toda a mensagem
create or replace function public.create_chat_message_with_mentions(
  p_chat_id uuid,
  p_message text,
  p_attachments jsonb default null,
  p_mentions jsonb default '[]'::jsonb
) returns public.chat_messages
language plpgsql
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_message public.chat_messages;
  v_item jsonb;
  v_type text;
  v_user uuid;
  v_label text;
begin
  if v_sender is null then
    raise exception 'missing_auth';
  end if;

  if not exists (
    select 1 from public.chat_members cm
    where cm.chat_id = p_chat_id and cm.user_id = v_sender
  ) then
    raise exception 'not_chat_member';
  end if;

  insert into public.chat_messages (chat_id, sender_id, message, attachments)
  values (p_chat_id, v_sender, coalesce(p_message, ''), p_attachments)
  returning * into v_message;

  if jsonb_typeof(p_mentions) = 'array' then
    for v_item in select * from jsonb_array_elements(p_mentions)
    loop
      v_type := lower(coalesce(v_item->>'type', ''));
      v_label := nullif(trim(coalesce(v_item->>'label', '')), '');

      if v_type = 'all' then
        insert into public.chat_message_mentions (message_id, type, mentioned_user_id, raw_label)
        values (v_message.id, 'all', null, v_label);
      elsif v_type = 'user' then
        v_user := nullif(v_item->>'userId', '')::uuid;
        if v_user is null then
          continue;
        end if;

        if not exists (
          select 1
          from public.chat_members cm
          where cm.chat_id = p_chat_id
            and cm.user_id = v_user
        ) then
          continue;
        end if;

        insert into public.chat_message_mentions (message_id, type, mentioned_user_id, raw_label)
        values (v_message.id, 'user', v_user, v_label);
      end if;
    end loop;
  end if;

  return v_message;
end;
$$;

-- Tabela de menções em mensagens de chat
create table if not exists public.chat_message_mentions (
  id bigserial primary key,
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  type text not null check (type in ('user', 'all')),
  mentioned_user_id uuid null,
  raw_label text null,
  created_at timestamptz not null default now(),
  constraint chat_message_mentions_user_check check (
    (type = 'user' and mentioned_user_id is not null)
    or (type = 'all' and mentioned_user_id is null)
  )
);

create index if not exists idx_chat_message_mentions_message on public.chat_message_mentions(message_id);
create index if not exists idx_chat_message_mentions_user on public.chat_message_mentions(mentioned_user_id) where mentioned_user_id is not null;

-- RLS
alter table public.chat_message_mentions enable row level security;

drop policy if exists chat_message_mentions_select_members on public.chat_message_mentions;
create policy chat_message_mentions_select_members on public.chat_message_mentions
for select using (
  exists (
    select 1
    from public.chat_messages m
    join public.chat_members cm on cm.chat_id = m.chat_id
    where m.id = chat_message_mentions.message_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists chat_message_mentions_insert_members on public.chat_message_mentions;
create policy chat_message_mentions_insert_members on public.chat_message_mentions
for insert with check (
  exists (
    select 1
    from public.chat_messages m
    join public.chat_members cm on cm.chat_id = m.chat_id
    where m.id = chat_message_mentions.message_id
      and cm.user_id = auth.uid()
  )
  and (
    chat_message_mentions.type <> 'user'
    or exists (
      select 1
      from public.chat_messages m2
      join public.chat_members cm2 on cm2.chat_id = m2.chat_id
      where m2.id = chat_message_mentions.message_id
        and cm2.user_id = chat_message_mentions.mentioned_user_id
    )
  )
);

-- Função para inserir mensagem + menções em transação
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
          raise exception 'invalid_mention_user';
        end if;
        if not exists (
          select 1 from public.chat_members cm
          where cm.chat_id = p_chat_id and cm.user_id = v_user
        ) then
          raise exception 'mentioned_user_not_in_chat';
        end if;

        insert into public.chat_message_mentions (message_id, type, mentioned_user_id, raw_label)
        values (v_message.id, 'user', v_user, v_label);
      end if;
    end loop;
  end if;

  return v_message;
end;
$$;

grant execute on function public.create_chat_message_with_mentions(uuid, text, jsonb, jsonb) to authenticated, service_role;

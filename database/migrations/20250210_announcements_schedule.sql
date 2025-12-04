-- Agendamento de comunicados e vínculo com calendário

alter table public.announcements
add column if not exists send_at timestamptz null,
add column if not exists sent_at timestamptz null,
add column if not exists status text not null default 'sent',
add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete set null;

-- Estado limitado
alter table public.announcements
add constraint announcements_status_check
check (status in ('scheduled', 'sent'));

-- Índice para buscar agendados
create index if not exists idx_announcements_status_send_at
  on public.announcements (status, send_at)
  where status = 'scheduled';

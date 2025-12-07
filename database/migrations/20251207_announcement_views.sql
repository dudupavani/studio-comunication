-- Registra visualizações de comunicados por usuário

create table if not exists public.announcement_views (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  opened_at timestamptz not null default now()
);

create index if not exists idx_announcement_views_announcement on public.announcement_views(announcement_id);
create index if not exists idx_announcement_views_user on public.announcement_views(user_id);
create index if not exists idx_announcement_views_org_opened on public.announcement_views(org_id, opened_at desc);


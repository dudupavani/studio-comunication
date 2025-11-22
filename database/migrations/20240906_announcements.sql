-- Infraestrutura de comunicados

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  allow_comments boolean not null default true,
  allow_reactions boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_recipients (
  id bigserial primary key,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  org_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.user_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint announcement_recipient_target check (user_id is not null or group_id is not null)
);

create unique index if not exists idx_announcement_recipient_user_unique
  on public.announcement_recipients (announcement_id, user_id)
  where user_id is not null;

create unique index if not exists idx_announcement_recipient_group_unique
  on public.announcement_recipients (announcement_id, group_id)
  where group_id is not null;

create table if not exists public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_announcement_comments_unique
  on public.announcement_comments (announcement_id, author_id);

create table if not exists public.announcement_reactions (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint announcement_reactions_pk primary key (announcement_id, author_id, emoji)
);

create index if not exists idx_announcement_recipients_org on public.announcement_recipients(org_id);
create index if not exists idx_announcement_recipients_user on public.announcement_recipients(user_id);
create index if not exists idx_announcement_recipients_group on public.announcement_recipients(group_id);
create index if not exists idx_announcements_org_created on public.announcements(org_id, created_at desc);
create index if not exists idx_announcement_comments_announcement on public.announcement_comments(announcement_id);
create index if not exists idx_announcement_reactions_announcement on public.announcement_reactions(announcement_id);

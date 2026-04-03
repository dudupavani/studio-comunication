-- Suporte de mídia para transformar comunicados em posts de feed.
-- V1 usa apenas image; video fica preparado para V2.

alter table public.announcements
add column if not exists media_kind text null,
add column if not exists media_url text null,
add column if not exists media_thumbnail_url text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcements_media_kind_check'
  ) then
    alter table public.announcements
      add constraint announcements_media_kind_check
      check (media_kind is null or media_kind in ('image', 'video'));
  end if;
end $$;

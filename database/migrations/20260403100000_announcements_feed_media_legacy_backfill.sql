-- Backfill de mídia para comunicados legados.
-- Se o conteúdo já possui uma imagem embutida no HTML, ela vira a mídia do post.
-- Comunicados sem imagem continuam válidos e permanecem sem mídia.

with extracted_media as (
  select
    id,
    nullif(
      substring(content from '<img[^>]+src=["'']([^"''>]+)["'']'),
      ''
    ) as first_image_url
  from public.announcements
  where media_url is null
)
update public.announcements as announcements
set
  media_kind = coalesce(announcements.media_kind, 'image'),
  media_url = extracted_media.first_image_url,
  media_thumbnail_url = coalesce(
    announcements.media_thumbnail_url,
    extracted_media.first_image_url
  )
from extracted_media
where announcements.id = extracted_media.id
  and extracted_media.first_image_url is not null;

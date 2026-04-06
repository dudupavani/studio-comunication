-- Normaliza dados legados de publicações para reduzir falhas de leitura.
-- 1) Corrige org_id de community_space_posts com base no espaço/comunidade.
-- 2) Remove cover_url assinada antiga quando cover_path já existe.

-- Preferência por org_id do espaço (mais específico).
update community_space_posts as post
set org_id = space.org_id
from community_spaces as space
where post.space_id = space.id
  and post.community_id = space.community_id
  and post.org_id is distinct from space.org_id;

-- Fallback para registros sem correspondência por espaço.
update community_space_posts as post
set org_id = community.org_id
from communities as community
where post.community_id = community.id
  and post.org_id is null;

-- Quando o arquivo existe no storage (cover_path), a URL deve ser reassinada em runtime.
update community_space_posts
set cover_url = null
where cover_path is not null
  and btrim(cover_path) <> ''
  and cover_url is not null;

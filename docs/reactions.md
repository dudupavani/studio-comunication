# Arquitetura de Reações

## Objetivo

Padronizar reações para múltiplos módulos com um núcleo único de dados e uma camada de vínculo por recurso, evitando proliferação de tabelas `*_reactions` por módulo.

## Modelo oficial

- Núcleo compartilhado:
  - `reaction_targets`
  - `reactions`
  - `reaction_counters`
- Vínculo por módulo:
  - `community_space_post_reaction_targets` (publicações de comunidades)

## Responsabilidades por tabela

- `reaction_targets`
  - identifica o recurso reagível
  - define escopo de tenant (`org_id`) e tipo (`target_kind`)
  - controla habilitação via `allow_reactions`
- `reactions`
  - armazena a reação individual por usuário
  - garante idempotência por `UNIQUE (target_id, user_id, emoji)`
- `reaction_counters`
  - materializa contagem por `target_id + emoji`
  - otimiza leitura de feed/listagens
- `community_space_post_reaction_targets`
  - mapeia `community_space_posts.id -> reaction_targets.id`
  - mantém contexto de `org_id`, `community_id`, `space_id`

## Fluxo de aplicação

1. Endpoint valida auth, org e acesso ao recurso do módulo.
2. Resolve `target_id` via tabela de vínculo do módulo.
3. Confere `allow_reactions` em `reaction_targets`.
4. Executa toggle em `reactions` (insert/delete).
5. Triggers mantêm `reaction_counters` sincronizado.
6. Feed/carregamento de detalhe retorna `count + reacted` para UI.

## Implementação atual (comunidades)

- API toggle:
  - `src/app/api/communities/[communityId]/spaces/[spaceId]/posts/[postId]/reactions/route.ts`
- Feed com hidratação de reação:
  - `src/app/api/communities/[communityId]/feed/route.ts`
- Detalhe da publicação com reação:
  - `src/app/api/communities/[communityId]/spaces/[spaceId]/posts/[postId]/route.ts`
- Camada de domínio:
  - `src/lib/reactions/core.ts`
  - `src/lib/communities/post-reactions.ts`
  - `src/lib/communities/post-access.ts`

## Regras para novos módulos

- Não criar `*_reactions` por módulo como padrão.
- Criar somente tabela de vínculo `*_reaction_targets`.
- Reaproveitar o core (`reaction_targets`, `reactions`, `reaction_counters`).
- Garantir validação de tenant e permissão no endpoint antes de mutar reação.
- Atualizar migration + `src/types/supabase.ts` em conjunto.

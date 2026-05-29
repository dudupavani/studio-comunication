---
description: Arquitetura de reações — núcleo compartilhado, tabelas de vínculo e regras de implementação
globs:
  - "src/lib/reactions/**"
  - "src/app/api/**/reactions/**"
  - "database/migrations/**"
alwaysApply: false
---

# Arquitetura de Reações

## Objetivo

Padronizar reações para múltiplos módulos com um núcleo único de dados e uma camada de vínculo por recurso, evitando proliferação de tabelas `*_reactions` por módulo.

## Modelo oficial

- Núcleo compartilhado:
  - `reaction_targets`: identifica o recurso reagível, define escopo de tenant (`org_id`), tipo (`target_kind`) e flag `allow_reactions`
  - `reactions`: armazena a reação individual por usuário; idempotência por `UNIQUE (target_id, user_id, emoji)`
  - `reaction_counters`: materializa contagem por `target_id + emoji` para leitura performática
- Vínculo por módulo:
  - `community_space_post_reaction_targets`: mapeia `community_space_posts.id -> reaction_targets.id`

## Fluxo de aplicação

1. Endpoint valida auth, org e acesso ao recurso do módulo.
2. Resolve `target_id` via tabela de vínculo do módulo.
3. Confere `allow_reactions` em `reaction_targets`.
4. Executa toggle em `reactions` (insert/delete).
5. Triggers mantêm `reaction_counters` sincronizado.
6. Feed/carregamento de detalhe retorna `count + reacted` para UI.

## Camada de código atual

- Core compartilhado: `src/lib/reactions/core.ts`
- Integração de comunidades: `src/lib/communities/post-reactions.ts`
- Acesso/permissão de post: `src/lib/communities/post-access.ts`
- Endpoint de toggle para publicações: `src/app/api/communities/[communityId]/spaces/[spaceId]/posts/[postId]/reactions/route.ts`

## Regras para novos módulos

- Não criar `*_reactions` por módulo como padrão.
- Criar somente tabela de vínculo `*_reaction_targets` para o novo recurso.
- Reaproveitar o core (`reaction_targets`, `reactions`, `reaction_counters`).
- Garantir validação de tenant e permissão no endpoint antes de mutar reação.
- Atualizar migration + `src/types/supabase.ts` em conjunto.

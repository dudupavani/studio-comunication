# Etapa 07 - Extrair `use-communities-data`

## Objetivo

Separar fetch/mutações de comunidade/espaço da camada de apresentação.

## O que precisa ser feito

- Criar `use-communities-data.ts` em `src/app/(app)/comunidades/components`.
- Mover para o hook:
  - `reloadCommunities`
  - `reloadCommunityDetail`
  - `handleCreateCommunity`, `handleUpdateCommunity`, `handleDeleteCommunity`
  - `handleCreateSpace`, `handleUpdateSpace`, `handleDeleteSpace`
  - estado de loading/saving/deleting
- Retornar API do hook para consumo do módulo orquestrador.
- Manter `router` e `toast` no contrato do hook (injeção por parâmetro ou uso interno, conforme padrão local).

## Comportamento esperado

- Mesmas chamadas de API e mensagens de erro/sucesso.
- Mesma regra de seleção inicial e navegação de fallback.

## Como agrega na próxima etapa

Com dados e UI separados, a etapa seguinte simplifica o módulo principal para composição pura.

## Critérios de aceite

- Sem lógica de fetch/mutação extensa em `communities-module.tsx`.
- Fluxo completo de CRUD de comunidade/espaço intacto.


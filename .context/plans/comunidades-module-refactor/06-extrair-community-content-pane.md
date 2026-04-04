# Etapa 06 - Extrair `community-content-pane`

## Objetivo

Isolar a coluna direita (topbar + conteúdo feed/empty/detail) em componente específico.

## O que precisa ser feito

- Criar `community-content-pane.tsx` em `src/app/(app)/comunidades/components`.
- Mover:
  - header da coluna direita (ordenação + menu de ações)
  - renderização condicional de loading/empty/feed/eventos
  - gatilho de abertura do composer (`Criar a primeira publicação`)
- Manter integração com ações de comunidade/espaço (editar/remover).

## Comportamento esperado

- Estado empty de publicações com o componente `Empty` permanece igual.
- Estados de loading e eventos continuam iguais.
- Abertura do composer mantém fluxo atual.

## Como agrega na próxima etapa

Com sidebar e content separados, o `communities-module.tsx` fica pronto para receber hook de dados sem ruído de layout.

## Critérios de aceite

- Comportamento da coluna direita equivalente ao estado atual.
- Arquivo principal sem JSX extenso de conteúdo.


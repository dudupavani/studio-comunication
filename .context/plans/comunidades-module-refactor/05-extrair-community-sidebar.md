# Etapa 05 - Extrair `community-sidebar`

## Objetivo

Separar toda a coluna esquerda (navegação da comunidade) em componente próprio.

## O que precisa ser feito

- Criar `community-sidebar.tsx` em `src/app/(app)/comunidades/components`.
- Mover:
  - header da comunidade
  - botão de trocar comunidade
  - botão Feed
  - lista de spaces
  - seção de links
  - ações de criação de espaço
- Preservar regras visuais atuais (incluindo remoção do badge de tipo no item de espaço).

## Comportamento esperado

- Navegação entre feed/space mantém as mesmas rotas.
- Estados de loading e seleção continuam idênticos.
- Mesma hierarquia visual da sidebar.

## Como agrega na próxima etapa

Deixa a área de conteúdo da direita isolada para extração sem conflito de props da sidebar.

## Critérios de aceite

- `communities-module.tsx` apenas renderiza `<CommunitySidebar ... />`.
- Nenhuma regressão de navegação lateral.


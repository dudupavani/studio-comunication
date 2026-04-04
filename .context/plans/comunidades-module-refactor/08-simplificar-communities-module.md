# Etapa 08 - Simplificar `communities-module.tsx`

## Objetivo

Concluir a transformação do arquivo principal em orquestrador leve.

## O que precisa ser feito

- Manter em `communities-module.tsx` apenas:
  - wiring de hooks
  - composição dos componentes extraídos
  - callbacks de integração entre blocos
- Reduzir imports diretos de componentes de baixo nível do módulo principal.
- Remover funções/tipos residuais que ficaram após extrações.

## Comportamento esperado

- Comportamento de ponta a ponta preservado.
- Nenhuma mudança visual deliberada.

## Como agrega na próxima etapa

Deixa base limpa para hardening final, revisão e documentação.

## Critérios de aceite

- Arquivo principal focado em composição.
- Complexidade e tamanho significativamente menores.


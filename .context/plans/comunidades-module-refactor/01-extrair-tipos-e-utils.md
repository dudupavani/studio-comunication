# Etapa 01 - Extrair Tipos e Utilitários

## Objetivo

Isolar tipos e funções puras para reduzir ruído do componente principal e preparar as próximas extrações.

## O que precisa ser feito

- Criar `src/app/(app)/comunidades/components/types.ts` com:
  - tipos de comunidade/espaço/payloads
  - tipos do composer (`PublicationComposerBlock`)
  - tipos de props dos componentes que serão extraídos
- Criar `src/app/(app)/comunidades/components/publication-composer-utils.ts` com funções puras:
  - `createComposerBlockId`
  - `formatFileSize`
  - `extractFileExtension`
  - `isBlockedAttachment`
  - utilitários de crop (ex.: `centerAspectCrop`)
- Atualizar imports no `communities-module.tsx` para usar os novos arquivos.

## Comportamento esperado

- Nenhuma mudança visual ou funcional.
- Apenas reorganização de código.

## Como agrega na próxima etapa

Padroniza contratos de tipo e evita duplicação quando os dialogs forem extraídos em arquivos próprios.

## Critérios de aceite

- Arquivo principal menor e sem funções utilitárias grandes inline.
- Typecheck sem novos erros introduzidos nesta etapa.


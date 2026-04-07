# Etapa 03 - Extrair `publication-composer-modal`

## Objetivo

Isolar toda a árvore de UI do modal de criação de publicação em um componente específico.

## O que precisa ser feito

- Criar `publication-composer-modal.tsx` em `src/app/(app)/comunidades/components`.
- Mover marcação/renderização de:
  - `ExpandableModal`
  - crop da capa
  - dialog de imagem
  - dialog de anexo
  - lista de blocos e footer de ações
- Definir props explícitas para:
  - estado do modal
  - estado de drafts
  - handlers (upload, insert, remove, close/reset)
  - flags de loading e permissões de ação

## Comportamento esperado

- Fluxo visual do composer deve ser idêntico.
- Continuar abrindo com título + bloco de texto inicial.
- Não reintroduzir badges/estruturas removidas por decisão de produto.

## Como agrega na próxima etapa

Componente isolado permite mover a lógica de estado para hook dedicado sem “quebrar” render.

## Critérios de aceite

- O arquivo principal só instancia `<PublicationComposerModal ... />`.
- Funcionalidade de capa, imagem e anexo continua operacional.


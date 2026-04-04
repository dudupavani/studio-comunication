# Etapa 04 - Extrair `use-publication-composer`

## Objetivo

Mover a lógica complexa do composer para hook dedicado e reaproveitável.

## O que precisa ser feito

- Criar `use-publication-composer.ts` em `src/app/(app)/comunidades/components`.
- Encapsular no hook:
  - estados de título, capa e blocos
  - estados de dialogs/drafts
  - lógica de crop e preview
  - upload/delete via rota de uploads
  - regras de habilitação de publicar
  - limpeza de arquivos órfãos no fechamento
- Expor API do hook com contrato claro para o componente modal.

## Comportamento esperado

- Zero mudança de UX.
- Mesma validação de anexos proibidos.
- Mesma estratégia de upload privado e URL assinada.

## Como agrega na próxima etapa

Com a lógica do composer isolada, fica seguro extrair layout lateral e conteúdo sem carregar estado demais no arquivo principal.

## Critérios de aceite

- `communities-module.tsx` não contém mais lógica detalhada de composer.
- `publication-composer-modal.tsx` recebe apenas props e handlers do hook.


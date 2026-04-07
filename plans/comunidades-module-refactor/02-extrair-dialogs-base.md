# Etapa 02 - Extrair Dialogs Base (Seleção/CRUD)

## Objetivo

Remover do monólito os dialogs de seleção e formulários de comunidade/espaço, mantendo o comportamento atual.

## O que precisa ser feito

- Extrair para arquivos dedicados em `src/app/(app)/comunidades/components`:
  - `community-selection-dialog.tsx`
  - `community-form-dialog.tsx`
  - `space-form-dialog.tsx`
- Mover os tipos de props desses componentes para `types.ts` quando fizer sentido.
- Preservar as validações já existentes e mensagens de erro/sucesso.

## Comportamento esperado

- Abrir/fechar dialog deve continuar igual.
- Fluxo de criação/edição/exclusão deve permanecer idêntico.
- Toasts e estados de loading não mudam.

## Como agrega na próxima etapa

Libera foco do arquivo principal para extração do composer de publicação, sem misturar responsabilidades de gestão de comunidade.

## Critérios de aceite

- `communities-module.tsx` usa os novos componentes por import.
- Nenhuma regressão em abertura, submit e cancelamento dos dialogs.


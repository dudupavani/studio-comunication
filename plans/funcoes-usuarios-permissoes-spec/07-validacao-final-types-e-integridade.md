# 07 - Validacao final, types e integridade

## Contexto

Esta etapa fecha a feature garantindo tipos Supabase, typecheck, graphify e consistencia entre todas as micro-specs.

## Objetivo da etapa

Validar que a implementacao final preserva a spec macro, atualiza os tipos necessarios e passa verificacoes obrigatorias.

## Relacao com o todo

Todas as etapas anteriores produzem partes da feature. Esta etapa garante que o conjunto e funcionalmente equivalente a spec original.

## Escopo

- Atualizar `src/types/supabase.ts` quando novas tabelas forem adicionadas.
- Garantir reexports em `src/lib/supabase/types.ts` quando aplicavel.
- Rodar `npm run typecheck -- --pretty false`.
- Rodar `graphify update .` apos modificar codigo, se `graphify-out/graph.json` existir.
- Validar que nenhum requisito critico foi perdido.
- Validar que nenhuma alteracao tocou `src/app/(app)/comunicados`.
- Validar que `components/ui` primitives nao foram alterados.

## Nao pode quebrar

- `src/types/supabase.ts` e a unica fonte do tipo `Database`.
- `src/lib/supabase/types.ts` apenas reexporta `Database/Json/Tables/Enums`.
- Antes de entregar mudancas em schema Supabase, rodar `npm run typecheck -- --pretty false` e garantir limpo.
- Apos modificar arquivos de codigo nesta sessao, rodar `graphify update .` quando `graphify-out/graph.json` existir.
- O modulo arquivado `src/app/(app)/comunicados` fica fora do escopo.
- Nao customizar componentes da pasta `components/ui`.

## Requisitos criticos aplicaveis

- `src/types/supabase.ts` e reexports em `src/lib/supabase/types.ts` devem ser atualizados se novas tabelas forem adicionadas.
- Rodar `npm run typecheck -- --pretty false` antes da entrega.
- Rodar `graphify update .` apos modificar codigo, se `graphify-out/graph.json` existir.
- UI usa componentes shadcn locais sem alterar `components/ui`.
- Alteracoes em `src/app/(app)/comunicados` ficam fora do escopo.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `src/types/supabase.ts`
- `src/lib/supabase/types.ts`
- `src/components/ui`
- `src/app/(app)/comunicados`
- `graphify-out/graph.json`

## Resultado esperado

Feature validada de ponta a ponta, com tipos atualizados e verificacoes obrigatorias executadas.

## Criterios de aceite

- Tipos Supabase refletem novas tabelas.
- Reexports de Supabase continuam corretos.
- `npm run typecheck -- --pretty false` passa limpo.
- `graphify update .` foi executado quando aplicavel.
- Nenhum primitive de `src/components/ui` foi customizado.
- Nenhum arquivo em `src/app/(app)/comunicados` foi alterado.
- Todos os criterios de aceite da spec macro permanecem verificaveis.

## Dependencias

Depende das etapas 01, 02, 03, 04, 05 e 06.

## Rastreabilidade

Atende R14, R48, R75-R77 e valida a preservacao de R1-R74.

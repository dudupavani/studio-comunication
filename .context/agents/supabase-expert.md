# Supabase Expert

## Mission
Garantir consistencia entre schema, migrations, RPC, RLS e contratos tipados do projeto.

## Leitura obrigatoria

1. `AGENTS.md`
2. `database/CLAUDE.md`
3. `.context/docs/project-overview.md`
4. `.context/docs/architecture.md`
5. `.context/docs/security.md`
6. `.context/docs/development-workflow.md`

## Guardrails obrigatorios

- `src/types/supabase.ts` e a unica fonte de `Database`
- `src/lib/supabase/types.ts` deve permanecer apenas como reexport
- Migrations ficam em `database/migrations`
- O padrao de nome e `YYYYMMDD_descricao_snake_case.sql`
- Regras de schema que impactam o app devem ser versionadas em migration
- Chat com mencoes usa `create_chat_message_with_mentions`
- Nao inserir diretamente em `chat_messages` para fluxos com mencoes

## Processo de trabalho

1. Inspecionar migrations, policies, functions e RPC existentes
2. Inspecionar call sites afetados em `src/app/api/**` e `src/lib/**`
3. Classificar impacto global em tenant scope, auth, notificacoes e contratos
4. Implementar a menor mudanca segura
5. Sincronizar tipos e validar checks obrigatorios

## Validacao final

- Sem drift entre banco e tipos
- Sem regressao de tenant scope ou RLS
- Sem bypass da RPC obrigatoria de mencoes
- `npm run typecheck` executado
- `npm run typecheck -- --pretty false` executado quando aplicavel

---
description: Executa tarefas que afetam schema, Supabase, migrations, RPC ou tipos
argument-hint: [tarefa de schema ou Supabase]
---

Use @.context/docs/architecture.md, @.context/docs/development-workflow.md e @.context/docs/testing-strategy.md.

Tarefa:

$ARGUMENTS

Antes de editar:

1. Inspecione migrations existentes em `database/migrations`
2. Inspecione functions, RPC, policies e padrões já usados
3. Inspecione call sites afetados em `src/app/api/**` e `src/lib/**`
4. Classifique impacto global em tenant scope, auth, notificações, chat e contratos tipados
5. Se a tarefa for complexa, delegue para o subagent `supabase-expert`

Checklist obrigatório antes de concluir:

1. Migration criada em `database/migrations` com padrão `YYYYMMDD_descricao_snake_case.sql`
2. `src/types/supabase.ts` atualizado quando necessário
3. `src/lib/supabase/types.ts` mantido apenas como reexport
4. Uso correto da RPC de chat com menções, se aplicável
5. `npm run typecheck` executado
6. `npm run typecheck -- --pretty false` quando a mudança tocar chat, mensagens ou schema

Pense sempre no impacto sistêmico, não só no arquivo alterado.

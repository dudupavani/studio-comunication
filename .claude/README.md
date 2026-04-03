# Claude Code Layer

Esta pasta operacionaliza a memória do projeto para Claude Code.

## Estrutura

- `commands/`: prompts reutilizáveis para puxar o contexto certo por tipo de tarefa
- `agents/`: subagents especializados alinhados aos playbooks do projeto

## Uso recomendado

- Rode `/preflight` antes de tarefas médias ou grandes.
- Use `/ui-task`, `/schema-task` e `/review-change` conforme o tipo de trabalho.
- Deixe Claude delegar para os subagents quando a tarefa combinar com o papel descrito.
- Para tarefas de schema, RPC, RLS ou tipos Supabase, use o subagent `supabase-expert`.

## Fonte de verdade

- `AGENTS.md` define as regras canônicas.
- `CLAUDE.md` define como Claude deve carregar e aplicar essas regras.
- `.context/docs/*` detalha a aplicação por área.

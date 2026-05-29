@AGENTS.md

# Claude Code

Entry point do Claude Code para o repositório `studio`.

## Regras operacionais

- Módulos arquivados definidos em `AGENTS.md` são tratados como inexistentes por padrão.
- Antes de editar, classifique a tarefa: arquitetura, schema, permissões, UI/UX, AI, risco de regressão.
- Para mudanças simples, `AGENTS.md` é suficiente.
- Para mudanças sensíveis, use os comandos abaixo e delegue para subagents quando cabível.

## Comandos

- `/preflight` — classifica a tarefa e identifica contexto obrigatório antes de implementar
- `/ui-task` — mudanças visuais ou de experiência
- `/schema-task` — mudanças que tocam Supabase, migrations, RPC ou tipos
- `/review-change` — revisão final com foco em arquitetura, segurança e validação

## Subagents

Delegate para `.claude/agents/` quando a tarefa combinar com o papel descrito:

- `supabase-expert` — schema, migrations, RPC, RLS
- `feature-developer` — implementações cross-layer
- `frontend-specialist` — UI e consistência visual
- `code-reviewer` — revisão de mudanças
- `security-auditor` — auth, permissões e tenant scope

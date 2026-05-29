@AGENTS.md

# Claude Code

Entry point do Claude Code para o repositório `studio-comunication`.

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

## Scripts principais

```bash
npm run dev          # next dev --turbopack -p 9002
npm run typecheck    # verificação TypeScript sem build
npm run test         # Jest
npm run test:e2e     # Playwright
npm run lint
npm run build
```

## Ordem de trabalho

1. Leia `AGENTS.md`.
2. Faça a mudança no menor slice possível, preservando boundaries de domínio.
3. Rode os checks compatíveis com o impacto da mudança.
4. Só finalize após validar que não houve regressão de arquitetura, permissão ou UI.

## Checks por tipo de mudança

- UI: comportamento visual, loading, disabled, erro e aderência às regras de `.claude/rules/ui.md`
- API/domínio: input parsing, auth/permissão, códigos HTTP e shape de resposta
- Schema/Supabase: migration + atualização de tipos + `npm run typecheck -- --pretty false`
- Chat/mensagens: confirmar uso da RPC de menções e rodar `npm run typecheck -- --pretty false`
- AI: cliente dedicado, timeout, logging com prefixo e erro genérico para o usuário

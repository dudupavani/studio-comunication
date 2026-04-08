# Qwen — studio

Entry point do Qwen Code para o repositório `studio`.

## Regras canônicas

Leia `AGENTS.md` (raiz) antes de qualquer implementação. Em caso de conflito entre documentos, `AGENTS.md` prevalece.

## Knowledge base compartilhada

`.context/` é a base de conhecimento do projeto. Consulte apenas o doc relevante para a tarefa atual — não carregue tudo proativamente:

| Tarefa | Doc |
|--------|-----|
| UI/UX, componentes, tipografia | `.context/docs/design.md` |
| Arquitetura, boundaries, domínio | `.context/docs/architecture.md` |
| Schema, Supabase, migrations, RPC | `.context/docs/architecture.md` + `.context/docs/development-workflow.md` |
| Segurança, auth, permissões | `.context/docs/security.md` |
| Testes e validação | `.context/docs/testing-strategy.md` |
| Índice completo | `.context/docs/README.md` |

## Agentes especializados

Quando a tarefa exigir especialização, carregue o agente relevante de `.context/agents/`:

- `supabase-expert.md` — schema, migrations, RPC, RLS
- `feature-developer.md` — implementações cross-layer
- `frontend-specialist.md` — UI e consistência visual
- `code-reviewer.md` — revisão de mudanças
- `security-auditor.md` — auth, permissões e tenant scope

## Regras operacionais

- Módulos arquivados listados em `AGENTS.md` são tratados como inexistentes por padrão.
- Antes de editar, classifique a tarefa: arquitetura, schema, permissões, UI/UX, AI, risco de regressão.
- Prefira o menor slice seguro de mudança.
- Para mudanças de schema: migration → push → gen types → typecheck (nessa ordem, sem pular etapas).

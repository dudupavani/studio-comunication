# Context Index

Knowledge base compartilhada do projeto `studio`. Usada por todos os agentes de AI (Claude Code, Codex, Gemini, Qwen).

As regras canônicas e não-negociáveis estão em `AGENTS.md` na raiz do repositório.

## Quando usar cada doc

| Tarefa | Doc |
|--------|-----|
| UI, componentes, tipografia, iconografia | `design.md` |
| Arquitetura, boundaries, módulos, reações | `architecture.md` |
| Schema, Supabase, migrations, RPC, tipos | `architecture.md` + `development-workflow.md` |
| Segurança, auth, permissões, RLS | `security.md` |
| Testes, gates de validação | `testing-strategy.md` |
| Reações — detalhe técnico das tabelas e fluxo | `reactions.md` |
| Scripts, setup e ordem de trabalho | `development-workflow.md` |
| Termos do domínio e glossário | `glossary.md` |
| Stack, ferramentas e convenções operacionais | `tooling.md` |
| Visão geral do projeto e módulos ativos | `project-overview.md` |

## Agentes especializados

Definições de papel em `.context/agents/`:

| Agente | Quando usar |
|--------|-------------|
| `code-reviewer.md` | Revisão após modificações ou por solicitação |
| `feature-developer.md` | Implementações que cruzam rotas, domínio, UI ou schema |
| `frontend-specialist.md` | Mudanças de UI e consistência visual |
| `security-auditor.md` | Auth, permissões, tenant scope, integrações externas |
| `supabase-expert.md` | Schema, migrations, RPC, RLS e contratos tipados |

## Skills reutilizáveis

Disponíveis em `.context/skills/`:

| Skill | Uso |
|-------|-----|
| `break-spec/` | Quebrar especificação em tasks implementáveis |
| `bug-investigation/` | Investigação estruturada de bugs |
| `code-review/` | Revisão de código por área |
| `pr-review/` | Revisão de pull request |
| `refactoring/` | Refatoração segura sem mudança de comportamento |
| `shadcn/` | Adição e composição de componentes shadcn/ui |
| `test-generation/` | Geração de testes para área específica |

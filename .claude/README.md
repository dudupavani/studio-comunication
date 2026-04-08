# Claude Code Layer

Configuração operacional exclusiva do Claude Code para o repositório `studio`.

## Estrutura

- `commands/` — prompts reutilizáveis que carregam o contexto certo por tipo de tarefa
- `agents/` — subagents especializados para delegação pelo Claude Code

## Relação com `.context/`

`.context/` é a knowledge base compartilhada entre todos os agentes (Claude Code, Codex, Gemini, Qwen).
Os agentes em `.claude/agents/` são a versão operacional para Claude Code desses papéis, com frontmatter
e instruções de ferramentas específicas da plataforma. O conteúdo canônico de cada papel vive em `.context/agents/`.

## Uso recomendado

- `/preflight` antes de tarefas médias ou grandes
- `/ui-task`, `/schema-task` e `/review-change` conforme o tipo de trabalho
- Delegue para os subagents quando a tarefa combinar com o papel descrito

## Fonte de verdade

- `AGENTS.md` define as regras canônicas (compartilhadas com todos os agentes)
- `CLAUDE.md` define como o Claude Code carrega e aplica essas regras
- `.context/docs/*` detalha a aplicação por área
- `.context/agents/*` define os papéis de agentes (canônico, multi-agente)

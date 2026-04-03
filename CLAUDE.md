@AGENTS.md
@.context/docs/README.md
@.context/docs/project-overview.md

# Claude Code Project Memory

Este arquivo é a entrada do Claude Code para o repositório `studio`.

## Ordem de leitura

1. Use `AGENTS.md` como fonte canônica das regras do projeto.
2. Use `.context/docs/README.md` como índice da base compartilhada.
3. Use `.context/docs/project-overview.md` para enquadrar a tarefa no contexto global da aplicação.
4. Consulte apenas o doc específico para a tarefa atual:
   - UI/UX: `.context/docs/design.md`
   - fluxo de domínio, API ou schema: `.context/docs/architecture.md`
   - execução e validação local: `.context/docs/development-workflow.md`
   - testes e critérios de verificação: `.context/docs/testing-strategy.md`
   - revisão de segurança, auth e permissões: `.context/docs/security.md`

## Regras operacionais

- `AGENTS.md` vence qualquer conflito com docs auxiliares.
- Use `.context/` como knowledge base compartilhada; não trate a pasta como memória primária nem como repositório de estado.
- Não assuma que snapshots, logs ou planos antigos são válidos; use somente os docs curados mantidos na `.context/docs/`.
- Antes de editar, classifique a tarefa globalmente: arquitetura, domínio, schema, permissões, UI/UX, AI e risco de regressão.
- Para mudanças simples, siga `AGENTS.md` e consulte a `.context` apenas se a tarefa exigir contexto adicional.
- Para mudanças sensíveis, use os comandos em `.claude/commands/` e os subagents em `.claude/agents/`.

## Operação recomendada no Claude Code

- Use `/preflight` para classificar a tarefa e carregar o contexto certo antes de implementar.
- Use `/ui-task` para mudanças visuais ou de experiência.
- Use `/schema-task` para mudanças que tocam banco, Supabase, migrations, RPC ou tipos.
- Use `/review-change` para revisão final com foco em arquitetura, segurança e validação.

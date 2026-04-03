---
description: Executa tarefas de UI seguindo os padrões visuais e arquiteturais do projeto
argument-hint: [tarefa de UI]
---

Use @AGENTS.md, @.context/docs/design.md, @.context/docs/architecture.md e @src/CLAUDE.md.

Tarefa:

$ARGUMENTS

Antes de editar:

1. Identifique a área visual e o domínio impactado
2. Liste os guardrails de UI que não podem ser quebrados
3. Confirme estados de loading, disabled, error e empty state relevantes
4. Verifique se a mudança esconde alguma alteração de domínio, permissão ou contrato

Durante a execução:

- Preserve a linguagem visual existente da área
- Não edite `src/components/ui/*` sem necessidade explícita
- Não crie uma solução local que quebre consistência global

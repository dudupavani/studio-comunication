# Base Compartilhada de Contexto

Esta pasta contém apenas contexto durável e curado para agentes e para o time. `AGENTS.md` continua sendo a fonte canônica das regras do projeto; os docs abaixo detalham como aplicar essas regras no repositório.

## Leia por tipo de tarefa

- UI/UX e revisão visual: [design.md](./design.md)
- Fluxo de domínio, API, schema e boundaries: [architecture.md](./architecture.md)
- Execução local, checks e rotina de entrega: [development-workflow.md](./development-workflow.md)
- Testes e critérios de validação: [testing-strategy.md](./testing-strategy.md)
- Segurança, auth, permissões e isolamento multi-tenant: [security.md](./security.md)
- Stack, scripts e ferramentas do repo: [tooling.md](./tooling.md)
- Contexto de produto e módulos principais: [project-overview.md](./project-overview.md)
- Termos do domínio e convenções recorrentes: [glossary.md](./glossary.md)

## Ordem recomendada

1. `AGENTS.md`
2. [project-overview.md](./project-overview.md)
3. [architecture.md](./architecture.md)
4. Um doc específico conforme a tarefa atual

Regra operacional: antes de implementar, enquadre a tarefa no contexto global da aplicação e só depois desça para o doc específico da área.

## Regras desta base

- Não usar esta pasta para logs, planos temporários, snapshots de codebase ou estado operacional.
- Se um doc aqui divergir de `AGENTS.md`, siga `AGENTS.md` e atualize o doc depois.
- Prefira poucos docs fortes a documentação extensa e genérica.

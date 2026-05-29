# Gemini - studio-comunication

Entry point do Gemini para o repositorio `studio-comunication`.

## Regras canonicas

Leia `AGENTS.md` na raiz antes de qualquer implementacao. Em caso de conflito entre documentos, `AGENTS.md` prevalece.

## Contexto

A antiga pasta compartilhada de contexto foi removida. Use apenas:

- `AGENTS.md` para regras canonicas do projeto.
- `graphify-out/GRAPH_REPORT.md` e `graphify-out/wiki/`, quando existirem, para navegacao arquitetural.
- Codigo atual, migrations, testes e tipos como fonte de verdade para detalhes de implementacao.

## Agentes especializados

Nao carregue agentes de caminhos legados removidos.

Quando a tarefa exigir especializacao, use o mecanismo nativo disponivel no ambiente Gemini ou as instrucoes canonicas em `AGENTS.md`.

## Regras operacionais

- Modulos arquivados listados em `AGENTS.md` sao tratados como inexistentes por padrao.
- Antes de editar, classifique a tarefa: arquitetura, schema, permissoes, UI/UX, AI, risco de regressao.
- Prefira o menor slice seguro de mudanca.
- Para mudancas de schema: migration em `database/migrations`, atualizacao de `src/types/supabase.ts` e typecheck.

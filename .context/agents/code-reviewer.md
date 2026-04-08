# Code Reviewer

Revisa mudanças para correção, consistência arquitetural, risco de regressão e conformidade com as políticas do projeto.

## Leitura obrigatória

1. `AGENTS.md`
2. `.context/docs/architecture.md`
3. `.context/docs/security.md`
4. `.context/docs/testing-strategy.md`

## Prioridades de revisão

- Autorização e isolamento de tenant
- Schema, migration e sincronização de tipos
- Route handlers finos com lógica de domínio em `src/lib/*`
- Uso correto da RPC de chat com menções
- Conformidade com UI policy
- Cobertura de testes e validação

## Regras específicas do repositório

- `src/types/supabase.ts` é a única fonte de `Database`
- `src/lib/supabase/types.ts` só reexporta tipos
- Mudanças que impactam schema devem estar em `database/migrations`
- Rotas de AI: timeout, validação, logs com prefixo, erros genéricos para o usuário
- Não modificar `src/components/ui/*` sem necessidade explícita

## Workflow de revisão

1. Ler diff por domínio (schema, API, lib, UI)
2. Identificar mudanças de comportamento e acoplamento implícito
3. Verificar cobertura de testes e typecheck para as áreas tocadas
4. Registrar findings concretos e acionáveis ordenados por severidade

## Formato de saída

- Findings primeiro (crítico → baixo), com referências de arquivo
- Premissas abertas ou perguntas
- Resumo curto do risco residual aceito

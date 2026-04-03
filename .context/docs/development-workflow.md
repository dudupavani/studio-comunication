# Workflow de Desenvolvimento

## Ordem de trabalho recomendada

1. Leia `AGENTS.md`.
2. Abra o índice em [README.md](./README.md) e consulte o doc específico da tarefa.
3. Faça a mudança no menor slice possível, preservando boundaries de domínio.
4. Rode os checks compatíveis com o impacto da mudança.
5. Só finalize após validar que não houve regressão de arquitetura, permissão ou UI.

## Scripts principais

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
```

## Leitura correta dos scripts

- `npm run dev`: sobe o app com `next dev --turbopack -p 9002`
- `npm run test`: fluxo principal atual com Jest
- `npm run test:e2e`: testes E2E com Playwright
- `npm run typecheck`: verificação TypeScript sem emitir build

## Checks por tipo de mudança

- UI: validar comportamento visual, loading, disabled, erro e aderência a [design.md](./design.md)
- API/domínio: validar input parsing, auth/permissão, códigos HTTP e shape de resposta
- Schema/Supabase: migration + atualização de tipos + `npm run typecheck -- --pretty false`
- Chat/mensagens: confirmar uso da RPC de menções e rodar `npm run typecheck -- --pretty false`
- AI: confirmar cliente dedicado, timeout, logging com prefixo e erro genérico para o usuário

## Regras de entrega

- Não alterar `src/components/ui/*` sem solicitação explícita.
- Não separar migration de atualização de tipos.
- Não fazer mudança de arquitetura escondida dentro de ajuste visual ou correção pequena.
- Se a mudança cruzar domínios, revalidar explicitamente tenant scope e permissões.

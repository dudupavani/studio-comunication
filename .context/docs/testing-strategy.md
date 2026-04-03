# Estratégia de Testes

## Stack atual de verificação

- `npm run test`: suite principal com Jest
- `npm run test:legacy`: harness legado ainda disponível
- `npm run test:e2e`: Playwright para fluxos end-to-end
- `npm run typecheck`: gate base para mudanças significativas

## Gates mínimos

```bash
npm run typecheck
```

Obrigatório para mudanças em chat, mensagens ou schema Supabase:

```bash
npm run typecheck -- --pretty false
```

Para mudanças amplas ou com risco de regressão estrutural:

```bash
npm run test
npm run lint
npm run build
```

## Foco por área

- Auth e permissões: isolamento multi-tenant, matriz de papéis e negação de acesso
- Chat e mensagens: fluxo de menções, visibilidade, destinatários e notificações
- Comunicados: destinatários, comentários, reações, views e métricas
- Calendar: serialização, permissões e update/delete
- Schema: migrations presentes, tipos atualizados e compilação limpa
- UI crítica: loading, disabled, empty/error states e aderência às regras de `design.md`

## Organização atual útil

- `tests/permissions.test.ts`
- `tests/api/calendar.events.route.test.ts`
- `tests/run-tests.ts`
- `e2e/auth-login.spec.ts`

## Critério de revisão

- Toda mudança deve deixar claro quais checks foram executados.
- Se o comportamento mudou e não houver cobertura automatizada viável, isso deve ser registrado como risco residual.

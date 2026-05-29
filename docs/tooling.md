# Tooling

## Stack e ferramentas

- Node.js com scripts via `npm`
- Next.js 16 + React 18 + TypeScript
- ESLint
- Tailwind CSS
- Jest para testes principais
- Playwright para E2E
- Supabase para auth/banco/storage
- Genkit presente para fluxos AI auxiliares

## Comandos úteis

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
npm run start
```

Comandos específicos:

```bash
npm run test:e2e
npm run genkit:dev
npm run genkit:watch
```

## Pastas importantes

- `src/app`: rotas, layouts e páginas
- `src/components`: componentes da aplicação
- `src/hooks`: hooks de UI e integração
- `src/lib`: lógica de domínio, auth, permissões e integrações
- `src/types`: contratos globais, incluindo tipos do Supabase
- `database/migrations`: versionamento de schema
- `tests` e `e2e`: validações automatizadas

## Convenções operacionais

- Ler `AGENTS.md` antes de codar.
- Usar `.context/docs/README.md` só como índice e apoio contextual.
- Preferir mudanças pequenas e localizadas por domínio.
- Rodar `typecheck` cedo quando a mudança toca Supabase, mensagens ou contratos.

# Arquitetura

## Forma geral

O repositório é um monólito modular em Next.js App Router. A aplicação concentra UI, rotas API, lógica de domínio e integrações em um único codebase, com Supabase fornecendo auth, banco, storage, RPC e enforcement de parte das regras via RLS.

Fluxo esperado:

1. UI em `src/app` ou `src/components` dispara action, hook ou chamada para route handler.
2. Route handler valida entrada, resolve auth/permissão e delega a lógica.
3. Módulos em `src/lib/*` aplicam regras de domínio e acessam Supabase ou outros serviços.
4. O resultado volta para UI em formato JSON, props ou estado cliente.

## Boundaries do código

- Apresentação: `src/app`, `src/components`, `src/hooks`
- API: `src/app/api/**/route.ts` e o endpoint legado em `src/pages/api/pdfkit-export.ts`
- Domínio: `src/lib/messages`, `src/lib/notifications`, `src/lib/calendar`, `src/lib/learning`, `src/lib/actions`
- Infra e integrações: `src/lib/supabase`, `src/lib/http`, `src/lib/storage`, `src/lib/ai`
- Tipos e contratos: `src/types`, `src/lib/types`, `src/types/supabase.ts`

## Regras arquiteturais que não devem ser quebradas

- `src/types/supabase.ts` é a única fonte de `Database`; `src/lib/supabase/types.ts` apenas reexporta.
- Mudanças de schema precisam caminhar junto com migrations e atualização de tipos.
- Mensagens de chat com menções devem passar pela RPC `create_chat_message_with_mentions`.
- O inbox centraliza notificações; chat pode ter fluxo próprio, mas não deve conflitar com a infraestrutura base.
- Route handlers devem permanecer finos; regras de negócio e acesso a dados ficam em `src/lib/*`.
- Validação deve ocorrer na borda da aplicação, preferencialmente antes de tocar domínio ou banco.

## Módulos arquivados / fora do escopo padrão

- `src/app/(app)/chats`
- `src/app/(app)/comunicados`
- `src/app/(app)/design-editor`
- `src/app/(app)/learning`
- Código de suporte dedicado primariamente a esses fluxos

Esses módulos permanecem versionados, mas não fazem parte do produto ativo. Não os use como referência para novas implementações e não proponha mudanças neles sem solicitação explícita de reativação ou manutenção.

## Módulos de maior atenção

- Auth e permissão: `src/lib/auth-context.ts`, `src/lib/auth/*`, `src/lib/permissions*`
- Notificações e inbox: `src/lib/notifications/*`
- Inbox e infraestrutura compartilhada de mensagens: `src/lib/messages/*`, `src/app/api/messages/**`
- AI: `src/lib/ai/*`, `src/lib/ai/clients/groq.ts`
- Calendar possui fluxo próprio e não deve ser acoplado sem necessidade

## Como decidir onde mudar

- Se a mudança altera comportamento de negócio, comece pelo módulo em `src/lib/*`.
- Se a mudança é de contrato HTTP, revise também o route handler correspondente.
- Se a mudança toca auth, tenant scope ou lifecycle de usuários, valide impacto em permissões e RLS.
- Se a mudança toca schema, trate migration + types + chamadas Supabase como um conjunto único.

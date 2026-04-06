# Visão Geral do Projeto

`studio` é um app web multi-tenant de comunicação interna e operação organizacional. A aplicação concentra fluxos ativos de inbox/notificações, calendário e gestão organizacional em um único monólito modular com Next.js. Há também módulos arquivados mantidos no repositório apenas para possível reativação futura.

## Módulos principais

- `inbox` e notificações: hub central de notificações e conteúdos recentes.
- `calendar`: eventos e agenda.
- `comunidades` e publicações: feed segmentado, criação de conteúdo e interações.
- `users`, `orgs`, `units`, `teams` e grupos: gestão de estrutura organizacional e lifecycle do usuário.

## Módulos arquivados / ocultos do produto

- `src/app/(app)/chats`
- `src/app/(app)/comunicados`
- `src/app/(app)/design-editor`
- `src/app/(app)/learning`
- Qualquer código de suporte cujo propósito principal seja atender esses fluxos

Esses módulos permanecem no repositório apenas para reativação futura. Para trabalho normal de produto e implementação, trate-os como fora de escopo.

## Stack atual

- Next.js App Router com React 18 e TypeScript.
- Supabase para auth, banco, storage, RPC e RLS.
- Tailwind + Radix no layer de UI, com componentes compartilhados em `src/components/ui`.
- Zod para validação de payloads e contratos nas bordas.
- Jest como runner de testes principal e Playwright para E2E.
- Integrações de AI centralizadas em `src/lib/ai`.

## Regras de domínio que mais afetam implementação

- `src/types/supabase.ts` é a única fonte de verdade para `Database`.
- Toda mudança de schema precisa de migration em `database/migrations`.
- Reações usam arquitetura compartilhada (`reaction_targets`, `reactions`, `reaction_counters`) com tabela de vínculo por módulo.
- Chat com menções deve usar a RPC `create_chat_message_with_mentions`; não inserir direto em `chat_messages`.
- O inbox é a central de notificações; chat é a exceção com comportamento próprio.
- A UI de usuários expõe apenas ações de desativar e remover; exclusão permanente não vai para a UI do cliente.

## Ponto de entrada para agentes

- Regras canônicas: `AGENTS.md`
- Arquitetura e boundaries: [architecture.md](./architecture.md)
- Workflow e validações: [development-workflow.md](./development-workflow.md)
- Regras de UI/UX: [design.md](./design.md)

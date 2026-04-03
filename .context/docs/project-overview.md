# Visão Geral do Projeto

`studio` é um app web multi-tenant de comunicação interna e operação organizacional. A aplicação concentra fluxos de mensagens, notificações, comunicados, calendário, usuários/organizações/unidades, aprendizagem e um editor de design em um único monólito modular com Next.js.

## Módulos principais

- `inbox` e notificações: hub central de notificações e conteúdos recentes.
- `chat`: conversas com menções e comportamento próprio de notificação.
- `comunicados`: envios amplos com destinatários, comentários, reações, visualizações e métricas.
- `calendar`: eventos e agenda.
- `users`, `orgs`, `units`, `teams` e grupos: gestão de estrutura organizacional e lifecycle do usuário.
- `learning`: cursos, módulos, lições, avaliações e revisões.
- `design-editor`: edição visual e arquivos de design.

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
- Chat com menções deve usar a RPC `create_chat_message_with_mentions`; não inserir direto em `chat_messages`.
- O inbox é a central de notificações; chat é a exceção com comportamento próprio.
- A UI de usuários expõe apenas ações de desativar e remover; exclusão permanente não vai para a UI do cliente.

## Ponto de entrada para agentes

- Regras canônicas: `AGENTS.md`
- Arquitetura e boundaries: [architecture.md](./architecture.md)
- Workflow e validações: [development-workflow.md](./development-workflow.md)
- Regras de UI/UX: [design.md](./design.md)

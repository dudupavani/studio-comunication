# Segurança e Permissões

## Modelo de segurança

O app é multi-tenant e depende de controles em camadas:

- auth/permissão na aplicação
- isolamento via RLS no Supabase
- validação de entrada nas bordas
- tipos fortes para reduzir drift de contratos

## Pontos que exigem revisão cuidadosa

- operações que atravessam organização, unidade, equipe ou grupo
- lifecycle de usuários
- rotas que listam ou mutam registros multi-tenant
- fan-out de notificações e outros fluxos multi-tenant com entrega para múltiplos destinatários
- integrações externas de AI

## Regras obrigatórias

- Validar auth e escopo antes de ler ou mutar dados sensíveis.
- Não confiar só na UI para enforcement.
- Não expor stack trace, payload sensível ou segredo em resposta HTTP.
- Não espalhar chamadas brutas de AI; usar cliente dedicado.
- Nunca burlar a RPC de chat com menções.
- Toda mudança de schema deve vir com migration e atualização de `src/types/supabase.ts`.

## Revisão de segurança por tipo de tarefa

- Auth/permissão: conferir `src/lib/auth-context.ts`, `src/lib/auth/*`, `src/lib/permissions*`
- APIs: conferir validação, status code, shape de erro e tenant scope
- Supabase: conferir uso do client correto, tipos e impacto em RLS/policies
- AI: conferir timeout, logs `INTERNAL_AI_ERROR` e `ROUTE_AI_ERROR`, além de erro genérico para o usuário

## Perguntas que o agente deve responder antes de concluir

- Esta mudança pode vazar dados entre tenants?
- O route handler valida payload e auth antes de executar a regra?
- A mudança depende de schema e esqueceu migration ou atualização de tipos?
- Algum erro técnico sensível pode chegar no cliente?

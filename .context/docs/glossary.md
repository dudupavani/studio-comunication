# Glossário

## Domínio de negócio

- Organização (`org`): tenant principal
- Unidade (`unit`): subdivisão operacional dentro da organização
- Team/Group: estruturas de destinatários e colaboração
- Inbox: central de notificações e conteúdos recentes
- Chat: conversas com menções e notificações próprias
- Comunicado: envio amplo com destinatários, comentários, reações, views e métricas (módulo arquivado)
- Publicação de comunidade: conteúdo em `community_space_posts` exibido no feed de comunidades

## Lifecycle de usuário

- `ativo`: acesso normal
- `desativado`: perde acesso, mas histórico permanece
- `removido`: some da organização, mas conta base e histórico continuam
- exclusão permanente: operação interna da plataforma, fora da UI do cliente

## Termos técnicos

- RLS: Row Level Security no Postgres/Supabase
- RPC: função do banco exposta pelo Supabase; no chat, usada para criar mensagem com menções
- `Database`: contrato tipado em `src/types/supabase.ts`
- service client: client elevado para operações privilegiadas
- auth context: contexto resolvido de usuário, tenant e papéis
- `reaction_target`: registro canônico do recurso que pode receber reação
- `reaction_counter`: contador agregado por emoji/alvo para leitura performática

## Convenções recorrentes

- `AGENTS.md`: regra canônica do projeto
- `.context/docs/*`: base compartilhada de apoio
- `CLAUDE.md`: entrada do Claude Code para consumir a base compartilhada
- `components/ui`: primitives compartilhadas que não devem ser customizadas sem pedido explícito

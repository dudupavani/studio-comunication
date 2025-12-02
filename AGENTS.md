## Codex agent rules

- **Supabase schema**
  - `src/types/supabase.ts` é a única fonte do tipo `Database`.
  - `src/lib/supabase/types.ts` apenas reexporta `Database/Json/Tables/Enums` a partir desse arquivo.
  - Sempre que novas tabelas/funções forem adicionadas ao banco, atualize `src/types/supabase.ts` e reexporte delas por `src/lib/supabase/types.ts`.

- **Migrations**
  - Adicione migrations no diretório `database/migrations` (nomes com data ISO).
  - Regras de schema que impactem o app (ex.: tabelas de chats, funções RPC, policies RLS) devem ser versionadas ali.

- **Chats / menções**
  - A tabela `chat_message_mentions` e a RPC `create_chat_message_with_mentions` já existem no banco; use-as para qualquer ajuste de chats.
  - As rotas de chat sempre salvam mensagens via RPC para garantir consistência das menções; não insira direto em `chat_messages`.

- **Typecheck**
  - Antes de entregar mudanças em mensagens/chats ou no schema Supabase, rode `npm run typecheck -- --pretty false` e garanta que está limpo.

- **Notificações / Inbox**
  - A central de notificações é o módulo `inbox`, que concentra notificações e conteúdos recentes.
  - O módulo de `chat` é a única exceção: possui notificações próprias devido à dinâmica distinta, apesar de reutilizar a mesma infraestrutura base quando necessário.

- **UI**
  - Textos em `<p>` que NÃO forem subtítulos/descrições auxiliares devem usar a cor padrão (primary); não setar classe de cor manualmente nesses casos.
  - Textos dentro de `TableCell` usam, por padrão, cor primária (sem classe de cor explícita) e tamanho `text-sm`.

- **Usuários / lifecycle**
  - Estados conceituais: `ativo`, `desativado`, `removido da organização/arquivado` e `excluído permanentemente`.
  - Na UI padrão só existem as ações **Desativar** e **Remover**:
    - **Desativar**: usuário perde acesso e deixa de aparecer em fluxos da organização, mas todo conteúdo/histórico permanece visível (podendo aparecer como “usuário desativado”).
    - **Remover**: remove vínculos do usuário com a organização (org_members, unidades, equipes etc.), fazendo-o sumir da UI da org; o registro base (auth.users/profiles) e o histórico continuam existindo para fins de auditoria e relatórios.
  - **Exclusão permanente** é operação excepcional, interna à plataforma (platform_admin), e deve usar a service role + `auth.admin.deleteUser` no projeto correto; não expor essa ação na UI de clientes.

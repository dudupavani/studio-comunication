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

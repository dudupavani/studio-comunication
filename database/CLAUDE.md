# Database Memory

This file applies to `database/` and any task that changes schema behavior.

## Non-negotiable rules

- Add migrations only in `database/migrations`
- Use the repository pattern for migration files: `YYYYMMDD_descricao_snake_case.sql`
- Keep schema changes synchronized with `src/types/supabase.ts`
- Keep `src/lib/supabase/types.ts` as re-export only
- Version app-relevant RPC, RLS policies, and schema rules here
- Chat mention flows must keep using `create_chat_message_with_mentions`
- Do not introduce direct mention-aware inserts into `chat_messages`

## High-risk areas

- chat tables and mention-related flows
- RPC changes
- RLS and permission-sensitive policies
- changes that can create drift between database behavior and TypeScript contracts

## Before changing schema

- inspect existing migrations in `database/migrations`
- inspect current API and domain call sites in `src/app/api/**` and `src/lib/**`
- verify tenant-scope and permission impact globally, not just on the target table

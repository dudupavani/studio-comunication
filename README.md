# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Supabase Types

Os tipos do banco de dados são gerados automaticamente com o comando:

```bash
npx supabase gen types typescript --project-id "PROJECT_ID" --schema public > src/lib/supabase/types.ts
```

Sempre que houver alterações no schema do banco, execute este comando para atualizar os tipos.

## Estrutura de Permissões

O sistema utiliza um modelo multi-tenant baseado em:

- **Organizações** (orgs)
- **Unidades** (units) 
- **Papéis** (roles): platform_admin, org_admin, org_master, unit_master, unit_user

As permissões são controladas por RLS (Row Level Security) no Supabase.

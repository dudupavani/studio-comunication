# Supabase Expert

Especialista em schema, migrations, RPC, RLS e contratos tipados. Mantém banco, tipos TypeScript e regras de segurança alinhados.

## Leitura obrigatória

1. `AGENTS.md`
2. `.context/docs/architecture.md`
3. `.context/docs/security.md`
4. `.context/docs/development-workflow.md`

---

## Fonte de verdade

- O único banco em uso é o projeto remoto no Supabase Cloud
- Não existe banco local neste projeto
- Nunca reconstruir schema a partir do histórico de migrations
- O estado atual do banco remoto é a fonte de verdade
- Migrations são histórico forward-only a partir do estado atual

---

## Comandos Supabase — permitidos e proibidos

### Permitidos

```bash
supabase db push --linked
supabase migration list --linked
supabase migration repair
supabase gen types --linked > src/types/supabase.ts
```

### Proibidos — nunca usar

```bash
supabase db pull
supabase db diff
supabase db dump
supabase start
supabase db reset
```

Se uma tarefa exigir esses comandos, pare e escolha outra abordagem.

---

## Fluxo obrigatório para mudanças de banco

1. Analisar uso atual no código (API, services, queries)
2. Analisar migrations existentes
3. Decidir a mudança necessária (schema / RLS / RPC)
4. Criar nova migration (nunca editar antigas)
5. Aplicar: `supabase db push --linked`
6. Regenerar tipos: `supabase gen types --linked > src/types/supabase.ts`
7. Validar: `npm run typecheck`

Nunca pular etapas.

---

## Regras não-negociáveis

- `src/types/supabase.ts` é a única fonte de `Database`
- `src/lib/supabase/types.ts` deve ser apenas reexport
- Migrations ficam em `database/migrations`
- Nome de migration: `YYYYMMDD_descricao_snake_case.sql`
- Toda mudança de schema, RPC e RLS deve ser versionada em migration
- Nunca modificar migrations antigas
- Nunca usar histórico de migrations para entender o schema atual

---

## Regras de domínio

- Fluxos de chat com menções devem usar `create_chat_message_with_mentions`
- Nunca inserir diretamente em `chat_messages` para fluxos com menções

---

## Antes de editar

1. Inspecionar migrations existentes
2. Inspecionar policies (RLS), functions e RPCs
3. Inspecionar call sites em `src/app/api/**` e `src/lib/**`
4. Classificar impacto em: auth, tenant isolation, notificações, chat, contratos tipados

---

## Regras de decisão

- Schema mudou → criar migration
- RLS mudou → criar migration
- RPC mudou → criar migration
- Só tipos desatualizados → rodar gen types
- Histórico inconsistente → usar migration repair

---

## Antes de concluir

- Verificar drift entre banco e tipos TypeScript
- Verificar tenant isolation (regras de org_id)
- Verificar segurança de RLS (sem exposição não intencional)
- Executar `npm run typecheck -- --pretty false`

---

## Modelo mental

- Banco remoto é a verdade
- Migrations são apenas mudanças futuras
- Sem Docker, sem banco local
- Sem diff/pull/dump
- Sempre: migration → push → gen types → typecheck

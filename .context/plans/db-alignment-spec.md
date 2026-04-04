# Spec: Alinhamento Banco ↔ Projeto

**Data:** 2026-04-04  
**Origem:** Varredura real do banco `hbzrkajorgysgjlajdva` vs. código  
**Status:** pendente

---

## Contexto

O banco foi auditado diretamente via Supabase MCP. Foram encontrados desalinhamentos entre o estado real do banco e o que o código/tipos esperam. Este documento especifica cada correção necessária, em ordem de prioridade e dependência.

---

## Etapa 1 — Corrigir `src/types/supabase.ts`

Ajustes cirúrgicos no arquivo de tipos gerado. Nenhuma migration envolvida. Puro alinhamento de tipos com a realidade do banco.

### 1.1 — `announcement_reactions`: remover campo `id` fictício

**Problema:** O tipo declara `id: string` no Row/Insert/Update, mas a tabela real **não tem coluna `id`**. A PK é composta `(announcement_id, author_id, emoji)`.

**Ação:** Remover `id` de `Row`, `Insert` e `Update` de `announcement_reactions`.

---

### 1.2 — `notifications`: corrigir campos ausentes e nullabilidade

**Problema:** O tipo está incompleto e com nullabilidades incorretas.

**Campos ausentes no tipo (existem no banco):**
- `read: boolean` (NOT NULL, DEFAULT false)
- `event_id: string | null` (uuid, FK para `calendar_events`)
- `message: string` (text NOT NULL)

**Nullabilidade errada (banco é nullable, tipo é NOT NULL):**
- `action_url`: banco `NULL` → tipo deve ser `string | null`
- `body`: banco `NULL` → tipo deve ser `string | null`
- `org_id`: banco `NULL` → tipo deve ser `string | null`
- `type`: banco `NULL` → tipo deve ser `notification_type | null`

**Ação:** Atualizar Row/Insert/Update de `notifications` com os campos faltantes e nullabilidade correta.

---

### 1.3 — `design_files`: corrigir nullabilidade

**Problema:** Colunas declaradas como `| null` que são NOT NULL no banco.

| Coluna | Banco | Tipo atual | Correto |
|---|---|---|---|
| `org_id` | NOT NULL | `string \| null` | `string` |
| `title` | NOT NULL | `string \| null` | `string` |
| `user_id` | NOT NULL | `string \| null` | `string` |

**Ação:** Atualizar Row/Insert/Update de `design_files`.

---

### 1.4 — `push_subscriptions`: marcar como ausente ou remover

**Problema:** A tabela `push_subscriptions` está tipada mas **não existe no banco**. Código ativo em `src/app/api/notifications/push-subscriptions/route.ts` depende dela.

**Decisão necessária:** Criar a tabela (ver Etapa 3) ou remover o tipo. Como há código ativo, a tabela deve ser criada. O tipo pode permanecer até a migration ser aplicada.

**Ação nesta etapa:** Nenhuma — aguardar Etapa 3.

---

### 1.5 — `org_users_view`: adicionar ao bloco `Views`

**Problema:** A view `org_users_view` existe no banco mas não está declarada em `supabase.ts`.

**Estrutura real da view:**
```sql
SELECT om.org_id, p.id AS user_id, p.full_name, p.avatar_url, p.phone, om.role AS org_role
FROM org_members om JOIN profiles p ON p.id = om.user_id
```

**Ação:** Adicionar entrada na seção `Views` de `supabase.ts`.

---

### 1.6 — Remover tipos de learning do `supabase.ts`

**Problema:** 9 tabelas de learning estão tipadas mas **não existem no banco**. Enquanto não forem criadas, os tipos geram falsa confiança e podem mascarar erros em TypeScript.

Tabelas a remover dos tipos: `courses`, `course_modules`, `course_progress`, `course_reviews`, `lessons`, `lesson_attachments`, `lesson_quizzes`, `exams`, `exam_questions`.

**Ação:** Remover esses blocos de `Tables` em `supabase.ts`. Restaurar quando a migration de learning for criada (Etapa 4).

---

## Etapa 2 — Aplicar migration pendente

### 2.1 — `20260404101500_orgs_and_org_members_rls_baseline.sql`

**Problema:** Este arquivo existe no repo mas **não foi registrado** na tabela de migrations do Supabase.

**Ação:** Verificar o conteúdo do arquivo, confirmar que é seguro aplicar, e aplicar via `supabase db push` ou pelo dashboard. Após aplicado, confirmar que aparece na listagem de migrations.

**Arquivo:** `database/migrations/20260404101500_orgs_and_org_members_rls_baseline.sql`

---

## Etapa 3 — Criar migrations ausentes

### 3.1 — `push_subscriptions`

**Problema:** Tabela esperada pelo código, não existe no banco. API ativa em `src/app/api/notifications/push-subscriptions/route.ts`.

**Schema esperado** (derivado de `supabase.ts`):
```sql
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário vê e gerencia apenas suas próprias subscrições
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
```

**Arquivo a criar:** `database/migrations/20260404200000_push_subscriptions.sql`

---

### 3.2 — Storage buckets ausentes

**Problema:** Buckets referenciados no código não existem no Supabase Storage.

| Bucket | Código que usa |
|---|---|
| `course-cover` | `src/app/api/learning/courses/[courseId]/cover/route.ts` |
| `chat-attachment` | `src/app/api/messages/chats/[id]/attachments/route.ts` |

**Ação:** Criar os buckets via dashboard do Supabase ou via migration SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('course-cover', 'course-cover', true),
  ('chat-attachment', 'chat-attachment', false);
```

**Nota:** `chat-attachment` deve ser privado (acesso controlado por políticas). `course-cover` pode ser público (URLs diretas para imagens de capa).

---

## Etapa 4 — Módulo Learning (decisão estratégica)

### 4.1 — Decisão: reativar ou suspender

O módulo `learning` tem:
- Código ativo em `src/lib/learning/` e `src/app/api/learning/` (10 rotas)
- Tipos definidos em `supabase.ts`
- Migrations históricas registradas (`20250105`, `20250107`) mas tabelas não existem

**Cenário A — Reativar:** Criar migration que recria as tabelas de learning conforme os tipos. Restaurar os tipos no `supabase.ts`.

**Cenário B — Suspender:** Remover as rotas de API (`src/app/api/learning/`), o código de lib (`src/lib/learning/`), e os tipos de `supabase.ts`.

**Ação desta spec:** Implementar o Cenário A (reativar), pois há investimento de código ativo.

### 4.2 — Migration de learning

**Arquivo a criar:** `database/migrations/20260404210000_learning_recreate.sql`

**Tabelas a criar:**
- `courses` (com FK para `orgs`, `units`, `profiles`)
- `course_modules` (FK para `courses`)
- `lessons` (FK para `courses`, `course_modules`)
- `lesson_attachments` (FK para `lessons`)
- `lesson_quizzes` (FK para `lessons`)
- `exams` (FK para `courses`)
- `exam_questions` (FK para `exams`)
- `course_progress` (FK para `courses`, `lessons`, `profiles`)
- `course_reviews` (FK para `courses`, `profiles`)

**Schema:** Derivado dos tipos em `supabase.ts` (que foram escritos com base no schema original antes do reset do banco).

**RLS:** Todas as tabelas devem ter RLS habilitado com políticas de acesso por org.

---

## Etapa 5 — Políticas RLS de desenvolvimento

### 5.1 — Remover policies `dev` permissivas

**Problema:** Existem policies com nome `dev` que concedem acesso irrestrito:

| Tabela | Policy | Risco |
|---|---|---|
| `profiles` | `"dev profiles select"` → `true` | Qualquer usuário vê todos profiles |
| `user_group_members` | `"dev ugm select/insert/delete"` → `true` | CRUD irrestrito |
| `user_groups` | `"dev user_groups select"` → `true` | SELECT irrestrito |
| `design_files` | `"design_files_all_*"` → `true` | CRUD irrestrito |

**Ação:** Criar migration que:
1. Remove as policies dev
2. Adiciona policies corretas de produção para cada tabela

**Arquivo a criar:** `database/migrations/20260404220000_remove_dev_policies.sql`

**Nota de segurança:** Esta etapa deve ser revisada antes de aplicar em ambiente com dados reais. Em ambiente de desenvolvimento pode ser aplicada com atenção.

---

## Ordem de execução

```
Etapa 1 → Etapa 2 → Etapa 3 → Etapa 4 → Etapa 5
```

Cada etapa é independente após a anterior, exceto:
- Etapa 1.4 depende de Etapa 3.1 (push_subscriptions)
- Etapa 1.6 é revertida pela Etapa 4 (learning)

---

## Critérios de validação

Após todas as etapas:

- [ ] `npm run typecheck` passa sem erros
- [ ] Todas as tabelas referenciadas no código existem no banco
- [ ] `supabase.ts` reflete exatamente o schema real (sem campos fictícios)
- [ ] Migration `20260404101500` aparece na listagem de migrations aplicadas
- [ ] Buckets `course-cover` e `chat-attachment` existem no Storage
- [ ] Tabelas de learning existem e têm RLS
- [ ] Nenhuma policy com nome `dev` em ambiente de produção

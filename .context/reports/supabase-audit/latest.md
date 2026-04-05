# Supabase Drift Audit

- Mode: `default`
- Status: `DRIFT_DETECTED`
- Started at: `2026-04-05T14:07:06.856Z`
- Finished at: `2026-04-05T14:07:47.283Z`

## Project Refs

- Env URL ref: `pguszziywaeyniluntxw`
- Linked ref: `pguszziywaeyniluntxw`

## Execution

- Remote types: `ok via linked`
- Remote schema dump: `failed`
- Typecheck: `failed`

## Summary

- Critical: 5
- Warning: 2
- Info: 0

## Findings

### 1. Tipos locais do Supabase estão desalinhados com o projeto remoto

- Severity: `critical`
- Drift code: `D4`
- Description: Os tipos gerados em src/types/supabase.ts não refletem o schema remoto atual do Supabase.
- Recommendation: Regere src/types/supabase.ts a partir do projeto correto e só depois ajuste o código que quebrar.
- Affected files: src/types/supabase.ts
- Evidence:
  - `{"missingLocalTables":["announcement_comments","announcement_reactions","announcement_recipients","announcement_views","announcements","calendar_events","chat_members","chat_message_mentions","chat_messages","chats","communities","community_segments","community_spaces","course_modules","course_progress","course_reviews","courses","design_files","employee_profile","equipe_members","equipes","exam_questions","exams","lesson_attachments","lesson_quizzes","lessons","notifications","org_members","orgs","profiles","push_subscriptions","unit_members","units","user_group_members","user_groups"]}`
  - `{"missingLocalFunctions":["can_interact_announcement","can_manage_announcement","can_manage_community","can_view_announcement","can_view_community","create_chat_message_with_mentions","get_unread_chat_notifications","get_user_identity_many","group_unit","has_org_admin_role","has_org_management_role","has_org_membership","is_chat_admin","is_chat_member","is_group_member","is_group_owner","is_member_of_org","is_member_of_unit","is_org_admin","is_org_admin_of","is_org_master","is_org_member","is_platform_admin","is_platform_admin_by_id","is_platform_admin_uid","is_unit_admin","is_unit_master","is_unit_master_of","is_unit_member","org_admin_count","slugify","unit_org","update_profile_self","user_id_by_email"]}`
  - `{"missingLocalEnums":["app_role","chat_member_role","chat_type","community_segment_type","community_space_type","community_visibility","notification_type"]}`
  - `{"signatureMismatches":[]}`

### 2. Tipos locais contêm artefatos ausentes no projeto remoto

- Severity: `warning`
- Drift code: `D6`
- Description: Há objetos tipados localmente que não aparecem no projeto remoto atual. Isso pode ser resíduo da aplicação original duplicada.
- Recommendation: Confirme o projeto canônico e regenere os tipos antes de remover referências herdadas.
- Affected files: src/types/supabase.ts
- Evidence:
  - `{"staleLocalTables":[]}`
  - `{"staleLocalFunctions":["graphql"]}`
  - `{"staleLocalEnums":[]}`

### 3. O banco remoto possui objetos sem migration versionada

- Severity: `critical`
- Drift code: `D3`
- Description: A auditoria encontrou objetos no projeto Supabase remoto que não aparecem em database/migrations.
- Recommendation: Backfille migrations para refletir o estado real do banco antes de corrigir wrappers ou tipos manualmente.
- Affected files: database/migrations/20260101000001_core.sql, database/migrations/20260405_set_platform_admin_profile.sql
- Evidence:
  - `{"remoteFunctionsWithoutMigration":["can_interact_announcement","can_manage_announcement","can_manage_community","can_view_announcement","can_view_community","create_chat_message_with_mentions","get_unread_chat_notifications","get_user_identity_many","group_unit","has_org_admin_role","has_org_management_role","has_org_membership","is_chat_admin","is_chat_member","is_group_member","is_group_owner","is_member_of_org","is_member_of_unit","is_org_admin","is_org_admin_of","is_org_master","is_org_member","is_platform_admin","is_platform_admin_by_id","is_platform_admin_uid","is_unit_admin","is_unit_master","is_unit_master_of","is_unit_member","slugify","unit_org","update_profile_self","user_id_by_email"]}`
  - `{"remoteTablesWithoutMigration":["announcement_comments","announcement_reactions","announcement_recipients","announcement_views","announcements","calendar_events","chat_members","chat_message_mentions","chat_messages","chats","communities","community_segments","community_spaces","course_modules","course_progress","course_reviews","courses","design_files","employee_profile","equipe_members","equipes","exam_questions","exams","lesson_attachments","lesson_quizzes","lessons","notifications","push_subscriptions","user_group_members","user_groups"]}`
  - `{"remoteEnumsWithoutMigration":["chat_member_role","chat_type","community_segment_type","community_space_type","community_visibility","notification_type"]}`

### 4. Dump remoto do schema indisponível

- Severity: `warning`
- Drift code: `D2`
- Description: A auditoria não conseguiu obter um dump SQL remoto. A verificação de policies e triggers ficou parcial.
- Recommendation: Forneça acesso remoto suficiente para habilitar supabase db dump no modo completo.
- Evidence:
  - `{"method":"linked-password","status":1,"stderr":"Dumping schemas from remote database...\nfailed to inspect docker image: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\nDocker Desktop is a prerequisite for local development. Follow the official docs to install: https://docs.docker.com/desktop","error":null}`
  - `{"method":"db-url","status":1,"stderr":"Dumping schemas from remote database...\nfailed to inspect docker image: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\nDocker Desktop is a prerequisite for local development. Follow the official docs to install: https://docs.docker.com/desktop","error":null}`

### 5. O código usa RPCs ausentes nos tipos locais

- Severity: `critical`
- Drift code: `D5`
- Description: Há chamadas .rpc(...) no código que não aparecem em src/types/supabase.ts.
- Recommendation: Regere os tipos locais a partir do projeto correto e só depois ajuste o código remanescente.
- Affected files: src/app/(app)/groups/[groupId]/page.tsx:195, src/app/api/chats/creators/route.ts:58, src/app/api/messages/chats/[id]/messages/route.ts:317, src/app/api/notifications/badges/route.ts:23, src/app/api/orgs/[orgSlug]/units/route.ts:59, src/app/api/orgs/route.ts:28, src/lib/actions/user.ts:676, src/lib/messages/queries.ts:130, src/lib/messages/queries.ts:179, src/lib/messages/queries.ts:323, src/lib/messages/queries.ts:446, src/lib/supabase/rpc.ts:11, src/lib/supabase/rpc.ts:48
- Evidence:
  - `"get_user_identity_many"`
  - `"create_chat_message_with_mentions"`
  - `"get_unread_chat_notifications"`
  - `"is_platform_admin"`
  - `"is_platform_admin_by_id"`
  - `"update_profile_self"`

### 6. O código consulta tabelas ausentes no banco remoto

- Severity: `critical`
- Drift code: `D5`
- Description: Há chamadas .from(...) no código que não aparecem no projeto remoto auditado.
- Recommendation: Confirme o projeto Supabase ativo e alinhe migrations/tipos antes de alterar a camada de acesso.
- Affected files: src/app/api/design-files/[id]/route.ts:157, src/app/api/design-files/[id]/route.ts:51, src/app/api/design-files/[id]/route.ts:89, src/app/api/design-files/route.ts:34, src/app/api/learning/courses/[courseId]/cover/route.ts:44, src/app/api/learning/courses/[courseId]/cover/route.ts:50, src/app/api/learning/courses/[courseId]/cover/route.ts:83, src/app/api/messages/chats/[id]/messages/route.ts:294, src/app/api/users/[id]/profile/route.ts:105, src/app/api/users/[id]/profile/route.ts:114, src/app/api/users/[id]/profile/route.ts:97, src/lib/actions/user.ts:106, src/lib/actions/user.ts:112, src/lib/actions/user.ts:119
- Evidence:
  - `"design-thumbnails"`
  - `"course-cover"`
  - `"chat-attachment"`
  - `"avatars"`

### 7. TypeScript falhou após a auditoria

- Severity: `critical`
- Drift code: `D5`
- Description: O typecheck do repositório não está limpo. Isso pode refletir drift já materializado no código local.
- Recommendation: Use os arquivos apontados pelo typecheck para priorizar a correção do drift confirmado.
- Affected files: src/lib/supabase/rpc.ts
- Evidence:
  - `{"filePath":"src/lib/supabase/rpc.ts","line":49,"column":5,"message":"Type 'string | null' is not assignable to type 'string'."}`
  - `{"filePath":"src/lib/supabase/rpc.ts","line":50,"column":5,"message":"Type 'string | null' is not assignable to type 'string'."}`
  - `{"filePath":"src/lib/supabase/rpc.ts","line":51,"column":5,"message":"Type 'string | null' is not assignable to type 'string'."}`


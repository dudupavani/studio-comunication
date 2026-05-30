# 01 - Modelo de dados e catalogo de permissoes

## Contexto

Esta etapa cria a base persistente para funcoes personalizadas e define o catalogo fixo de permissoes. Ela atende a parte da feature que separa role tecnico (`org_members.role`) da funcao personalizada.

## Objetivo da etapa

Entregar migrations e estruturas de catalogo para armazenar funcoes, permissoes habilitadas e atribuicoes de usuarios.

## Relacao com o todo

Sem esta base, as etapas de API, UI e aplicacao de permissoes nao conseguem salvar nem resolver configuracoes personalizadas.

## Escopo

- Criar migration em `database/migrations`.
- Criar tabela `user_permission_profiles`.
- Criar tabela `user_permission_profile_permissions`.
- Criar tabela `user_permission_profile_assignments`.
- Definir constraints de role base, unicidade e integridade basica.
- Definir catalogo fixo inicial para `org_master`.
- Preparar a estrutura para `unit_master` e `unit_user`, sem implementar a UI final desses roles.

## Nao pode quebrar

- `org_master`, `unit_master` e `unit_user` continuam sendo roles tecnicos em `org_members.role`.
- A funcao personalizada e um vinculo adicional ao role tecnico, nao substitui `org_members.role`.
- Um usuario pode ter no maximo uma funcao personalizada por organizacao.
- Se um usuario nao tiver funcao personalizada, ele usa o comportamento padrao atual do role tecnico.
- Permissoes sao um catalogo fixo do sistema. O cliente nao cria novas permissoes.
- `platform_admin` nao deve ser afetado por funcoes personalizadas.
- O modulo arquivado `src/app/(app)/comunicados` fica fora do escopo.
- `manage_org_settings` nao sera permissao de `org_master` no primeiro ciclo; configuracoes gerais da organizacao continuam exclusivas de `org_admin`.

## Requisitos criticos aplicaveis

- Primeiro ciclo implementa apenas funcoes personalizadas para `org_master`.
- Estrutura preparada para `unit_master` e `unit_user`.
- Funcao personalizada possui nome, role base, lista de permissoes habilitadas e usuarios atribuidos.
- Funcao nova com base `org_master` nasce com todas as permissoes padrao liberadas.
- Catalogo inicial para `org_master`: `manage_users`, `manage_units`, `manage_teams`, `manage_communities`, `manage_user_functions`.
- `manage_org_settings` fica fora do catalogo aplicavel a `org_master` no primeiro ciclo.
- Fora do escopo: permissoes criadas livremente pelo cliente.
- Fora do escopo: criar funcoes personalizadas para `unit_master` e `unit_user` na UI final.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `database/migrations`
- `org_members.role`
- `src/types/supabase.ts`
- `src/lib/supabase/types.ts`
- Decisao do usuario: configuracoes gerais da organizacao continuam exclusivas de `org_admin`.

## Resultado esperado

Banco e catalogo suportam funcoes personalizadas sem alterar o role tecnico do usuario.

## Criterios de aceite

- Migration criada em `database/migrations`.
- `user_permission_profiles` possui campos e constraints da spec.
- `user_permission_profile_permissions` possui campos e constraints da spec.
- `user_permission_profile_assignments` possui campos e constraints da spec.
- Existe unicidade para no maximo uma funcao por usuario por organizacao.
- Existe caminho claro para validar server-side que a funcao pertence a org e que o role base bate com `org_members.role`.
- Catalogo fixo nao permite chaves livres criadas pelo cliente.

## Dependencias

Nenhuma etapa anterior.

## Rastreabilidade

Atende R2, R3, R6-R11, R15-R18, R19, R23, R28, R33-R38, R70-R72.

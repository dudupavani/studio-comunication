# Plano mestre: Funcoes de usuarios e permissoes por role

## Resumo da feature

Criar a secao **Funcoes de usuarios** dentro de **Configuracoes** para permitir que gestores configurem perfis de permissao aplicados a usuarios de uma organizacao.

O primeiro ciclo implementa funcoes personalizadas para o role tecnico `org_master`. A estrutura deve nascer preparada para suportar `unit_master` e `unit_user` posteriormente, sem implementar a UI final desses roles no primeiro ciclo.

## Objetivo geral

Permitir que `org_admin` crie funcoes personalizadas baseadas em `org_master`, com um catalogo fixo de permissoes ligadas/desligadas, e atribua usuarios `org_master` a essas funcoes. Usuarios sem funcao personalizada seguem com o comportamento padrao atual.

## Resultado final esperado

- `org_admin` acessa **Configuracoes > Funcoes de usuarios**.
- `org_admin` cria, edita, exclui e atribui funcoes baseadas em `org_master`.
- Funcao nova `org_master` nasce com todas as permissoes padrao do `org_master` liberadas.
- Usuario `org_master` com funcao personalizada perde acesso/acao quando uma permissao esta desligada.
- Usuario `org_master` sem funcao personalizada continua com comportamento atual.
- `org_master` nunca gerencia `org_admin`.
- `platform_admin` continua superusuario e nao depende de funcoes personalizadas.
- Configuracoes gerais da organizacao continuam exclusivas de `org_admin` no primeiro ciclo.

## Etapas sequenciais

1. `01-modelo-de-dados-e-catalogo.md` - criar base de dados e catalogo fixo de permissoes.
2. `02-servico-central-de-permissoes.md` - resolver permissoes efetivas e regras de alvo.
3. `03-api-de-funcoes-de-usuarios.md` - expor CRUD e atribuicoes com validacoes server-side.
4. `04-ui-configuracoes-funcoes-de-usuarios.md` - criar tela e navegacao em Configuracoes usando shadcn local.
5. `05-aplicar-permissoes-em-usuarios.md` - aplicar `manage_users` em usuarios e proteger `org_admin`.
6. `06-aplicar-permissoes-em-modulos-operacionais.md` - aplicar permissoes em unidades, equipes e comunidades.
7. `07-validacao-final-types-e-integridade.md` - atualizar tipos, validar typecheck e graphify.

## Dependencias entre etapas

- Etapa 2 depende da etapa 1.
- Etapa 3 depende das etapas 1 e 2.
- Etapa 4 depende das etapas 2 e 3.
- Etapa 5 depende das etapas 2 e 3.
- Etapa 6 depende das etapas 2 e 3.
- Etapa 7 depende de todas as etapas anteriores.

## Requisitos criticos completos

R1. Criar a secao **Funcoes de usuarios** dentro de **Configuracoes**.

R2. O primeiro ciclo implementa apenas funcoes personalizadas para o role tecnico `org_master`.

R3. A estrutura deve nascer preparada para suportar `unit_master` e `unit_user` em ciclos posteriores.

R4. `platform_admin` continua sendo superusuario da plataforma e nao entra na configuracao do cliente.

R5. `org_admin` continua sendo administrador maximo da organizacao.

R6. `org_master`, `unit_master` e `unit_user` continuam sendo roles tecnicos em `org_members.role`.

R7. A funcao personalizada e um vinculo adicional ao role tecnico, nao substitui `org_members.role`.

R8. Um usuario pode ter no maximo uma funcao personalizada por organizacao.

R9. Se um usuario nao tiver funcao personalizada, ele usa o comportamento padrao atual do role tecnico.

R10. Uma funcao nova com base `org_master` nasce com todas as permissoes padrao de `org_master` liberadas.

R11. Permissoes sao um catalogo fixo do sistema. O cliente nao cria novas permissoes; ele cria funcoes e liga/desliga permissoes existentes.

R12. `org_master` nunca pode gerenciar, remover, desativar, reativar, alterar role ou alterar permissoes de um usuario `org_admin`.

R13. `platform_admin` tambem nao deve ser afetado por funcoes personalizadas.

R14. O modulo arquivado `src/app/(app)/comunicados` fica fora do escopo.

R15. A funcao personalizada possui nome, role base, lista de permissoes habilitadas e usuarios atribuidos.

R16. No primeiro ciclo, a UI permite criar/editar/excluir e atribuir funcoes de base `org_master`.

R17. As permissoes devem representar capacidades reais, evitando CRUD redundante.

R18. Catalogo inicial para `org_master`: `manage_users`, `manage_units`, `manage_teams`, `manage_communities`, `manage_user_functions`.

R19. `manage_org_settings` nao sera permissao de `org_master` no primeiro ciclo; configuracoes gerais da organizacao continuam exclusivas de `org_admin`.

R20. Se `desativar` e `reativar` usuario continuarem restritos a `org_admin`, nao entram em `manage_users` para `org_master`.

R21. `org_admin` pode acessar **Configuracoes > Funcoes de usuarios**.

R22. `org_admin` pode criar, editar, excluir e atribuir funcoes baseadas em `org_master`.

R23. Futuramente `org_admin` podera gerenciar funcoes baseadas em `unit_master` e `unit_user`.

R24. `org_admin` pode atribuir uma funcao `org_master` apenas a usuarios cujo role tecnico seja `org_master`.

R25. Ao excluir uma funcao, deve haver aviso de que usuarios vinculados voltarao as permissoes padrao do role tecnico.

R26. `org_master` pode acessar **Funcoes de usuarios** apenas se tiver a permissao `manage_user_functions`.

R27. `org_master` pode criar, editar, excluir e atribuir funcoes apenas para `unit_master` e `unit_user`.

R28. No primeiro ciclo, a capacidade de `org_master` gerenciar funcoes de `unit_master` e `unit_user` pode ser preparada no modelo, mas a implementacao pode focar em respeitar a permissao de acesso e bloquear gestao de funcoes `org_master`.

R29. Com `manage_users`, `org_master` pode gerenciar qualquer usuario da organizacao exceto `org_admin` e `platform_admin`.

R30. `org_master` pode alterar role somente entre `org_master`, `unit_master` e `unit_user`.

R31. `org_master` nunca pode conceder, alterar ou remover `org_admin`.

R32. `platform_admin` pode tudo sempre e nao deve depender de funcao personalizada.

R33. Adicionar migration em `database/migrations`.

R34. Criar `user_permission_profiles` com os campos e constraints definidos na spec macro.

R35. Criar `user_permission_profile_permissions` com os campos e constraints definidos na spec macro.

R36. Criar `user_permission_profile_assignments` com os campos e constraints definidos na spec macro.

R37. Validar server-side que `profile.org_id = org_id`.

R38. Validar server-side que `profile.base_role = org_members.role` do usuario.

R39. Criar servico central, por exemplo `src/lib/permissions/user-functions.ts`.

R40. O servico central deve definir o catalogo fixo de permissoes.

R41. O servico central deve resolver permissoes efetivas de um usuario.

R42. O servico central deve retornar permissao padrao quando nao houver funcao atribuida.

R43. O servico central deve garantir `platform_admin` como bypass.

R44. O servico central deve garantir que `org_admin` nao seja limitado por funcao personalizada.

R45. O servico central deve fornecer helpers como `canUsePermission(auth, "manage_users")`.

R46. O servico central deve fornecer helpers de alvo, como `canManageTargetUser(auth, targetUser)`.

R47. Rotas/server actions devem usar os helpers centrais, nao apenas esconder botoes na UI.

R48. Usar componentes existentes de `src/components/ui`, sem alterar primitives.

R49. Componentes previstos: `Button`, `DropdownMenu`, `Select`, `Switch` ou `Checkbox`, `Table`, Dialog existente se houver padrao local.

R50. Adicionar link **Funcoes de usuarios** no dropdown/header de Configuracoes.

R51. Rota sugerida: `/user-functions`.

R52. Tela deve ter lista de funcoes, botao de criar, formulario com nome e role base, matriz de permissoes, atribuicao de usuarios elegiveis, estado vazio e confirmacao de exclusao.

R53. Para `org_admin`, role base disponivel inicialmente: `org_master`.

R54. API sugerida: `GET /api/user-functions`, `POST /api/user-functions`, `GET /api/user-functions/[id]`, `PATCH /api/user-functions/[id]`, `DELETE /api/user-functions/[id]`, `PUT /api/user-functions/[id]/assignments`.

R55. API deve validar auth com `getAuthContext`.

R56. API deve validar tenant scope por `orgId`.

R57. API deve validar ator conforme role/permissao.

R58. API deve validar que role base e permitida para o ator.

R59. API deve validar chaves de permissao contra catalogo fixo.

R60. API deve validar que usuarios atribuidos pertencem a org.

R61. API deve validar que usuarios atribuidos tem o mesmo role tecnico da funcao.

R62. API deve bloquear qualquer operacao do `org_master` contra `org_admin`.

R63. No primeiro ciclo, substituir checks diretos de `org_master` por permissoes efetivas nos modulos ativos.

R64. Usuarios devem usar `manage_users`.

R65. Unidades devem usar `manage_units`.

R66. Equipes devem usar `manage_teams`.

R67. Comunidades devem usar `manage_communities`.

R68. Configuracoes/Funcoes de usuarios devem usar `manage_user_functions`.

R69. Onde o banco tiver policies que ainda liberam `org_master`, as rotas server-side devem reforcar a permissao da aplicacao antes de executar operacoes com service role.

R70. Fora do escopo: criar funcoes personalizadas para `unit_master` e `unit_user` na UI final.

R71. Fora do escopo: auditoria historica detalhada.

R72. Fora do escopo: permissoes criadas livremente pelo cliente.

R73. Fora do escopo: hard delete de usuarios.

R74. Fora do escopo: alteracoes em `src/app/(app)/comunicados`.

R75. `src/types/supabase.ts` e reexports em `src/lib/supabase/types.ts` devem ser atualizados se novas tabelas forem adicionadas.

R76. Rodar `npm run typecheck -- --pretty false` antes da entrega.

R77. Rodar `graphify update .` apos modificar codigo, se `graphify-out/graph.json` existir.

## Referencias externas completas

- `plans/funcoes-usuarios-permissoes-spec.md`: spec macro original.
- `database/migrations`: destino obrigatorio das migrations.
- `src/types/supabase.ts`: fonte unica do tipo `Database`.
- `src/lib/supabase/types.ts`: reexport de `Database/Json/Tables/Enums`.
- `src/components/ui`: componentes shadcn locais; primitives nao devem ser alterados.
- `src/app/(app)/comunicados`: modulo arquivado fora do escopo.
- `src/lib/permissions/user-functions.ts`: local sugerido para o servico central.
- `getAuthContext`: fonte de autenticacao para APIs.
- `org_members.role`: role tecnico que nao deve ser substituido pela funcao personalizada.
- `graphify-out/graph.json`: se existir, exige `graphify update .` apos modificar codigo.
- Decisao do usuario posterior a spec: `manage_org_settings` fica exclusivo de `org_admin` no primeiro ciclo.

## Mapeamento de etapas por requisito

| Requisito | Etapas |
| --- | --- |
| R1, R21, R26, R48-R53, R68 | 04 |
| R2, R3, R6-R11, R15-R18, R23, R28, R33-R38, R70-R72 | 01 |
| R4, R5, R9, R12, R13, R19, R20, R29-R32, R39-R47 | 02 |
| R22, R24, R25, R54-R62 | 03 |
| R29-R31, R47, R63-R64, R69, R73 | 05 |
| R47, R63, R65-R67, R69, R74 | 06 |
| R14, R48, R75-R77 | 07 |

## Verificacao de integridade

- Cobertura completa: todos os requisitos R1-R77 aparecem em pelo menos uma etapa.
- Preservacao: regras criticas foram mantidas com o mesmo nivel de obrigatoriedade.
- Referencias externas: todas as referencias da spec macro e a decisao posterior do usuario foram preservadas.
- Equivalencia funcional: executar todas as micro-specs resulta no mesmo comportamento da spec original com a ambiguidade de `manage_org_settings` resolvida como exclusivo de `org_admin`.
- Rastreabilidade: cada micro-spec contem secao de rastreabilidade propria.

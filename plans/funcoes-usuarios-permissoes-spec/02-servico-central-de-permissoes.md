# 02 - Servico central de permissoes

## Contexto

Esta etapa cria o ponto unico para resolver permissoes efetivas, evitando regras duplicadas e checks diretos de `org_master` espalhados pela aplicacao.

## Objetivo da etapa

Entregar um servico central, por exemplo `src/lib/permissions/user-functions.ts`, que define o catalogo fixo, resolve permissoes efetivas e aplica regras de ator/alvo.

## Relacao com o todo

Todas as APIs, server actions e telas devem depender deste servico para manter comportamento consistente entre UI e backend.

## Escopo

- Definir catalogo fixo de permissoes.
- Resolver permissoes efetivas para `platform_admin`, `org_admin`, `org_master` com e sem funcao personalizada.
- Retornar permissoes padrao quando nao houver funcao atribuida.
- Criar helper `canUsePermission(auth, permissionKey)`.
- Criar helper de alvo, como `canManageTargetUser(auth, targetUser)`.
- Garantir que `platform_admin` seja bypass.
- Garantir que `org_admin` nao seja limitado por funcao personalizada.
- Garantir que `org_master` nunca gerencie `org_admin`.

## Nao pode quebrar

- `platform_admin` continua sendo superusuario e nao entra na configuracao do cliente.
- `org_admin` continua sendo administrador maximo da organizacao.
- Usuario sem funcao personalizada continua com comportamento padrao atual.
- `org_master` nunca pode gerenciar, remover, desativar, reativar, alterar role ou alterar permissoes de um usuario `org_admin`.
- `platform_admin` tambem nao deve ser afetado por funcoes personalizadas.
- `manage_org_settings` nao sera permissao de `org_master` no primeiro ciclo.
- Rotas/server actions devem usar helpers centrais, nao apenas esconder botoes na UI.

## Requisitos criticos aplicaveis

- O servico central deve definir o catalogo fixo de permissoes.
- O servico central deve resolver permissoes efetivas de um usuario.
- O servico central deve retornar permissao padrao quando nao houver funcao atribuida.
- O servico central deve garantir `platform_admin` como bypass.
- O servico central deve garantir que `org_admin` nao seja limitado por funcao personalizada.
- O servico central deve fornecer helpers como `canUsePermission(auth, "manage_users")`.
- O servico central deve fornecer helpers de alvo, como `canManageTargetUser(auth, targetUser)`.
- Com `manage_users`, `org_master` pode gerenciar qualquer usuario da organizacao exceto `org_admin` e `platform_admin`.
- `org_master` pode alterar role somente entre `org_master`, `unit_master` e `unit_user`.
- `org_master` nunca pode conceder, alterar ou remover `org_admin`.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `src/lib/permissions/user-functions.ts`
- `getAuthContext`
- `org_members.role`
- Decisao do usuario: configuracoes gerais da organizacao continuam exclusivas de `org_admin`.

## Resultado esperado

Existe uma API interna unica para perguntar se um usuario pode executar uma permissao ou gerenciar um alvo especifico.

## Criterios de aceite

- `platform_admin` retorna permitido para todas as permissoes.
- `org_admin` nao e limitado por funcao personalizada.
- `org_master` sem funcao personalizada recebe permissoes padrao atuais.
- `org_master` com funcao personalizada recebe apenas permissoes habilitadas.
- `org_master` nao recebe `manage_org_settings` no primeiro ciclo.
- Helper de alvo bloqueia `org_admin` e `platform_admin` como alvo de `org_master`.

## Dependencias

Depende da etapa 01.

## Rastreabilidade

Atende R4, R5, R9, R12, R13, R19, R20, R29-R32, R39-R47.

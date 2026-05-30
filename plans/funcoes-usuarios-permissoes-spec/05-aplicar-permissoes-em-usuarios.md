# 05 - Aplicar permissoes no modulo Usuarios

## Contexto

Esta etapa aplica a permissao `manage_users` nos fluxos de usuarios, onde hoje `org_master` pode gerenciar usuarios em varios pontos.

## Objetivo da etapa

Garantir que `org_master` com funcao personalizada so consiga usar o modulo Usuarios quando tiver `manage_users`, e nunca consiga afetar `org_admin` ou `platform_admin`.

## Relacao com o todo

Esta etapa prova a regra central da feature: a funcao personalizada limita a atuacao real do `org_master`, nao apenas a navegacao.

## Escopo

- Substituir checks diretos de `org_master` por permissao efetiva `manage_users` nos fluxos ativos de usuarios.
- Proteger lista/acesso ao modulo Usuarios.
- Proteger convite de usuarios.
- Proteger edicao de dados permitidos.
- Proteger alteracao de role.
- Proteger remocao de usuario da organizacao.
- Garantir que `desativar` e `reativar` continuem fora de `manage_users` se permanecem restritos a `org_admin`.
- Garantir bloqueio contra `org_admin` e `platform_admin`.

## Nao pode quebrar

- `org_master` com `manage_users` pode gerenciar qualquer usuario da organizacao exceto `org_admin` e `platform_admin`.
- `org_master` pode alterar role somente entre `org_master`, `unit_master` e `unit_user`.
- `org_master` nunca pode conceder, alterar ou remover `org_admin`.
- `org_master` nunca pode gerenciar, remover, desativar, reativar, alterar role ou alterar permissoes de um usuario `org_admin`.
- Hard delete de usuarios fica fora do escopo.
- Rotas/server actions devem usar helpers centrais, nao apenas esconder botoes na UI.
- Onde o banco tiver policies que ainda liberam `org_master`, as rotas server-side devem reforcar a permissao da aplicacao antes de executar operacoes com service role.

## Requisitos criticos aplicaveis

- Usuarios devem usar `manage_users`.
- Com `manage_users`, `org_master` pode gerenciar qualquer usuario da organizacao exceto `org_admin` e `platform_admin`.
- `org_master` pode alterar role somente entre `org_master`, `unit_master` e `unit_user`.
- `org_master` nunca pode conceder, alterar ou remover `org_admin`.
- Se `desativar` e `reativar` usuario continuarem restritos a `org_admin`, nao entram em `manage_users` para `org_master`.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `src/lib/permissions/user-functions.ts`
- `getAuthContext`
- `org_members.role`
- Rotas e server actions existentes de usuarios

## Resultado esperado

O modulo Usuarios respeita permissoes efetivas de `org_master` e mantem `org_admin` protegido.

## Criterios de aceite

- `org_master` sem funcao personalizada mantem comportamento atual.
- `org_master` com funcao personalizada e sem `manage_users` nao acessa/usa fluxos de gestao de usuarios.
- `org_master` com `manage_users` consegue operar usuarios permitidos.
- `org_master` nao consegue remover `org_admin`.
- `org_master` nao consegue alterar role de `org_admin`.
- `org_master` nao consegue conceder `org_admin`.
- `org_master` nao consegue afetar `platform_admin`.

## Dependencias

Depende das etapas 02 e 03.

## Rastreabilidade

Atende R12, R20, R29-R31, R47, R63-R64, R69, R73.

# 06 - Aplicar permissoes em unidades, equipes e comunidades

## Contexto

Esta etapa aplica as permissoes efetivas nos demais modulos ativos em que `org_master` atua como gestor: Unidades, Equipes e Comunidades.

## Objetivo da etapa

Garantir que `org_master` com funcao personalizada so consiga operar cada modulo quando tiver a permissao correspondente.

## Relacao com o todo

Depois de Usuarios, esta etapa amplia a limitacao de atuacao do `org_master` para os modulos operacionais principais.

## Escopo

- Aplicar `manage_units` no modulo Unidades.
- Aplicar `manage_teams` no modulo Equipes.
- Aplicar `manage_communities` no modulo Comunidades.
- Substituir checks diretos de `org_master` por permissoes efetivas nos modulos ativos.
- Reforcar permissoes server-side antes de operacoes com service role.
- Manter `src/app/(app)/comunicados` fora do escopo.

## Nao pode quebrar

- Usuario `org_master` sem funcao personalizada continua com comportamento atual.
- Usuario `org_master` com funcao personalizada perde acesso/acao quando a permissao correspondente esta desligada.
- Permissoes devem representar capacidades reais, evitando CRUD redundante.
- `manage_units` inclui acessar unidades, criar, editar, excluir e gerenciar membros.
- `manage_teams` inclui acessar equipes, criar, editar, excluir e gerenciar membros/lideres.
- `manage_communities` inclui acessar comunidades como gestor, criar, editar, excluir comunidades e espacos, gerenciar segmentacao/visibilidade e publicar como gestor.
- Rotas/server actions devem usar helpers centrais, nao apenas esconder botoes na UI.
- O modulo arquivado `src/app/(app)/comunicados` fica fora do escopo.

## Requisitos criticos aplicaveis

- Unidades devem usar `manage_units`.
- Equipes devem usar `manage_teams`.
- Comunidades devem usar `manage_communities`.
- No primeiro ciclo, substituir checks diretos de `org_master` por permissoes efetivas nos modulos ativos.
- Onde o banco tiver policies que ainda liberam `org_master`, as rotas server-side devem reforcar a permissao da aplicacao antes de executar operacoes com service role.
- O modulo arquivado `src/app/(app)/comunicados` fica fora do escopo.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `src/lib/permissions/user-functions.ts`
- `src/app/(app)/comunicados`
- Modulos ativos de Unidades, Equipes e Comunidades

## Resultado esperado

Unidades, Equipes e Comunidades respeitam a matriz de permissoes do `org_master`.

## Criterios de aceite

- `org_master` sem funcao personalizada mantem comportamento atual nesses modulos.
- `org_master` sem `manage_units` nao gerencia unidades.
- `org_master` sem `manage_teams` nao gerencia equipes.
- `org_master` sem `manage_communities` nao gerencia comunidades.
- Backend bloqueia acoes mesmo que a UI seja acessada diretamente.
- Nenhum arquivo do modulo `src/app/(app)/comunicados` e alterado.

## Dependencias

Depende das etapas 02 e 03.

## Rastreabilidade

Atende R14, R17, R47, R63, R65-R67, R69, R74.

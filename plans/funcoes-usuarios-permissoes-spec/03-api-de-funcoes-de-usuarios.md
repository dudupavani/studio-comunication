# 03 - API de funcoes de usuarios

## Contexto

Esta etapa expõe as operacoes server-side para criar, listar, editar, excluir e atribuir funcoes personalizadas.

## Objetivo da etapa

Entregar APIs protegidas para manipular funcoes de usuarios respeitando tenant, role base, permissoes efetivas e regras de alvo.

## Relacao com o todo

A UI depende destas APIs para operar. As validacoes backend garantem que esconder botoes na UI nao seja a unica barreira de seguranca.

## Escopo

- Criar rotas sugeridas:
  - `GET /api/user-functions`
  - `POST /api/user-functions`
  - `GET /api/user-functions/[id]`
  - `PATCH /api/user-functions/[id]`
  - `DELETE /api/user-functions/[id]`
  - `PUT /api/user-functions/[id]/assignments`
- Validar auth com `getAuthContext`.
- Validar tenant scope por `orgId`.
- Validar ator conforme role/permissao.
- Validar role base permitida para o ator.
- Validar chaves de permissao contra catalogo fixo.
- Validar usuarios atribuidos.
- Excluir funcao removendo vinculos por cascade ou fluxo equivalente.

## Nao pode quebrar

- `platform_admin` pode tudo sempre e nao depende de funcao personalizada.
- `org_admin` pode criar, editar, excluir e atribuir funcoes baseadas em `org_master`.
- `org_admin` pode atribuir uma funcao `org_master` apenas a usuarios cujo role tecnico seja `org_master`.
- `org_master` pode acessar Funcoes de usuarios apenas com `manage_user_functions`.
- `org_master` nao pode gerenciar funcoes baseadas em `org_master`.
- `org_master` nunca pode operar contra `org_admin`.
- Permissoes sao catalogo fixo; rotas rejeitam chaves desconhecidas.
- Hard delete de usuarios fica fora do escopo.

## Requisitos criticos aplicaveis

- API deve validar auth com `getAuthContext`.
- API deve validar tenant scope por `orgId`.
- API deve validar ator conforme role/permissao.
- API deve validar que role base e permitida para o ator.
- API deve validar chaves de permissao contra catalogo fixo.
- API deve validar que usuarios atribuidos pertencem a org.
- API deve validar que usuarios atribuidos tem o mesmo role tecnico da funcao.
- API deve bloquear qualquer operacao do `org_master` contra `org_admin`.
- Ao excluir uma funcao, usuarios vinculados voltam as permissoes padrao do role tecnico.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `getAuthContext`
- `src/lib/permissions/user-functions.ts`
- `org_members.role`
- Rotas sugeridas em `/api/user-functions`

## Resultado esperado

As operacoes de funcoes personalizadas sao possiveis via API e protegidas por permissoes efetivas.

## Criterios de aceite

- `org_admin` cria funcao `org_master` com todas as permissoes ligadas por padrao.
- `org_admin` edita permissoes de uma funcao.
- `org_admin` atribui apenas usuarios `org_master` a funcoes `org_master`.
- API rejeita permissao desconhecida.
- API rejeita usuario fora da org.
- API rejeita usuario com role tecnico diferente do role base.
- API bloqueia `org_master` tentando alterar funcao `org_master`.
- API bloqueia qualquer operacao indevida contra `org_admin`.

## Dependencias

Depende das etapas 01 e 02.

## Rastreabilidade

Atende R22, R24, R25, R37, R38, R54-R62, R69.

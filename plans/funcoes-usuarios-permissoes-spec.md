# Spec: Funcoes de usuarios e permissoes por role

## Objetivo

Criar a secao **Funcoes de usuarios** dentro de **Configuracoes** para permitir que gestores configurem perfis de permissao aplicados a usuarios de uma organizacao.

O primeiro ciclo implementa apenas funcoes personalizadas para o role tecnico `org_master`, mas a estrutura deve nascer preparada para suportar `unit_master` e `unit_user` em ciclos posteriores.

## Regras canonicas

- `platform_admin` continua sendo superusuario da plataforma e nao entra na configuracao do cliente.
- `org_admin` continua sendo administrador maximo da organizacao.
- `org_master`, `unit_master` e `unit_user` continuam sendo roles tecnicos em `org_members.role`.
- A funcao personalizada e um vinculo adicional ao role tecnico, nao substitui `org_members.role`.
- Um usuario pode ter no maximo uma funcao personalizada por organizacao.
- Se um usuario nao tiver funcao personalizada, ele usa o comportamento padrao atual do role tecnico.
- Uma funcao nova com base `org_master` nasce com todas as permissoes padrao de `org_master` liberadas.
- Permissoes sao um catalogo fixo do sistema. O cliente nao cria novas permissoes; ele cria funcoes e liga/desliga permissoes existentes.
- `org_master` nunca pode gerenciar, remover, desativar, reativar, alterar role ou alterar permissoes de um usuario `org_admin`.
- `platform_admin` tambem nao deve ser afetado por funcoes personalizadas.
- O modulo arquivado `src/app/(app)/comunicados` fica fora do escopo.

## Modelo de produto

### Funcao personalizada

Exemplo: `Diretor`, `Gerente regional`, `Gerente de loja`.

Campos conceituais:

- Nome da funcao.
- Role base: `org_master`, `unit_master` ou `unit_user`.
- Lista de permissoes habilitadas.
- Usuarios atribuidos.

No primeiro ciclo, a UI permite criar/editar/excluir e atribuir funcoes de base `org_master`.

### Permissoes

As permissoes devem representar capacidades reais, evitando CRUD redundante. Exemplo: **Gerenciar unidades** inclui acessar unidades, criar, editar, excluir e gerenciar membros, porque essas acoes andam juntas no produto atual.

Catalogo inicial para `org_master`:

| Chave tecnica | Nome na UI | Escopo |
| --- | --- | --- |
| `manage_users` | Gerenciar usuarios | Acessar usuarios, convidar, editar dados permitidos, alterar role entre `org_master`, `unit_master` e `unit_user`, remover usuarios permitidos |
| `manage_units` | Gerenciar unidades | Acessar unidades, criar, editar, excluir e gerenciar membros de unidades |
| `manage_teams` | Gerenciar equipes | Acessar equipes, criar, editar, excluir e gerenciar membros/lideres |
| `manage_communities` | Gerenciar comunidades | Acessar comunidades como gestor, criar, editar, excluir comunidades e espacos, gerenciar segmentacao/visibilidade e publicar como gestor |
| `manage_user_functions` | Gerenciar funcoes de usuarios | Acessar Funcoes de usuarios, criar/editar/excluir funcoes e atribuir usuarios dentro do escopo permitido |
| `manage_org_settings` | Gerenciar configuracoes da organizacao | Acessar/editar configuracoes gerais da organizacao quando aplicavel |

Observacao: se `desativar` e `reativar` usuario continuarem restritos a `org_admin`, nao entram em `manage_users` para `org_master`.

## Regras por ator

### `org_admin`

- Pode acessar **Configuracoes > Funcoes de usuarios**.
- Pode criar, editar, excluir e atribuir funcoes baseadas em `org_master`.
- Futuramente podera gerenciar funcoes baseadas em `unit_master` e `unit_user`.
- Pode atribuir uma funcao `org_master` apenas a usuarios cujo role tecnico seja `org_master`.
- Ao excluir uma funcao, deve ver aviso de que usuarios vinculados voltarao as permissoes padrao do role tecnico.

### `org_master`

- Pode acessar **Funcoes de usuarios** apenas se tiver a permissao `manage_user_functions`.
- Pode criar, editar, excluir e atribuir funcoes apenas para `unit_master` e `unit_user`.
- No primeiro ciclo, essa capacidade pode ser preparada no modelo, mas a implementacao pode focar em respeitar a permissao de acesso e bloquear gestao de funcoes `org_master`.
- Com `manage_users`, pode gerenciar qualquer usuario da organizacao exceto `org_admin` e `platform_admin`.
- Pode alterar role somente entre `org_master`, `unit_master` e `unit_user`.
- Nunca pode conceder, alterar ou remover `org_admin`.

### `platform_admin`

- Pode tudo sempre.
- Nao deve depender de funcao personalizada.

## Modelo de dados proposto

Adicionar migration em `database/migrations`.

### `user_permission_profiles`

Representa a funcao personalizada.

Campos:

- `id uuid primary key`
- `org_id uuid not null references orgs(id)`
- `name text not null`
- `base_role app_role not null`
- `created_by uuid null references profiles(id)`
- `updated_by uuid null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- `base_role in ('org_master', 'unit_master', 'unit_user')`
- `unique (org_id, lower(name))`, ou indice unico funcional equivalente

### `user_permission_profile_permissions`

Permissoes habilitadas por funcao.

Campos:

- `profile_id uuid not null references user_permission_profiles(id) on delete cascade`
- `permission_key text not null`
- `created_at timestamptz not null default now()`
- `primary key (profile_id, permission_key)`

Validade de `permission_key` fica no catalogo da aplicacao para evitar migration a cada ajuste de rotulo. Rotas devem rejeitar chaves desconhecidas.

### `user_permission_profile_assignments`

Vinculo entre usuario e funcao.

Campos:

- `id uuid primary key`
- `org_id uuid not null references orgs(id)`
- `user_id uuid not null references profiles(id)`
- `profile_id uuid not null references user_permission_profiles(id) on delete cascade`
- `assigned_by uuid null references profiles(id)`
- `assigned_at timestamptz not null default now()`

Constraints:

- `unique (org_id, user_id)`
- Validacao server-side: `profile.org_id = org_id`
- Validacao server-side: `profile.base_role = org_members.role` do usuario

## Aplicacao das permissoes

Criar um servico central, por exemplo `src/lib/permissions/user-functions.ts`, responsavel por:

- Definir o catalogo fixo de permissoes.
- Resolver permissoes efetivas de um usuario.
- Retornar permissao padrao quando nao houver funcao atribuida.
- Garantir `platform_admin` como bypass.
- Garantir que `org_admin` nao seja limitado por funcao personalizada.
- Fornecer helpers como `canUsePermission(auth, "manage_users")`.
- Fornecer helpers de alvo, como `canManageTargetUser(auth, targetUser)`.

Rotas/server actions devem usar os helpers centrais, nao apenas esconder botoes na UI.

## UI

Usar componentes existentes de `src/components/ui`, sem alterar primitives:

- `Button`
- `DropdownMenu`
- `Select`
- `Switch` ou `Checkbox`
- `Table`
- Dialog existente, se ja houver padrao local

### Navegacao

Adicionar link **Funcoes de usuarios** no dropdown/header de Configuracoes.

Rota sugerida:

- `/user-functions`

### Tela

Primeiro ciclo:

- Lista de funcoes personalizadas da organizacao.
- Botao para criar funcao.
- Formulario com nome e role base.
- Para `org_admin`, role base disponivel inicialmente: `org_master`.
- Matriz de permissoes com toggles agrupados.
- Area de atribuicao de usuarios elegiveis.
- Estado vazio quando nao houver funcoes.
- Confirmacao ao excluir funcao, avisando que usuarios vinculados voltarao as permissoes padrao.

## Backend/API

Rotas sugeridas:

- `GET /api/user-functions`
- `POST /api/user-functions`
- `GET /api/user-functions/[id]`
- `PATCH /api/user-functions/[id]`
- `DELETE /api/user-functions/[id]`
- `PUT /api/user-functions/[id]/assignments`

Regras:

- Validar auth com `getAuthContext`.
- Validar tenant scope por `orgId`.
- Validar ator conforme role/permissao.
- Validar que role base e permitida para o ator.
- Validar chaves de permissao contra catalogo fixo.
- Validar que usuarios atribuidos pertencem a org.
- Validar que usuarios atribuidos tem o mesmo role tecnico da funcao.
- Bloquear qualquer operacao do `org_master` contra `org_admin`.

## Integracao inicial nos modulos

Para o primeiro ciclo, substituir checks diretos de `org_master` por permissoes efetivas nos modulos ativos:

- Usuarios: `manage_users`
- Unidades: `manage_units`
- Equipes: `manage_teams`
- Comunidades: `manage_communities`
- Configuracoes/Funcoes de usuarios: `manage_user_functions`
- Configuracoes da organizacao: `manage_org_settings`

Onde o banco tiver policies que ainda liberam `org_master`, as rotas server-side devem reforcar a permissao da aplicacao antes de executar operacoes com service role.

## Fora do escopo do primeiro ciclo

- Criar funcoes personalizadas para `unit_master` e `unit_user` na UI final.
- Auditoria historica detalhada.
- Permissoes criadas livremente pelo cliente.
- Hard delete de usuarios.
- Alteracoes em `src/app/(app)/comunicados`.

## Criterios de aceite

- `org_admin` consegue criar uma funcao `org_master` com todas permissoes ligadas por padrao.
- `org_admin` consegue desligar permissoes dessa funcao.
- `org_admin` consegue atribuir usuarios `org_master` a essa funcao.
- Usuario `org_master` sem funcao personalizada continua com comportamento atual.
- Usuario `org_master` com funcao personalizada perde acesso/acao quando a permissao correspondente esta desligada.
- `org_master` nunca consegue gerenciar `org_admin`.
- Exclusao de funcao avisa que usuarios vinculados voltarao ao padrao.
- UI usa componentes shadcn locais sem alterar `components/ui`.
- Migrations ficam em `database/migrations`.
- `src/types/supabase.ts` e reexports em `src/lib/supabase/types.ts` sao atualizados se novas tabelas forem adicionadas.
- Rodar `npm run typecheck -- --pretty false` antes da entrega.
- Rodar `graphify update .` apos modificar codigo, se `graphify-out/graph.json` existir.

## Perguntas pendentes

1. `manage_org_settings` deve existir para `org_master` no primeiro ciclo, ou configuracoes da organizacao continuam exclusivas de `org_admin`?

# 04 - UI de Configuracoes > Funcoes de usuarios

## Contexto

Esta etapa cria a experiencia administrativa para listar, criar, editar, excluir e atribuir funcoes personalizadas dentro de Configuracoes.

## Objetivo da etapa

Entregar a rota de UI `/user-functions`, adicionar o link **Funcoes de usuarios** no dropdown/header de Configuracoes e implementar a tela operacional usando componentes shadcn locais.

## Relacao com o todo

Esta e a superficie usada pelo cliente para configurar as permissoes. Ela consome a API da etapa 03 e apresenta o catalogo definido nas etapas 01 e 02.

## Escopo

- Adicionar link **Funcoes de usuarios** no dropdown/header de Configuracoes.
- Criar rota `/user-functions`.
- Criar lista de funcoes personalizadas da organizacao.
- Criar botao de nova funcao.
- Criar formulario com nome e role base.
- Para `org_admin`, role base disponivel inicialmente: `org_master`.
- Criar matriz de permissoes com toggles agrupados.
- Criar area de atribuicao de usuarios elegiveis.
- Criar estado vazio.
- Criar confirmacao de exclusao informando que usuarios vinculados voltarao as permissoes padrao.

## Nao pode quebrar

- Usar componentes existentes de `src/components/ui`, sem alterar primitives.
- Componentes previstos: `Button`, `DropdownMenu`, `Select`, `Switch` ou `Checkbox`, `Table`, Dialog existente se houver padrao local.
- `org_admin` pode acessar **Configuracoes > Funcoes de usuarios**.
- `org_master` pode acessar **Funcoes de usuarios** apenas se tiver `manage_user_functions`.
- `org_master` nao pode gerenciar funcoes de base `org_master`.
- Configuracoes gerais da organizacao continuam exclusivas de `org_admin`.
- Elementos de heading nao devem receber classes adicionais de tamanho, peso de fonte, font-size ou cor.
- Textos em `<p>` que nao forem subtitulos/descricoes auxiliares devem usar cor padrao.
- Nao customizar componentes da pasta `components/ui`.

## Requisitos criticos aplicaveis

- Criar a secao **Funcoes de usuarios** dentro de **Configuracoes**.
- No primeiro ciclo, UI permite criar/editar/excluir e atribuir funcoes de base `org_master`.
- Para `org_admin`, role base disponivel inicialmente: `org_master`.
- Excluir funcao deve mostrar aviso de que usuarios vinculados voltarao as permissoes padrao.
- UI usa componentes shadcn locais sem alterar `components/ui`.
- Configuracoes/Funcoes de usuarios devem usar `manage_user_functions`.
- `manage_org_settings` nao sera permissao de `org_master` no primeiro ciclo.

## Referencias externas

- `plans/funcoes-usuarios-permissoes-spec.md`
- `src/components/ui`
- `Button`
- `DropdownMenu`
- `Select`
- `Switch` ou `Checkbox`
- `Table`
- `/user-functions`
- Decisao do usuario: configuracoes gerais da organizacao continuam exclusivas de `org_admin`.

## Resultado esperado

Usuarios autorizados conseguem operar funcoes personalizadas por uma tela consistente com o design system existente.

## Criterios de aceite

- Link **Funcoes de usuarios** aparece no contexto de Configuracoes para usuarios autorizados.
- `org_admin` acessa a tela.
- `org_master` sem `manage_user_functions` nao acessa a tela.
- `org_admin` cria funcao `org_master` com permissoes ligadas por padrao.
- UI permite desligar permissoes.
- UI permite atribuir usuarios elegiveis.
- UI mostra estado vazio.
- UI mostra confirmacao antes de excluir funcao.
- Nenhum primitive de `src/components/ui` e alterado.

## Dependencias

Depende das etapas 02 e 03.

## Rastreabilidade

Atende R1, R16, R21, R25-R28, R48-R53, R68.

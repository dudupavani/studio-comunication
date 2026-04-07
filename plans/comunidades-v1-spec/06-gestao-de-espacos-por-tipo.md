# 06 — Gestão de Espaços por Tipo

## Contexto
Com a comunidade navegável, a V1 precisa permitir criar e administrar espaços com tipos definidos e vínculo à comunidade.

## Objetivo da etapa
Entregar criação, edição e exclusão de espaços por tipo (`publicacoes`, `eventos`) dentro da comunidade.

## Relação com o todo
Os espaços são a unidade organizacional da comunicação e base para o feed consolidado da comunidade.

## Escopo
- Implementar modal de criação de espaço com seleção de tipo.
- Implementar edição e exclusão de espaço.
- Garantir que espaço pertença a uma comunidade.
- Garantir herança de segmentação da comunidade para o espaço.
- Aplicar regra de permissão de gestão:
  - `platform_admin`, `org_admin`, `org_master`.

## Não pode quebrar
- Estruturas já existentes de posts e eventos do sistema.
- Regras de segmentação atuais fora do módulo de comunidades.
- Navegação interna implementada na etapa 5.

## Resultado esperado
- Usuários autorizados conseguem manter os espaços da comunidade com tipos válidos.
- Espaços criados passam a aparecer na sidebar da comunidade.

## Critérios de aceite
- Criação de espaço por tipo funciona via modal.
- Edição e exclusão de espaço funcionam com feedback adequado.
- Espaço novo aparece imediatamente na listagem da comunidade.
- Perfis sem permissão não executam operações de gestão.

## Dependências
- Etapas 2 e 5.

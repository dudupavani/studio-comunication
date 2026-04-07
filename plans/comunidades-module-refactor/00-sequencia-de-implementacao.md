# Refactor `communities-module.tsx` - Sequência de Implementação

## Contexto

O arquivo `src/app/(app)/comunidades/components/communities-module.tsx` concentra múltiplas responsabilidades (dados, layout, dialogs, composer de publicação, upload/crop, estados e mutações).

Este plano define um desmembramento incremental para componentes e hooks dentro de:

- `src/app/(app)/comunidades/components`

Sem alterar comportamento funcional.

## Objetivo macro

Transformar `communities-module.tsx` em um componente orquestrador, com responsabilidades separadas por domínio de UI e lógica.

## Ordem obrigatória das etapas

1. `01-extrair-tipos-e-utils.md`
2. `02-extrair-dialogs-base.md`
3. `03-extrair-publication-composer-modal.md`
4. `04-extrair-hook-use-publication-composer.md`
5. `05-extrair-community-sidebar.md`
6. `06-extrair-community-content-pane.md`
7. `07-extrair-hook-use-communities-data.md`
8. `08-simplificar-communities-module.md`
9. `09-validacao-e-hardening.md`

## Regras de execução

- Cada etapa deve compilar antes de avançar.
- Não mudar contrato visual/funcional deliberadamente durante extração.
- Não mover componentes para fora de `src/app/(app)/comunidades/components`.
- Toda mudança estrutural deve manter os fluxos:
  - seleção de comunidade
  - gestão de espaços
  - empty states
  - composer de publicação (texto, imagem, anexo, capa)
  - upload via rota `/api/communities/[communityId]/spaces/[spaceId]/uploads`

## Gate de qualidade por etapa

- TypeScript sem novos erros.
- Sem regressão de interação entre modal principal e sub-modais.
- Sem regressão de permissões/fluxos de upload.

## Resultado esperado ao final

- `communities-module.tsx` com foco em composição/orquestração.
- Componentes menores, testáveis e com responsabilidades claras.
- Hooks separados para estado local complexo (composer) e dados da feature (communities/spaces).


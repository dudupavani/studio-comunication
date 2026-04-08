# Frontend Specialist

Implementa e revisa UI preservando a linguagem visual e os constraints arquiteturais da aplicação.

## Leitura obrigatória

1. `AGENTS.md`
2. `.context/docs/design.md`
3. `.context/docs/architecture.md`

## Regras não-negociáveis

- Não adicionar classes customizadas de tamanho, peso ou cor em headings (`h1`–`h6`)
- Textos em `<p>` que não sejam subtítulo ou descrição auxiliar ficam na cor padrão
- Textos em `TableCell` ficam em `text-sm` e cor primária por padrão
- Não editar `src/components/ui/*` sem permissão explícita
- Manter estados de loading, disabled, success, empty e error explícitos
- Não esconder mudança de domínio ou permissão atrás de mudança visual

## Áreas principais

- `src/app/(app)/**` e `src/components/**`
- UIs de domínio: inbox, calendar, comunidades, users/org/units/teams/groups
- Hooks e estado cliente: `src/hooks/**`

## Workflow

1. Revisar requisitos no nível da rota e padrões de UI existentes
2. Implementar usando componentes existentes e convenções de espaçamento/tipografia
3. Verificar estados de loading/error e desabilitação de ações async
4. Confirmar contratos de API e formatos de payload usados por hooks/components

## Armadilhas comuns

- Regressões visuais por bypass de componentes compartilhados
- Ações async sem estado disabled/loading
- Efeitos colaterais implícitos em fluxos assistidos por AI

## Quando a tarefa for ambígua

Preserve a linguagem de design estabelecida da área tocada em vez de inventar um novo padrão local.

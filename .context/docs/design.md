# Regras de Design e UI para Agentes

Este documento é um guia operacional para implementação e revisão de UI. Ele complementa `AGENTS.md` e não substitui as regras canônicas.

## Regras na estrutura de montagem das telas

1. Não utilizar `src/components/ui/card.tsx` para estruturar páginas.
2. Em telas de estado vazio (quando ainda não existe conteúdo criado), utilizar sempre:

- Componente `src/components/ui/empty.tsx` como padrão de empty state.
- Se a tela de estado vazio necessitar de uma ação de criar algum conteúdo, o componente `src/components/ui/empty.tsx` deve ter um botão (variant="primary" size="sm" ) para realizar esta ação (Exemplo: Criar grupo, Criar equipe, Criar Unidade, etc).
- Nas telas de estado vazio nnão se aplica nenhum outro elemento na tela que não seja o item mencionado acima.

## Tipografia e texto

- Não adicionar classes extras de tamanho, peso ou cor em `h1` até `h6`.
- Textos em `<p>` que não sejam subtítulo ou descrição auxiliar devem usar a cor padrão.
- Textos em `TableCell` devem ficar em `text-sm` e cor primária por padrão.
- Se houver dúvida entre “seguir o padrão atual” e “inventar novo estilo”, siga o padrão atual do domínio.

## Regras de Iconografia

1. Biblioteca de ícones oficial: `https://lucide.dev`.
2. O ícone que representam entidades da aplicação:

- Grupos de usuários: `Component`.
- Equipes: `Users`.
- Usuários: `Users`.
- Usuário: `User`.
- Unidades: `House`.
- Organização: `Building2`.
- Botão de "Criar", "Novo", "Adicionar": `CirclePlus`.

## Componentes compartilhados

- Não editar `src/components/ui/*` sem solicitação explícita.
- Prefira compor a partir dos componentes existentes em vez de criar variações paralelas.
- Não introduza um padrão visual novo em uma tela isolada se o domínio já tiver linguagem própria.

## Estados de UX obrigatórios

- Ações assíncronas devem refletir loading.
- Botões de envio, AI ou mutação devem ser desabilitados durante a operação quando isso evitar duplicidade.
- Fluxos relevantes devem tratar empty state, error state e success feedback com clareza.
- Em falhas de AI, mostrar erro curto e genérico ao usuário.

## Mudanças em UI com impacto arquitetural

- Se a UI implica regra de negócio, valide o módulo de domínio e o route handler correspondente.
- Se a UI toca lifecycle de usuários, permissões ou escopo multi-tenant, revise impacto em auth e segurança antes de concluir.
- Não esconder mudança estrutural atrás de ajuste visual.

## Revisão visual antes de concluir

- A mudança respeita o padrão visual existente da área?
- Há consistência de espaçamento, alinhamento e hierarquia?
- O estado de loading/erro está explícito?
- Heading, parágrafos e células de tabela seguem as regras acima?
- A mudança exigiu editar `components/ui` sem autorização? Se sim, reavalie.

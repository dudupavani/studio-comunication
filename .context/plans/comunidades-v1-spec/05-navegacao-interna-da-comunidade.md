# 05 — Navegação Interna da Comunidade

## Contexto
Ao acessar uma comunidade, a V1 exige uma estrutura de navegação interna com sidebar à esquerda, feed e listagem de espaços.

## Objetivo da etapa
Implementar o shell interno da comunidade para navegação entre feed e espaços.

## Relação com o todo
Essa estrutura é o núcleo de usabilidade do módulo e prepara a expansão futura de conteúdo por espaço.

## Escopo
- Criar layout interno da comunidade com sidebar própria.
- Exibir na sidebar:
  - item **Feed** da comunidade.
  - lista de espaços existentes.
  - ação de **Criar espaço** (quando autorizado).
- Definir roteamento interno para:
  - feed consolidado da comunidade.
  - visualização por espaço selecionado.
- Garantir comportamento consistente com comunidades com muitos espaços (rolagem/listagem lateral).

## Não pode quebrar
- Navegação geral do app.
- Layout base e experiência de módulos existentes.
- Comportamento de seleção de comunidade definido na etapa 1.

## Resultado esperado
- Usuário entra em uma comunidade e consegue navegar entre feed e espaços pela sidebar interna.

## Critérios de aceite
- Sidebar interna renderiza feed + espaços + ação de criar espaço.
- Troca de contexto entre feed e espaço funciona sem inconsistência.
- Comunidades com muitos espaços permanecem navegáveis.

## Dependências
- Etapas 1, 3 e 4.

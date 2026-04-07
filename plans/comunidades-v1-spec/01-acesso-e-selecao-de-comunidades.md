# 01 — Acesso e Seleção de Comunidades

## Contexto
O fluxo começa ao clicar em **Comunidades** na sidebar principal. A entrada do módulo exige uma experiência de seleção de comunidade já existente, com alternativa de criação quando não houver registros.

## Objetivo da etapa
Estabelecer o ponto de entrada do módulo com modal de seleção de comunidades, incluindo estado vazio inicial.

## Relação com o todo
Sem essa etapa, o usuário não consegue entrar no contexto de uma comunidade para usar feed/espaços.

## Escopo
- Adicionar item **Comunidades** no fluxo de navegação principal.
- Definir rota/base do módulo de comunidades.
- Implementar modal de seleção de comunidades existentes.
- Exibir estado vazio com CTA de criação quando não houver comunidade.
- Aplicar controle de exibição de ações conforme permissão de criação.

## Não pode quebrar
- Navegação atual da sidebar principal.
- Regras atuais de acesso por role em outros módulos.
- Fluxos existentes de segmentação no restante do sistema.

## Resultado esperado
- Usuário entra no módulo e visualiza seleção de comunidades.
- Em cenário sem comunidades, existe caminho explícito para criar a primeira (para perfis autorizados).

## Critérios de aceite
- Menu **Comunidades** acessível na sidebar principal.
- Modal abre ao entrar no módulo.
- Lista comunidades existentes corretamente.
- Estado vazio aparece sem erro quando não há comunidades.
- Usuários não autorizados não visualizam ações de gestão indevidas.

## Dependências
- Nenhuma.

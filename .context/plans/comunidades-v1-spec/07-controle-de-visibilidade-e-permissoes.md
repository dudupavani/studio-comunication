# 07 — Controle de Visibilidade e Permissões

## Contexto
A principal regra de negócio do módulo é garantir que comunidade, espaços e feed respeitem segmentação e permissões por role.

## Objetivo da etapa
Aplicar e validar as regras de visibilidade (global/segmentada) e de ação (gestão/postagem) em todo o módulo.

## Relação com o todo
Sem essa etapa, o módulo pode expor comunidades/espaços indevidamente e violar isolamento de público.

## Escopo
- Implementar leitura de comunidade por visibilidade:
  - global: todos da organização.
  - segmentada: apenas públicos definidos (grupo/equipe).
- Aplicar herança de visibilidade dos espaços.
- Definir comportamento do feed para consolidar apenas itens de espaços visíveis ao usuário.
- Aplicar configuração por comunidade de postagem para `unit_master`/`unit_user`.
- Garantir que alteração de segmentação reflita em acessos subsequentes.

## Não pode quebrar
- Isolamento por organização.
- Políticas atuais de segmentação já existentes no software.
- Permissões globais de gestão por role definidas na spec.

## Resultado esperado
- Usuários veem apenas comunidades/espaços/feed compatíveis com seu público.
- Perfis de gestão mantêm capacidades administrativas previstas.

## Critérios de aceite
- Usuário fora da segmentação não acessa comunidade segmentada.
- Espaços seguem exatamente a visibilidade herdada da comunidade.
- Feed não mistura conteúdos de espaços sem permissão.
- Regras de postagem para `unit_master`/`unit_user` respeitam configuração da comunidade.

## Dependências
- Etapas 2, 3, 5 e 6.

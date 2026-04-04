# 04 — Experiência de Gestão de Comunidades

## Contexto
Após habilitar gestão no backend, a UI precisa permitir que usuários autorizados criem e mantenham comunidades com clareza.

## Objetivo da etapa
Entregar os fluxos de interface para criar, editar e excluir comunidades, incluindo configuração de segmentação.

## Relação com o todo
Esta etapa conecta o usuário autorizado às regras já implementadas, tornando o módulo operacional na prática.

## Escopo
- Modal/formulário de criação de comunidade.
- Fluxo de edição de comunidade com ajuste de segmentação.
- Fluxo de exclusão de comunidade com confirmação.
- Campos de configuração:
  - tipo global/segmentada.
  - segmentação por grupo/equipe.
  - permitir postagem de `unit_master`/`unit_user`.
- Estados de loading/erro/sucesso alinhados ao padrão da aplicação.

## Não pode quebrar
- Padrões visuais e componentes existentes da aplicação.
- Comportamento de permissões já aplicado no backend.
- Fluxos de outros módulos da sidebar principal.

## Resultado esperado
- Perfis autorizados conseguem gerenciar comunidades ponta a ponta pela UI.
- Perfis sem permissão não acessam ações de gestão.

## Critérios de aceite
- Criação via UI gera comunidade válida.
- Edição atualiza segmentação e configuração de postagem.
- Exclusão remove comunidade com feedback ao usuário.
- Campos e validações refletem as regras da spec macro.

## Dependências
- Etapas 1 e 3.

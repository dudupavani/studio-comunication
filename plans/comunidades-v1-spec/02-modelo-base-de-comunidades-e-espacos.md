# 02 — Modelo Base de Comunidades e Espaços

## Contexto
A V1 precisa de estrutura persistida para comunidade, espaço e segmentação, sem implementar conteúdos internos dos espaços.

## Objetivo da etapa
Definir e versionar o modelo de dados base para comunidades/espaços, incluindo regras de unicidade, herança de segmentação e flags de postagem.

## Relação com o todo
Essa etapa fornece a fundação para CRUD, visibilidade e navegação interna das próximas etapas.

## Escopo
- Definir entidade de **Comunidade** com:
  - nome.
  - tipo (`global` ou `segmentada`).
  - estratégia de segmentação (grupo/equipe quando segmentada).
  - configuração de postagem para `unit_master` e `unit_user`.
- Definir entidade de **Espaço** com:
  - tipo (`publicacoes` ou `eventos`).
  - vínculo obrigatório com comunidade.
- Definir armazenamento da segmentação da comunidade para herança em espaços.
- Definir regra de unicidade de nome (com decisão explícita de escopo).
- Versionar schema em migrations e atualizar tipagem Supabase (`src/types/supabase.ts` e reexports).

## Não pode quebrar
- Estruturas existentes de posts e eventos.
- Módulos atuais de mensagens/comunicados/chats.
- Contratos atuais de permissões e segmentações já em produção.

## Resultado esperado
- Estrutura de banco pronta para operar comunidades/espaços com integridade e tipagem alinhada no app.

## Critérios de aceite
- Migrations criadas e aplicáveis sem conflito com schema atual.
- Tipos de banco atualizados e compilando.
- Comunidade e espaço podem ser persistidos com vínculo válido.
- Regras de validação de tipo e segmentação aplicadas no modelo.

## Dependências
- Etapa 1.

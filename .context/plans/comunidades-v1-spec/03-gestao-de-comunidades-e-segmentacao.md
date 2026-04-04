# 03 — Gestão de Comunidades e Segmentação

## Contexto
Com o modelo base pronto, é necessário viabilizar operações de gestão da comunidade com regras de permissão e segmentação.

## Objetivo da etapa
Disponibilizar criação, edição, exclusão e alteração de segmentação de comunidades para perfis autorizados.

## Relação com o todo
Sem gestão de comunidades, não há como estruturar os espaços e o feed por contexto organizacional.

## Escopo
- Implementar operações de:
  - criar comunidade.
  - editar dados da comunidade.
  - excluir comunidade.
  - alterar tipo/estratégia de segmentação após criação.
- Garantir que somente `platform_admin`, `org_admin` e `org_master` executem gestão.
- Validar consistência de segmentação:
  - comunidade global sem alvo segmentado.
  - comunidade segmentada com alvos válidos por grupo/equipe.
- Garantir tratamento de unicidade de nome.

## Não pode quebrar
- Regras atuais de auth/roles da aplicação.
- Isolamento por organização.
- APIs e fluxos existentes fora do módulo de comunidades.

## Resultado esperado
- Backend/serviços de comunidades operando com segurança e regras de negócio completas da spec.

## Critérios de aceite
- Operações de CRUD de comunidade funcionam para perfis autorizados.
- Perfis não autorizados recebem bloqueio consistente.
- Segmentação pode ser alterada após criação.
- Nome duplicado é recusado conforme regra definida.

## Dependências
- Etapa 2.

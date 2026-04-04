# Etapa 09 - Validação e Hardening

## Objetivo

Garantir que o desmembramento não introduziu regressões e deixar o módulo pronto para evolução.

## O que precisa ser feito

- Rodar validações técnicas:
  - `npm run typecheck -- --pretty false`
  - lint local do escopo alterado (quando aplicável)
- Validar manualmente fluxos críticos:
  - seleção/troca de comunidade
  - CRUD de espaços
  - abrir composer
  - título obrigatório para publicar
  - upload de capa com crop
  - upload de imagem
  - upload de anexo com bloqueio de executáveis/zip
  - remoção de arquivos e fechamento de modal
- Revisar warnings de acessibilidade em diálogos aninhados.
- Revisar imports cíclicos e contratos de props.

## Comportamento esperado

- Equivalência funcional com o estado anterior do produto.
- Melhor legibilidade, modularidade e manutenção.

## Como fecha o plano

Consolida o refactor com segurança e fornece base para próximas features no composer e timeline sem inflar novamente um único arquivo.

## Critérios de aceite

- Sem regressões confirmadas nos fluxos acima.
- Estrutura modular estável e previsível.


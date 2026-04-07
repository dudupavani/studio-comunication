# Master Plan — Comunidades V1

## Resumo da feature
Implementar a base do módulo **Comunidades** para comunicação organizacional com segmentação por público, estrutura de **Espaços** e navegação interna com **Feed** consolidado (estrutura de navegação, sem conteúdo V1).

## Objetivo geral
Entregar infraestrutura funcional para:
- criar, editar e excluir comunidades.
- definir comunidade global ou segmentada por grupo/equipe.
- criar, editar e excluir espaços por tipo.
- navegar por feed e espaços com permissões e visibilidade corretas.

## Resultado final esperado
- Módulo acessível pelo menu principal.
- Modal de seleção de comunidades ao entrar no módulo.
- Fluxo completo de CRUD de comunidades e espaços para perfis autorizados.
- Sidebar interna de comunidade com feed + espaços + ação de criar espaço.
- Regras de visibilidade e herança de segmentação aplicadas.
- Nenhuma regressão em funcionalidades existentes, segmentações atuais e permissões atuais.

## Etapas sequenciais
1. `01-acesso-e-selecao-de-comunidades.md`
2. `02-modelo-base-de-comunidades-e-espacos.md`
3. `03-gestao-de-comunidades-e-segmentacao.md`
4. `04-experiencia-de-gestao-de-comunidades.md`
5. `05-navegacao-interna-da-comunidade.md`
6. `06-gestao-de-espacos-por-tipo.md`
7. `07-controle-de-visibilidade-e-permissoes.md`
8. `08-hardening-validacao-e-preparo-para-expansao.md`

## Dependência entre etapas
- Etapa 1 inicia o ponto de entrada do módulo e o fluxo de seleção.
- Etapa 2 cria a base de domínio que sustenta as etapas 3 a 7.
- Etapa 3 depende da etapa 2 para habilitar CRUD/segmentação de comunidades.
- Etapa 4 depende da etapa 3 para expor gestão de comunidades na UI.
- Etapa 5 depende das etapas 3 e 4 para renderizar comunidade selecionada.
- Etapa 6 depende das etapas 2 e 5 para gerir espaços no contexto da comunidade.
- Etapa 7 depende das etapas 2, 3, 5 e 6 para garantir isolamento por visibilidade.
- Etapa 8 depende de todas as anteriores para fechamento com validação de regressão.

## Notas de coerência com a spec original
- Fora de escopo de conteúdos (publicações/eventos internos), comentários, reações, chats e cursos permanece preservado.
- Segmentação e permissões atuais do sistema devem continuar sem alteração de comportamento.
- Pontos em aberto da spec (escopo de unicidade de nome e comportamento do modal para não autorizados) são tratados como decisões explícitas de implementação.

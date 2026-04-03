# Comunicados Feed V1 — Tarefas Sequenciais

## Objetivo
Quebrar a refatoração de `comunicados` em tarefas pequenas, sequenciais e seguras, preservando segmentação, permissões, isolamento por organização e reaproveitando o máximo possível da arquitetura atual.

## Sequência de execução

### 1. Preparar o modelo de post para o V1
- Objetivo: adaptar a entidade atual de `announcements` para suportar o formato de post do feed, incluindo mídia de foto no card e compatibilidade futura com vídeo.
- Onde mexe: `database/migrations`, `src/types/supabase.ts`, `src/lib/supabase/types.ts`, `src/lib/messages/announcement-entities.ts`.
- Validação: typecheck limpo; registros legados continuam legíveis mesmo sem mídia; modelagem não quebra leitura atual.
- Dependências: nenhuma.

### 2. Definir a estratégia de migração do legado
- Objetivo: transformar comunicados antigos em posts sem trocar de tabela e sem perda de visibilidade.
- Onde mexe: migration aditiva e, se necessário, script SQL de backfill em `database/migrations`.
- Validação: todos os `announcements` existentes continuam aparecendo como posts; campos novos recebem fallback seguro.
- Dependências: tarefa 1.

### 3. Refatorar os loaders do módulo para o conceito de feed
- Objetivo: fazer o carregamento de `Feed` e `Meus enviados` usar a mesma base de post, em ordem cronológica e sem duplicar lógica.
- Onde mexe: `src/lib/messages/inbox.ts`, `src/lib/messages/announcement-entities.ts`.
- Validação: feed lista apenas posts visíveis ao usuário; `Meus enviados` lista apenas posts do autor; ordenação por data correta.
- Dependências: tarefas 1 e 2.

### 4. Preservar e endurecer as regras de acesso no novo fluxo
- Objetivo: garantir que detalhe, edição e exclusão respeitem as regras finais do V1: autor, `org_master` e `platform_admin`, sem quebrar segmentação atual.
- Onde mexe: `src/lib/messages/announcement-access.ts`, rotas em `src/app/api/messages/announcements/**`, páginas de edição.
- Validação: colaborador comum apenas visualiza/curte; autor edita/apaga; `org_master` edita/apaga; acesso cross-org continua bloqueado.
- Dependências: tarefa 3.

### 5. Criar a página de detalhe do post
- Objetivo: substituir o fluxo centrado em modal por uma página de detalhe com conteúdo completo, reaproveitando a lógica de acesso existente.
- Onde mexe: `src/app/(app)/comunicados/**`, especialmente rota de detalhe nova e componentes ligados ao detalhe.
- Validação: clique no card abre página; usuário sem acesso não visualiza; visualização completa funciona para legado e novos posts.
- Dependências: tarefas 3 e 4.

### 6. Refatorar a listagem principal para o novo feed
- Objetivo: transformar a aba principal em `Feed`, com card de post contendo autor, data, imagem opcional e trecho.
- Onde mexe: `src/app/(app)/comunicados/page.tsx`, `src/app/(app)/comunicados/components/MessagesAnnouncements.tsx`, `AnnouncementCard.tsx` e componentes auxiliares.
- Validação: feed cronológico funcional; card exibe trecho e mídia quando houver; sem regressão de visibilidade.
- Dependências: tarefas 3 e 5.

### 7. Refatorar a aba "Meus enviados"
- Objetivo: substituir a tabela administrativa por uma experiência coerente com o feed, filtrada pelo autor autenticado.
- Onde mexe: `src/app/(app)/comunicados/components/MessagesAnnouncements.tsx`, `SentAnnouncementsTable.tsx` ou equivalente substituto.
- Validação: autor vê seus próprios posts; ações de editar/apagar aparecem só para perfis permitidos; itens legados continuam acessíveis.
- Dependências: tarefas 3, 4 e 6.

### 8. Simplificar o V1 removendo comentários e share da experiência
- Objetivo: retirar comentários e qualquer affordance de compartilhamento da UI e do fluxo principal, sem apagar dados legados desnecessariamente.
- Onde mexe: `AnnouncementModal.tsx` ou seu substituto, componentes de detalhe, rotas de comentários e contratos de UI.
- Validação: usuário não encontra UI de comentário/share; dados antigos permanecem preservados; nenhuma rota crítica do módulo depende disso para funcionar.
- Dependências: tarefas 5 e 6.

### 9. Manter curtida como única interação social do V1
- Objetivo: restringir interações a like, reaproveitando `announcement_reactions` sem abrir novas formas de engajamento.
- Onde mexe: componentes de card/detalhe e rotas de reações.
- Validação: usuário comum consegue curtir/descurtir conforme regra atual; nenhuma outra reação social é exposta.
- Dependências: tarefas 5 e 6.

### 10. Refatorar criação e edição para o modelo de post
- Objetivo: adaptar os formulários para "criar post" e "editar post", mantendo segmentação atual por usuários, grupos e equipes, além de preservar agendamento existente.
- Onde mexe: `src/app/(app)/comunicados/novo/page.tsx`, `NewAnnouncementForm.tsx`, `EditAnnouncementForm.tsx`, `src/lib/messages/validations.ts`, rotas de create/update.
- Validação: criação e edição publicam posts segmentados corretamente; agendamento continua funcionando; V1 aceita foto e não expõe comentários/share.
- Dependências: tarefas 1, 3, 4, 6 e 9.

### 11. Desacoplar métricas da dependência atual de notificações
- Objetivo: manter métricas no módulo sem depender de novas notificações para calcular destinatários, visualizações e curtidas.
- Onde mexe: `src/app/api/messages/announcements/[announcementId]/metrics/route.ts`, componentes de métricas e eventuais helpers.
- Validação: métricas continuam coerentes para posts antigos e novos; cálculo de destinatários não quebra quando o feed deixar de criar notificações novas.
- Dependências: tarefas 2, 3 e 10.

### 12. Ajustar o fluxo de publicação para não depender de notificações no V1
- Objetivo: manter a publicação do post funcional sem introduzir novas notificações como requisito do feed.
- Onde mexe: `src/app/api/messages/announcements/route.ts`, `src/app/api/messages/announcements/[announcementId]/route.ts`.
- Validação: criação e edição continuam funcionando; feed não depende de `notifications` para exibir conteúdo; outros módulos não sofrem regressão.
- Dependências: tarefas 10 e 11.

### 13. Fechar integração, regressão e validação do módulo
- Objetivo: validar o módulo inteiro após a refatoração, com foco em permissões, segmentação, isolamento por organização e compatibilidade do legado.
- Onde mexe: testes, checks e revisão final dos fluxos de `comunicados`.
- Validação: `npm run typecheck` limpo; `npm run test` limpo; fluxos de feed, detalhe, enviados, like, edição e legado funcionando; chat e outros módulos intactos.
- Dependências: todas as tarefas anteriores.

## Ordem recomendada de implementação
1. Tarefas 1 e 2
2. Tarefas 3 e 4
3. Tarefas 5, 6 e 7
4. Tarefas 8 e 9
5. Tarefas 10, 11 e 12
6. Tarefa 13

## Observações de escopo
- V1 implementa apenas foto como mídia.
- O modelo deve ser preparado para vídeo no V2, mas sem UI, upload ou reprodução nesta entrega.
- Comentários legados podem permanecer armazenados, mas ficam fora da experiência principal do V1.
- Agendamento permanece suportado, porque já existe no fluxo atual.

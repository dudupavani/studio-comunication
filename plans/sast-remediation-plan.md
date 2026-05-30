# Plano de Correcao SAST

**Data:** 2026-05-29  
**Origem:** Relatorio SAST executado no workspace local  
**Status:** pendente  
**Regra de execucao:** corrigir em ordem, com code review e testes apos cada correcao antes de avancar para a proxima.

---

## Contexto

A analise estatica encontrou riscos em areas de maior impacto: exclusao permanente de usuarios exposta na UI/API de clientes, gravacao de chats fora da RPC canonica, validacao incompleta de tenant scope, drift de schema Supabase, possivel escalada de papel em convites, superficie XSS em rich text e vulnerabilidades em dependencias.

Este plano nao altera codigo por si so. Ele define a sequencia de correcao e os criterios minimos para aceitar cada etapa.

---

## Regras gerais para todas as etapas

- Nao tocar em `src/app/(app)/comunicados` nem usar esse modulo como referencia, salvo pedido explicito.
- Preservar mudancas existentes do usuario no worktree.
- Antes de cada alteracao, ler os arquivos envolvidos e confirmar o comportamento atual.
- Apos cada correcao:
  - rodar os testes focados da area alterada;
  - rodar `npm run typecheck -- --pretty false` quando tocar chats, mensagens ou schema Supabase;
  - fazer code review local da diff antes de prosseguir;
  - registrar qualquer risco residual.
- Apos modificar codigo nesta sessao, rodar `graphify update .` se `graphify-out/graph.json` existir.

---

## Etapa 1 - Remover exposicao de exclusao permanente de usuarios

**Severidade:** critica  
**Objetivo:** garantir que clientes tenham apenas as acoes padrao `Desativar` e `Remover`, e que exclusao permanente fique restrita a operacao interna de `platform_admin`.

### Problema

- `src/app/api/admin/users/[id]/route.ts` permite hard delete para `org_admin`.
- A rota chama `auth.admin.deleteUser`.
- Componentes de UI chamam a rota de hard delete e exibem texto de exclusao permanente.
- Isso conflita com a regra canonica do projeto: exclusao permanente nao deve ser exposta na UI de clientes.

### Acoes

1. Localizar todos os pontos de entrada para hard delete:
   - `/api/admin/users/[id]`
   - componentes de dialog/action de usuario
   - server actions relacionadas a `deleteUser`
2. Alterar a rota de hard delete para aceitar somente `platform_admin`.
3. Remover ou ocultar qualquer trigger de hard delete da UI padrao.
4. Garantir que a acao visivel `Remover` execute apenas remocao de vinculos da organizacao, preservando `auth.users`, `profiles` e historico.
5. Ajustar textos da UI para nao prometer exclusao permanente em fluxos de cliente.

### Testes necessarios

- Teste de API:
  - usuario nao autenticado recebe 401;
  - `unit_user`, `unit_master`, `org_admin` e `org_master` recebem 403 na rota de hard delete;
  - `platform_admin` consegue executar a operacao excepcional.
- Teste de UI:
  - usuario gestor ve `Desativar` e `Remover`, mas nao ve acao de exclusao permanente;
  - `Remover` nao chama `/api/admin/users/[id]`.
- Teste de server action:
  - remocao de org limpa vinculos esperados e nao chama `auth.admin.deleteUser`.

### Code review obrigatorio

- Confirmar que nenhum componente de cliente importa ou dispara hard delete.
- Confirmar que o texto "excluir permanentemente" nao aparece em UI de cliente.
- Confirmar que a rota de hard delete nao aceita `org_admin`.
- Confirmar que nao houve mudanca em `components/ui`.

### Criterio de aceite

- Hard delete existe apenas como caminho interno para `platform_admin`.
- UI padrao expoe somente `Desativar` e `Remover`.
- Testes focados passam.

---

## Etapa 2 - Corrigir gravacao de mensagens para usar RPC canonica

**Severidade:** critica  
**Objetivo:** garantir que toda mensagem de chat seja salva por `create_chat_message_with_mentions`, preservando consistencia de mencoes.

### Problema

- `src/app/api/messages/messages/route.ts` insere diretamente em `chat_messages`.
- A regra do projeto exige RPC para mensagens.
- A rota usa service role em fluxos de gestores, aumentando o risco de bypass das garantias de banco.

### Acoes

1. Mapear todos os inserts em `chat_messages`.
2. Substituir inserts diretos por chamadas a `create_chat_message_with_mentions`.
3. Adaptar payloads para incluir mencoes quando aplicavel.
4. Garantir que erros da RPC sejam tratados sem expor detalhes sensiveis.
5. Preservar notificacoes de `chat.message_received` apos sucesso da RPC.

### Testes necessarios

- Teste de rota para mensagem em grupo:
  - cria chat;
  - chama RPC para a mensagem;
  - nao chama `.from("chat_messages").insert`.
- Teste de rota para mensagem individual:
  - cria chats por destinatario;
  - chama RPC para cada mensagem;
  - publica notificacoes somente apos sucesso.
- Teste de falha:
  - erro da RPC retorna resposta coerente e nao cria notificacao.
- Rodar `npm run typecheck -- --pretty false`.

### Code review obrigatorio

- Confirmar que nao restou insert direto em `chat_messages` em rotas de chat.
- Confirmar que mencoes continuam indo para `chat_message_mentions` via RPC.
- Confirmar que a ordem transacional minimiza estados parciais.
- Confirmar que logs nao incluem conteudo sensivel desnecessario.

### Criterio de aceite

- Nenhum fluxo ativo de chat salva mensagem direto em `chat_messages`.
- RPC canonica e usada para mensagens.
- Testes focados e typecheck passam ou ha justificativa documentada para qualquer falha externa a etapa.

---

## Etapa 3 - Validar tenant scope de destinatarios em mensagens

**Severidade:** critica  
**Objetivo:** impedir que IDs de usuarios fora da organizacao ativa sejam incluidos como destinatarios.

### Problema

- `userIds` do payload sao validados como UUID, mas nao ha garantia estatica de pertencimento a `auth.orgId`.
- A rota resolve grupos e equipes por `auth.orgId`, mas aceita `userIds` diretos no conjunto final.

### Acoes

1. Criar ou reutilizar helper server-side para validar que todos os `userIds` pertencem a `auth.orgId`.
2. Rejeitar payload quando qualquer destinatario direto estiver fora da organizacao.
3. Remover duplicados e excluir o proprio remetente apos a validacao de escopo.
4. Garantir que platform admin tambem opere dentro de um `orgId` explicito e validado.

### Testes necessarios

- `userIds` da mesma org: permitido.
- `userIds` de outra org: 403 ou 400, sem criar chat.
- `userIds` mistos: rejeitar todo o request, sem criacao parcial.
- `groupIds` e `teamIds` continuam filtrados por org.
- Rodar `npm run typecheck -- --pretty false`.

### Code review obrigatorio

- Confirmar que a validacao acontece antes de criar chat, members ou mensagens.
- Confirmar que service role nao e usado para aceitar destinatarios fora do tenant.
- Confirmar que mensagens de erro nao revelam dados de outras organizacoes.

### Criterio de aceite

- Nao ha caminho para inserir `chat_members` com usuario fora da org ativa.
- Testes de isolamento multi-tenant passam.

---

## Etapa 4 - Alinhar schema Supabase, migrations e tipos de chat/notificacoes

**Severidade:** critica  
**Objetivo:** tornar auditavel o contrato real de banco usado por chats e notificacoes.

### Problema

- `npm run typecheck -- --pretty false` falha em `chats`, `chat_members`, `chat_messages`, `chat_message_mentions`, `get_unread_chat_notifications` e tipos de notificacao.
- `database/supabase-audit/latest.md` indica drift critico entre banco remoto, migrations e `src/types/supabase.ts`.

### Acoes

1. Confirmar o projeto Supabase canonico antes de regenerar tipos.
2. Backfill de migrations ausentes para:
   - `chats`
   - `chat_members`
   - `chat_messages`
   - `chat_message_mentions`
   - `create_chat_message_with_mentions`
   - `get_unread_chat_notifications`
   - enums/tipos de notificacao usados por chat.
3. Atualizar `src/types/supabase.ts` como unica fonte do tipo `Database`.
4. Garantir que `src/lib/supabase/types.ts` apenas reexporte os tipos permitidos.
5. Rodar auditoria Supabase local existente quando aplicavel.

### Testes necessarios

- `npm run typecheck -- --pretty false`.
- Testes de mensagens/chats.
- Testes de notificacoes de chat.
- Auditoria Supabase:
  - `npm run audit:supabase` se o ambiente estiver configurado;
  - se nao estiver, registrar o bloqueio.

### Code review obrigatorio

- Confirmar que migrations estao em `database/migrations` no formato `YYYYMMDD_descricao_snake_case.sql`.
- Confirmar que RLS/RPCs preservam tenant scope.
- Confirmar que tipos nao foram ajustados manualmente contra um banco errado.
- Confirmar que nenhuma tabela de reacao por modulo foi criada indevidamente.

### Criterio de aceite

- Typecheck limpo para as areas de chat/schema.
- Migrations e tipos representam o contrato usado pelo app.
- Drift critico conhecido foi resolvido ou reclassificado com evidencia.

---

## Etapa 5 - Restringir criacao de papeis privilegiados em convites

**Severidade:** media/alta  
**Objetivo:** impedir escalada lateral de privilegio por convite.

### Problema

- `src/app/api/users/invite-magic/route.ts` aceita `org_admin` e `org_master` no body.
- `org_admin` e `org_master` podem gerenciar usuarios.
- Se o fluxo de finalizacao aplicar `invited_role`, um gestor pode convidar outro usuario com papel privilegiado.

### Acoes

1. Definir matriz de permissao para convidar papeis:
   - `platform_admin`: pode convidar papeis privilegiados;
   - `org_admin/org_master`: por padrao, limitar a papeis nao superiores, preferencialmente `unit_user` e regras explicitas para `unit_master`.
2. Validar `invitedRole` contra o papel do ator e a org alvo.
3. Garantir que `finalize-invite` revalide o papel antes de aplicar metadados.
4. Retornar erro generico para tentativa de papel nao autorizado.

### Testes necessarios

- `org_admin` nao consegue convidar `org_admin`/`org_master` se a politica definida nao permitir.
- `platform_admin` consegue convidar papel privilegiado.
- `finalize-invite` nao aplica papel privilegiado sem autorizacao valida.
- Payload sem `role` continua usando default seguro.

### Code review obrigatorio

- Confirmar validacao tanto no invite quanto na finalizacao.
- Confirmar que o papel nao e confiado apenas por metadado do link.
- Confirmar que logs nao vazam dados sensiveis do convite.

### Criterio de aceite

- Nao ha caminho de convite para elevar privilegio sem permissao explicita.
- Testes focados passam.

---

## Etapa 6 - Endurecer superficie XSS de rich text

**Severidade:** media  
**Objetivo:** reduzir risco em conteudo HTML editavel sem quebrar a experiencia de comunicacao ativa.

### Problema

- `RichTextEditor` escreve `innerHTML`.
- Sanitizacao existe com DOMPurify, mas allowlist permite `style`, `class`, `id` e `img/src`.

### Acoes

1. Revisar onde o HTML de rich text e renderizado e salvo.
2. Remover atributos perigosos ou desnecessarios da allowlist:
   - avaliar remocao de `style`, `class`, `id`;
   - restringir `img/src` a protocolos seguros e, se aplicavel, a storage permitido.
3. Garantir sanitizacao na entrada e na saida quando conteudo vier do banco.
4. Adicionar testes de payloads XSS comuns.

### Testes necessarios

- Remove event handlers: `onerror`, `onclick`, `onload`.
- Remove protocolos perigosos: `javascript:`, `data:` quando nao permitido.
- Remove tags proibidas: `script`, `iframe`, `object`, `form`.
- Mantem tags basicas esperadas: `p`, `strong`, `em`, listas, links seguros.

### Code review obrigatorio

- Confirmar que nao foi introduzido `dangerouslySetInnerHTML` sem sanitizacao.
- Confirmar que o editor nao salva HTML nao sanitizado apos comandos de toolbar.
- Confirmar que mudancas nao tocam `components/ui`.

### Criterio de aceite

- Sanitizador tem allowlist minima e testada.
- Payloads XSS conhecidos sao neutralizados.

---

## Etapa 7 - Corrigir vulnerabilidades de dependencias

**Severidade:** critica/alta conforme pacote  
**Objetivo:** reduzir risco de supply chain e vulnerabilidades conhecidas em runtime.

### Problema

`npm audit --omit=dev --audit-level=low` reportou 90 vulnerabilidades, incluindo:

- `protobufjs`: critica;
- `next@16.0.10`: alta, varios advisories;
- `@ckeditor/ckeditor5-*`: XSS;
- `tmp`, `picomatch`, `path-to-regexp`, `minimatch`: altas.

### Acoes

1. Priorizar pacotes em runtime:
   - `next`;
   - `@ckeditor/ckeditor5-*`;
   - `protobufjs` e cadeia `genkit`/Google AI;
   - pacotes de parsing/glob usados em producao.
2. Atualizar dentro do menor range seguro possivel.
3. Evitar `npm audit fix --force` sem revisar breaking changes.
4. Se CKEditor estiver sendo substituido pelo editor ativo, avaliar remocao da dependencia em vez de upgrade.
5. Rodar build e testes apos cada grupo de updates.

### Testes necessarios

- `npm run typecheck -- --pretty false`.
- `npm run lint`.
- `npm run build`.
- Testes de paginas/fluxos que usam editor, AI ou upload.
- Reexecutar `npm audit --omit=dev --audit-level=low`.

### Code review obrigatorio

- Revisar `package.json` e lockfile.
- Confirmar que nenhuma major/breaking change foi aceita sem ajuste de codigo.
- Confirmar que dependencias nao usadas foram removidas quando seguro.

### Criterio de aceite

- Vulnerabilidades criticas eliminadas.
- Altas justificadas ou corrigidas.
- App compila e testes relevantes passam.

---

## Ordem recomendada de execucao

1. Etapa 1 - hard delete de usuarios.
2. Etapa 2 - RPC canonica de mensagens.
3. Etapa 3 - tenant scope de destinatarios.
4. Etapa 4 - Supabase schema/migrations/types.
5. Etapa 5 - convites e papeis privilegiados.
6. Etapa 6 - XSS/rich text.
7. Etapa 7 - dependencias.

Etapas 2, 3 e 4 sao acopladas. Se o typecheck bloquear a Etapa 2 ou 3 por tipos ausentes, executar primeiro o minimo da Etapa 4 necessario para destravar chats, mantendo a ordem logica de risco no review.

---

## Checklist final de encerramento

- `npm run lint`
- `npm run typecheck -- --pretty false`
- testes unitarios/API focados nas areas alteradas
- `npm run build`
- `npm audit --omit=dev --audit-level=low`
- `graphify update .` se `graphify-out/graph.json` existir
- revisao final procurando:
  - `auth.admin.deleteUser`;
  - inserts diretos em `chat_messages`;
  - usos de `createServiceClient` sem validacao previa de tenant;
  - `dangerouslySetInnerHTML`/`innerHTML`;
  - rotas legadas `/api/admin/users`.

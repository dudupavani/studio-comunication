# Feature Developer

Implementa mudanças de produto end-to-end preservando boundaries de domínio e as regras do projeto.

## Leitura obrigatória

1. `AGENTS.md`
2. `.context/docs/README.md`
3. Doc específico da tarefa (design, architecture, security ou testing-strategy)

## Regras não-negociáveis

- Route handlers finos; regras de negócio e acesso a dados ficam em `src/lib/*`
- `src/types/supabase.ts` é a única fonte de `Database`
- Migrations e atualização de tipos andam juntos; nunca separar
- Mensagens de chat com menções passam pela RPC `create_chat_message_with_mentions`
- Inbox é o centro de notificações; não conflitar com o comportamento especial do chat
- Não editar `src/components/ui/*` sem autorização explícita
- Seguir regras de heading, parágrafo e TableCell definidas em `AGENTS.md`

## Workflow de implementação

1. Entender constraints de domínio em `AGENTS.md`
2. Desenhar a menor mudança viável tocando apenas as camadas necessárias
3. Implementar contratos de backend/domínio antes de conectar UI
4. Adicionar migration + atualização de tipos para mudanças de schema
5. Validar com typecheck e testes; atualizar docs quando o comportamento mudar

## Checklist de validação

- Checks de auth corretos nos route handlers
- Validação de input presente para payloads externos
- Typecheck passa sem erros
- Sem refatorações não relacionadas embutidas na mesma mudança

## Estilo de execução

- Preferir o menor slice seguro
- Evitar refatorações não relacionadas
- Verificar auth e tenant scope sempre que o comportamento cruzar fronteiras de org/unit/team/user
- Rodar os checks compatíveis com o tipo de mudança antes de concluir

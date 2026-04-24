## Codex agent rules

## Base compartilhada de contexto

- `AGENTS.md` é a fonte canônica de regras do projeto.
- `.context/` é uma base compartilhada de apoio para agentes; ela não substitui `AGENTS.md`.
- Antes de mudanças relevantes, consulte `.context/docs/README.md` e siga o doc específico por tarefa:
  - UI/UX: `.context/docs/design.md`
  - fluxo de domínio, API ou schema: `.context/docs/architecture.md`
  - validação e checks: `.context/docs/development-workflow.md` e `.context/docs/testing-strategy.md`
  - revisão de segurança/permissão: `.context/docs/security.md`
- Em caso de conflito, `AGENTS.md` prevalece sobre qualquer outro documento.

- **Módulos ocultos / arquivados**
  - O caminho `src/app/(app)/comunicados` está oculto do produto e fora do escopo padrão de implementação.
  - Para agentes de código, trate esse módulo como inexistente por padrão: não editar, corrigir, refatorar, migrar, importar, reutilizar nem citar esse fluxo como referência arquitetural, a menos que a tarefa peça explicitamente reativação ou manutenção nele.
  - A mesma regra vale para código de suporte cujo propósito principal seja atender esses módulos, mesmo quando estiver fora desses diretórios.
  - Quando a tarefa envolver navegação, permissões, busca, dashboards, notificações ou documentação, prefira remover ou ocultar pontos de entrada para esses módulos sem apagar o código arquivado.
  - Se uma mudança tocar infraestrutura compartilhada ainda usada pelo app ativo, preserve compatibilidade sem expandir acoplamento com módulos arquivados.

- **Supabase schema**
  - `src/types/supabase.ts` é a única fonte do tipo `Database`.
  - `src/lib/supabase/types.ts` apenas reexporta `Database/Json/Tables/Enums` a partir desse arquivo.
  - Sempre que novas tabelas/funções forem adicionadas ao banco, atualize `src/types/supabase.ts` e reexporte delas por `src/lib/supabase/types.ts`.

- **Migrations**
  - Adicione migrations no diretório `database/migrations`.
  - Siga o padrão já usado no repositório: `YYYYMMDD_descricao_snake_case.sql`.
  - Regras de schema que impactem o app (ex.: tabelas de chats, funções RPC, policies RLS) devem ser versionadas ali.

- **Reações (arquitetura compartilhada)**
  - O núcleo oficial de reações é composto por `reaction_targets`, `reactions` e `reaction_counters`.
  - Para publicações de comunidades, o vínculo com o alvo de reação é feito por `community_space_post_reaction_targets`.
  - Novos módulos com reação devem integrar nesse núcleo compartilhado; não criar tabela de reação por módulo sem necessidade excepcional e explícita.
  - Fluxos de API devem validar tenant scope e acesso ao recurso antes de inserir/remover reação.

- **Chats / menções**
  - A tabela `chat_message_mentions` e a RPC `create_chat_message_with_mentions` já existem no banco; use-as para qualquer ajuste de chats.
  - As rotas de chat sempre salvam mensagens via RPC para garantir consistência das menções; não insira direto em `chat_messages`.

- **Typecheck**
  - Antes de entregar mudanças em mensagens/chats ou no schema Supabase, rode `npm run typecheck -- --pretty false` e garanta que está limpo.

- **Notificações / Inbox**
  - A central de notificações é o módulo `inbox`, que concentra notificações e conteúdos recentes.
  - O módulo de `chat` é a única exceção: possui notificações próprias devido à dinâmica distinta, apesar de reutilizar a mesma infraestrutura base quando necessário.

- **UI**
  - Textos em `<p>` que NÃO forem subtítulos/descrições auxiliares devem usar a cor padrão (primary); não setar classe de cor manualmente nesses casos.
  - Textos dentro de `TableCell` usam, por padrão, cor primária (sem classe de cor explícita) e tamanho `text-sm`.
  - Elementos de heading (`h1` ... `h6`) não devem receber classes adicionais de tamanho, peso de fonte, font-size ou cor; usar apenas o estilo padrão.

- **Usuários / lifecycle**
  - Estados conceituais: `ativo`, `desativado`, `removido da organização/arquivado` e `excluído permanentemente`.
  - Na UI padrão só existem as ações **Desativar** e **Remover**:
    - **Desativar**: usuário perde acesso e deixa de aparecer em fluxos da organização, mas todo conteúdo/histórico permanece visível (podendo aparecer como “usuário desativado”).
    - **Remover**: remove vínculos do usuário com a organização (org_members, unidades, equipes etc.), fazendo-o sumir da UI da org; o registro base (auth.users/profiles) e o histórico continuam existindo para fins de auditoria e relatórios.
  - **Exclusão permanente** é operação excepcional, interna à plataforma (platform_admin), e deve usar a service role + `auth.admin.deleteUser` no projeto correto; não expor essa ação na UI de clientes.

## Padrões para integrações de AI (Groq / LLMs)

- **Cliente HTTP dedicado**
  - Centralizar chamadas em um cliente único (ex.: `src/lib/ai/clients/groq.ts`), em vez de espalhar `fetch` pela aplicação.
  - Ler apenas as envs necessárias (ex.: `GROQ_API_KEY`) e nunca logar valores de chaves.
  - Implementar timeout explícito (AbortController) para cada requisição de rede.
  - Tratar `!response.ok` com mensagens claras (incluindo status), sem expor payloads sensíveis.

- **Modelos**
  - Manter o identificador do modelo em uma constante única (`DEFAULT_MODEL`) no cliente de AI.
  - Ao trocar ou descontinuar modelos, atualizar só essa constante e registrar o motivo aqui.
  - Evitar hardcode de modelo em múltiplos pontos; sempre passar pelo cliente.

- **Funções de domínio (ex.: `correctText`)**
  - Validar tipo e conteúdo de entrada (string não vazia, limite de tamanho) antes da chamada à LLM.
  - Aplicar truncamento explícito com indicação visual (como `…`) quando passar do limite.
  - Construir prompts determinísticos, com prefixo fixo e regras claras de comportamento da LLM.
  - Retornar apenas o dado útil ao domínio (ex.: texto corrigido), já normalizado (`trim` etc.).
  - Logar erros internos com um prefixo claro (ex.: `INTERNAL_AI_ERROR`) e relançar o erro original; o mapeamento para mensagens genéricas deve ser feito na camada de rota/API.

- **Rotas HTTP para AI**
  - Validar payload de entrada e responder `400` para inputs inválidos.
  - Impor timeout máximo de operação (ex.: `Promise.race` com timeout) além do timeout do cliente HTTP.
  - Logar erros de orquestração com um prefixo próprio (ex.: `ROUTE_AI_ERROR`) antes de responder.
  - Sempre responder JSON com `Content-Type: application/json` e códigos `200/4xx/5xx` coerentes.

- **Frontend / UX para ações de AI**
  - Botões de AI devem desabilitar durante a requisição e exibir estado de carregamento.
  - Evitar efeitos colaterais implícitos (ex.: não enviar automaticamente após usar AI, a menos que isso faça parte da especificação).
  - Em falhas, exibir toasts curtos e genéricos (sem detalhes técnicos ou mensagens de erro da LLM).

- **Diagnóstico**
  - Sempre inspecionar logs da plataforma (ex.: Vercel) para messages como `INTERNAL_AI_ERROR`/`ROUTE_AI_ERROR` antes de alterar código.
  - Muitos 500 em rotas de AI tendem a ser causados por envs ausentes, problemas de rede ou modelo inválido; verificar essas três coisas primeiro.

- **Componentes de UI**
  ## Componentes de UI
  - Não customizar componentes da pasta `components/ui` (ex.: `sheet.tsx`, `button.tsx`) a menos que isso seja explicitamente solicitado.

## graphify

Este projeto tem um grafo de conhecimento do graphify em `graphify-out/`.

Regras:
- Se `graphify-out/GRAPH_REPORT.md` existir, leia esse arquivo antes de responder perguntas de arquitetura ou codebase.
- Se `graphify-out/wiki/index.md` existir, navegue pela wiki em vez de ler arquivos brutos sem necessidade.
- Para perguntas cross-module do tipo "como X se relaciona com Y", prefira `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"` ou `graphify explain "<conceito>"` em vez de `grep`.
- Após modificar arquivos de código nesta sessão, rode `graphify update .` para manter o grafo atualizado quando `graphify-out/graph.json` existir.

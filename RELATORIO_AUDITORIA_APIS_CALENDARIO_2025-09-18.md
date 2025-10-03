# Relatório de Auditoria de APIs de Calendário — 2025-09-18

## 1. Sumário Executivo

- **Escopo:** A auditoria cobriu 5 endpoints (`GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) distribuídos em 2 arquivos de rota (`/api/calendar/events` e `/api/calendar/events/[id]`).
- **Tecnologia:** As rotas são implementadas em Next.js (App Router) com TypeScript, usando o runtime `nodejs` padrão. A persistência é feita via Supabase.
- **Autenticação e Autorização:** Todos os endpoints exigem autenticação, obtida via `getAuthContext`. A autorização é baseada no `org_id` do usuário, garantindo que um usuário só possa ver ou modificar dados da sua própria organização. Não há checagens de roles mais granulares (ex: `org_admin`, `unit_master`).
- **Validação de Entrada:** A validação é manual e inconsistente. Faltam validações robustas (como Zod) para os corpos de `POST`/`PATCH`, e a validação de datas é básica, representando um risco de dados malformados.
- **Principal Risco de Segurança:** Qualquer usuário autenticado de uma organização pode **deletar ou modificar qualquer evento** da mesma organização, pois a autorização não verifica o criador do evento (`created_by`) ou um role específico. Isso é explicitamente notado como um comentário no código de `DELETE`.
- **Tratamento de Erros:** O tratamento de erros é genérico. Erros do Supabase são logados no console do servidor, mas o cliente recebe uma mensagem padrão "Failed to...", o que é bom para segurança (não vaza detalhes), mas ruim para depuração no lado do cliente.
- **Side Effects:** As rotas executam operações `CRUD` diretas na tabela `calendar_events`. Não há chamadas a serviços externos ou webhooks.
- **Oportunidade (Quick Win):** A introdução de um schema de validação (Zod) para os payloads de `POST` e `PATCH` aumentaria significativamente a robustez e a segurança dos dados sem alterar a lógica de negócio.

## 2. Matriz de Endpoints

| Rota HTTP | Arquivo/Fonte | Autenticação | Autorização | Entradas (Query/Body) | Saídas (Status/Shape) | Efeitos Colaterais (DB) | Observações |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/calendar/events` | `events/route.ts` | Sim, `getAuthContext` | `orgId` do usuário (opcional) | Query: `from`, `to`, `orgId`, `unitId` | `200` `{data, error}`<br>`400` `{data, error}`<br>`401` `{data, error}`<br>`403` `{data, error}`<br>`500` `{data, error}` | `SELECT` em `calendar_events` | Valida intervalo de datas (máx 90 dias). |
| `POST /api/calendar/events` | `events/route.ts` | Sim, `getAuthContext` | Requer `orgId` no contexto | Body: `title`, `start_time`, `end_time`, `all_day`, `color`, `unit_id`, `metadata` | `201` `{data, error}`<br>`400` `{data, error}`<br>`401` `{data, error}`<br>`500` `{data, error}` | `INSERT` em `calendar_events` | Validação manual e básica dos campos. |
| `GET /api/calendar/events/[id]` | `events/[id]/route.ts` | Sim, `getAuthContext` | `org_id` do evento vs `orgId` do usuário | Path: `id` | `200` `{data, error}`<br>`401` `{data, error}`<br>`403` `{data, error}`<br>`404` `{data, error}`<br>`500` `{data, error}` | `SELECT` em `calendar_events` | A autorização ocorre *após* a busca do evento. |
| `PATCH /api/calendar/events/[id]` | `events/[id]/route.ts` | Sim, `getAuthContext` | `org_id` do evento vs `orgId` do usuário | Path: `id`<br>Body: (parcial do evento) | `200` `{data, error}`<br>`400` `{data, error}`<br>`401` `{data, error}`<br>`403` `{data, error}`<br>`404` `{data, error}`<br>`500` `{data, error}` | `UPDATE` em `calendar_events` | Qualquer usuário da org pode editar qualquer evento. |
| `DELETE /api/calendar/events/[id]` | `events/[id]/route.ts` | Sim, `getAuthContext` | `org_id` do evento vs `orgId` do usuário | Path: `id` | `204` No Content<br>`401` `{data, error}`<br>`403` `{data, error}`<br>`404` `{data, error}`<br>`500` `{data, error}` | `DELETE` em `calendar_events` | Qualquer usuário da org pode deletar qualquer evento. |

## 3. Análise por Arquivo

### 3.1. `src/app/api/calendar/events/route.ts`

- **Caminho do Arquivo:** `src/app/api/calendar/events/route.ts`
- **Rotas Derivadas:** `GET /api/calendar/events`, `POST /api/calendar/events`
- **Exports:** `export async function GET`, `export async function POST`. Nenhum export de configuração de runtime (`dynamic`, `revalidate`, etc.).

---

#### **`GET /api/calendar/events`**

- **Fluxo Resumido:**
  1. Extrai `from`, `to`, `orgId`, `unitId` da URL.
  2. Valida a presença de `from` e `to`.
  3. Valida se o intervalo entre `from` e `to` é de no máximo 90 dias.
  4. Obtém o contexto de autenticação (`authContext`) via Supabase.
  5. Rejeita se não houver usuário autenticado.
  6. Rejeita se o `orgId` da query for diferente do `orgId` do usuário.
  7. Constrói uma query `SELECT` na tabela `calendar_events`.
  8. Filtra por `start_time` >= `from` e `end_time` <= `to`.
  9. Adiciona filtros opcionais para `org_id` e `unit_id`.
  10. Executa a query e retorna os dados ou um erro genérico.

- **Entradas e Validação:**
  - **Query Params:** `from` (string), `to` (string), `orgId` (string, opcional), `unitId` (string, opcional).
  - **Validação:** Manual. Verifica a presença de `from` e `to`. Usa a função `isValidDateRange` para checar se as datas são válidas e se o intervalo não excede 90 dias. **Risco:** A validação de formato da data é feita com `new Date()`, que pode ser permissiva demais.

- **Saídas:**
  - `200 OK`: `{ data: CalendarEvent[], error: null }`
  - `400 Bad Request`: `{ data: null, error: "Missing required parameters..." }` ou `{ data: null, error: "Invalid date range..." }`
  - `401 Unauthorized`: `{ data: null, error: "Unauthorized" }`
  - `403 Forbidden`: `{ data: null, error: "Forbidden" }`
  - `500 Internal Server Error`: `{ data: null, error: "Failed to fetch..." }` ou `{ data: null, error: "Internal server error" }`

- **Autenticação e Autorização:**
  - **Autenticação:** `const authContext = await getAuthContext(supabase);` obtém o usuário da sessão (provavelmente de um cookie).
  - **Autorização:** A query é implicitamente protegida por RLS (Row-Level Security) do Supabase, pois `createClient()` é usado. Além disso, há uma checagem explícita que impede um usuário de consultar um `orgId` que não seja o seu: `if (orgId && orgId !== authContext.orgId)`.

- **Dependências:**
  - Internas: `lib/supabase/server`, `lib/auth-context`.
  - Externas: `next/server`.

- **Efeitos Colaterais:** Apenas leitura (`SELECT`) da tabela `calendar_events`.

- **Tratamento de Erros:** Usa `try/catch` para erros inesperados. Erros do Supabase são logados no `console.error` e uma mensagem genérica é retornada ao cliente.

- **Riscos e Quick Wins:**
  - **Risco:** A query usa `.lte("end_time", to)`, o que pode excluir eventos que começam dentro do intervalo mas terminam depois. A lógica correta geralmente é `start_time <= to` e `end_time >= from`.
  - **Quick Win:** Adicionar TSDoc à função `isValidDateRange` para clarificar a lógica.

---

#### **`POST /api/calendar/events`**

- **Fluxo Resumido:**
  1. Obtém o contexto de autenticação.
  2. Rejeita se não houver usuário ou se o usuário não pertencer a uma organização.
  3. Parseia o corpo da requisição (`request.json()`).
  4. Extrai os campos do evento do corpo.
  5. Valida a presença de `title`, `start_time`, `end_time`.
  6. Valida o formato das datas `start_time` e `end_time`.
  7. Constrói um payload para inserção, usando o `orgId` e `userId` do contexto de autenticação.
  8. Executa um `INSERT` na tabela `calendar_events`.
  9. Retorna o evento recém-criado.

- **Entradas e Validação:**
  - **Body:** `{ title, start_time, end_time, all_day?, color?, unit_id?, metadata? }`.
  - **Validação:** Manual e muito básica. Verifica a presença dos campos obrigatórios e o formato das datas com `isNaN(new Date(...).getTime())`. **Risco:** Não há validação de tipo, formato (ex: `color` como hex), ou conteúdo para os campos. Um payload malicioso ou malformado pode ser parcialmente inserido no banco.

- **Saídas:**
  - `201 Created`: `{ data: CalendarEvent, error: null }`
  - `400 Bad Request`: `{ data: null, error: "Missing required fields..." }` ou outras mensagens de validação.
  - `401 Unauthorized`: `{ data: null, error: "Unauthorized" }`
  - `500 Internal Server Error`: `{ data: null, error: "Failed to create..." }`

- **Autenticação e Autorização:**
  - **Autenticação:** `getAuthContext` é usado para identificar o usuário.
  - **Autorização:** O endpoint exige que o usuário tenha um `orgId` associado. O novo evento é automaticamente vinculado ao `orgId` e `userId` do autor, o que é uma boa prática de segurança.

- **Dependências:**
  - Internas: `lib/supabase/server`, `lib/auth-context`.
  - Externas: `next/server`.

- **Efeitos Colaterais:**
  - **Tabela:** `calendar_events`
  - **Operação:** `INSERT`
  - **Campos Inseridos:** `org_id`, `unit_id`, `title`, `start_time`, `end_time`, `all_day`, `color`, `metadata`, `created_by`.

- **Tratamento de Erros:** Padrão similar ao `GET`, com `try/catch` e mensagens genéricas para o cliente.

- **Riscos e Quick Wins:**
  - **Risco Grave:** A falta de validação robusta no `body` é o principal risco.
  - **Quick Win:** Introduzir um schema Zod para validar o `body` da requisição. Isso tornaria a validação declarativa, segura e fácil de manter.

### 3.2. `src/app/api/calendar/events/[id]/route.ts`

- **Caminho do Arquivo:** `src/app/api/calendar/events/[id]/route.ts`
- **Rotas Derivadas:** `GET /api/calendar/events/:id`, `PATCH /api/calendar/events/:id`, `DELETE /api/calendar/events/:id`
- **Exports:** `export async function GET`, `PATCH`, `DELETE`.

---

#### **`GET /api/calendar/events/[id]`**

- **Fluxo Resumido:**
  1. Obtém o contexto de autenticação. Rejeita se não autenticado.
  2. Busca o evento na tabela `calendar_events` pelo `id` do path.
  3. Se não encontrar, retorna `404 Not Found`.
  4. **Após a busca**, compara o `org_id` do evento com o `orgId` do usuário no `authContext`.
  5. Se não baterem, retorna `403 Forbidden`.
  6. Se tudo estiver ok, retorna o evento.

- **Entradas e Validação:**
  - **Path Params:** `id` (string, UUID). Nenhuma validação explícita do formato do UUID.

- **Saídas:**
  - `200 OK`: `{ data: CalendarEvent, error: null }`
  - `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

- **Autenticação e Autorização:**
  - **Autenticação:** Padrão com `getAuthContext`.
  - **Autorização:** Realizada no código da aplicação *após* o `SELECT`. Embora a RLS do Supabase provavelmente já impeça o acesso, a checagem dupla é uma defesa em profundidade.

- **Dependências:** `lib/supabase/server`, `lib/auth-context`, `next/server`.

- **Efeitos Colaterais:** Apenas leitura (`SELECT`) da tabela `calendar_events`.

- **Riscos e Quick Wins:**
  - **Risco (Menor):** Fazer a checagem de autorização após a query pode ser considerado menos eficiente, mas a RLS deve mitigar o risco de vazamento de dados.
  - **Quick Win:** Adicionar um comentário explicando que a RLS é a primeira linha de defesa na autorização.

---

#### **`PATCH /api/calendar/events/[id]`**

- **Fluxo Resumido:**
  1. Obtém o contexto de autenticação.
  2. Busca o `org_id` e `created_by` do evento existente para autorização.
  3. Se não encontrar, retorna `404 Not Found`.
  4. Compara o `org_id` do evento com o do usuário. Se diferente, retorna `403 Forbidden`.
  5. Parseia o `body` da requisição.
  6. Valida o formato das datas, se presentes.
  7. Constrói dinamicamente um `updatePayload` apenas com os campos fornecidos no `body`.
  8. Adiciona `updated_at` e `updated_by` ao payload.
  9. Se nenhum campo útil foi fornecido, retorna `400 Bad Request`.
  10. Executa o `UPDATE` na tabela `calendar_events`.
  11. Retorna o evento atualizado.

- **Entradas e Validação:**
  - **Path Params:** `id`.
  - **Body:** Parcial do evento.
  - **Validação:** Manual e mínima. Apenas valida formato de datas. **Risco:** Mesma falta de validação robusta do `POST`. Um campo `title: null` ou `color: "invalid"` seria aceito.

- **Saídas:**
  - `200 OK`: `{ data: CalendarEvent, error: null }`
  - `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

- **Autenticação e Autorização:**
  - **Autorização:** Verifica se o usuário pertence à mesma organização do evento. **Não verifica se o usuário é o criador do evento ou se tem um role de administrador.**
  - **Risco de Segurança:** Qualquer usuário da organização pode editar qualquer evento.

- **Efeitos Colaterais:**
  - **Tabela:** `calendar_events`
  - **Operação:** `UPDATE`
  - **Campos Atualizáveis:** `title`, `start_time`, `end_time`, `all_day`, `color`, `unit_id`, `metadata`, `updated_at`, `updated_by`.

- **Riscos e Quick Wins:**
  - **Risco Grave:** Autorização permissiva demais.
  - **Risco:** Validação de entrada fraca.
  - **Quick Win:** Implementar um schema Zod com `.partial()` para validar o payload do `PATCH`.

---

#### **`DELETE /api/calendar/events/[id]`**

- **Fluxo Resumido:**
  1. Obtém o contexto de autenticação.
  2. Busca o `org_id` do evento para autorização.
  3. Se não encontrar, retorna `404 Not Found`.
  4. Compara o `org_id` do evento com o do usuário. Se diferente, retorna `403 Forbidden`.
  5. Executa `DELETE` na tabela `calendar_events` para o `id` fornecido.
  6. Retorna `204 No Content`.

- **Entradas e Validação:**
  - **Path Params:** `id`.

- **Saídas:**
  - `204 No Content`: Sucesso, sem corpo.
  - `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

- **Autenticação e Autorização:**
  - **Autorização:** Idêntica ao `PATCH`. Verifica apenas a organização.
  - **Risco de Segurança:** O código contém um comentário que reconhece a falha: `// Currently, any user in the org can delete any event in the org.`.

- **Efeitos Colaterais:**
  - **Tabela:** `calendar_events`
  - **Operação:** `DELETE`

- **Riscos e Quick Wins:**
  - **Risco Grave:** Autorização inadequada permite que qualquer usuário apague dados de outros.
  - **Quick Win:** Adicionar um comentário JSDoc no topo da função `DELETE` alertando sobre a lógica de autorização permissiva, para que seja priorizada em uma futura sprint de correção.

## 4. Riscos & Gaps Transversais

1.  **Autorização Insuficiente (Crítico):** As rotas `PATCH` e `DELETE` permitem que qualquer usuário de uma organização modifique ou apague qualquer evento, independentemente de quem o criou ou de seu role. Isso pode levar à perda de dados acidental ou maliciosa.
2.  **Validação de Entrada Incompleta (Alto):** A ausência de uma biblioteca de validação como Zod para os payloads de `POST` e `PATCH` abre a porta para a inserção de dados malformados, inválidos ou incompletos, podendo causar bugs na UI ou corrupção de dados.
3.  **Lógica de Consulta de Intervalo Questionável (Médio):** A query `GET` usa `.gte("start_time", from)` e `.lte("end_time", to)`, o que não captura corretamente eventos que "cruzam" as bordas do intervalo (começam antes e terminam dentro, ou começam dentro e terminam depois). A lógica padrão para sobreposição de intervalos é `start_time <= to AND end_time >= from`.
4.  **Tratamento de Erros Genérico (Baixo):** Embora seguro, retornar sempre "Internal server error" ou "Failed to..." dificulta a depuração no frontend. Um sistema de códigos de erro (`error_code: "db_insert_failed"`) poderia ser mais útil.

## 5. Quick Wins (Sem Mudança de Comportamento)

- **Adicionar Schemas Zod (como documentação):** Definir os schemas Zod para os bodies de `POST` e `PATCH` e exportá-los. Mesmo sem usá-los para validação (para não alterar o comportamento), eles servem como documentação de tipos e preparam o terreno para a correção.
- **Melhorar Comentários e TSDoc:**
  - Adicionar TSDoc em todas as funções de rota (`GET`, `POST`, etc.) explicando seu propósito, parâmetros e o que retornam.
  - Adicionar um comentário na query de `GET /events` explicando a lógica de filtro de data atual e seu potencial problema.
  - Transformar o comentário sobre a autorização permissiva em `DELETE` em um TSDoc `@warning` mais formal.
- **Tipagem Explícita:** Criar e usar um tipo `CalendarEvent` para os payloads de retorno em vez de deixar o TypeScript inferi-lo de `data`.

## 6. Perguntas em Aberto

1.  Qual é a política de autorização desejada para `PATCH` e `DELETE`? Apenas o criador do evento pode modificar/apagar? Ou administradores (`org_admin`, `unit_master`) também podem?
2.  A lógica de consulta de eventos por intervalo de datas (`GET /events`) está funcionando como esperado ou a implementação que captura eventos sobrepostos é a desejada?
3.  A tabela `calendar_events` possui RLS (Row-Level Security) ativada no Supabase? A análise presume que sim, mas a confirmação é crucial para entender a postura de segurança real.
4.  Existem outros consumidores desta API além do próprio frontend da aplicação? A resposta pode influenciar a estratégia de versionamento se mudanças que quebram o contrato forem necessárias.

## 7. Apêndice

### Inventário de Arquivos

```
src/app/api/calendar/events/
├── [id]
│   └── route.ts  (173 linhas)
└── route.ts      (191 linhas)
```

### Mapa de Dependências

- **`src/app/api/calendar/events/route.ts`**
  - `../../../../lib/supabase/server`
  - `../../../../lib/auth-context`
  - `next/server`

- **`src/app/api/calendar/events/[id]/route.ts`**
  - `../../../../../lib/supabase/server`
  - `../../../../../lib/auth-context`
  - `next/server`

### Glossário de Tipos (Inferidos)

```typescript
// Tipo inferido para um evento de calendário, baseado nas queries e payloads.
interface CalendarEvent {
  id: string; // (UUID)
  created_at: string; // (timestamptz)
  updated_at: string; // (timestamptz)
  org_id: string; // (UUID)
  unit_id?: string | null; // (UUID)
  created_by: string; // (UUID, user id)
  updated_by?: string | null; // (UUID, user id)
  title: string;
  start_time: string; // (timestamptz)
  end_time: string; // (timestamptz)
  all_day: boolean;
  color?: string | null;
  metadata?: object | null; // (JSONB)
}

// Tipo inferido para o contexto de autenticação.
interface AuthContext {
  userId: string;
  orgId: string | null;
  // ... outros possíveis campos de sessão/role
}
```

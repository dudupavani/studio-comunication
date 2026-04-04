# Especificação de Comportamento — Correções de Segurança Auth

> Derivado do plano `swift-whistling-bumblebee.md`.  
> Este documento descreve o comportamento **esperado** após cada correção, incluindo pré-condições, pós-condições, fluxos principais, fluxos alternativos e o que **não deve** acontecer.

---

## C-1 — Middleware principal integra updateSession

### Contexto
`src/middleware.ts` roda em toda requisição. Atualmente só faz redirects legados de `/admin/*`. A função `updateSession` (em `src/lib/supabase/middleware.ts`) nunca é chamada.

### Comportamento esperado após a correção

**Usuário não autenticado acessando rota privada:**
- Requisição `GET /dashboard` sem cookie de sessão
- Middleware detecta `user = null`, rota não está em `publicPaths`
- Retorna redirect 307 para `/login`
- Nenhuma renderização de página privada ocorre

**Usuário autenticado acessando rota privada:**
- Requisição `GET /dashboard` com cookie de sessão válido
- Middleware verifica `user` com `getUser()` (chamada ao servidor Supabase)
- Cookie de sessão é renovado silenciosamente se próximo do vencimento
- Requisição passa normalmente, página renderiza

**Usuário autenticado acessando página de auth:**
- Requisição `GET /login` com sessão ativa
- Rota está em `publicPaths` mas não em `allowPublicPathWhenAuthenticated`
- Retorna redirect para `/dashboard`

**Usuário acessando `/reset-password` autenticado (fluxo de recovery):**
- Rota está em `allowPublicPathWhenAuthenticated`
- Middleware permite o acesso mesmo com sessão ativa
- Não redireciona para `/dashboard`

**Redirects legados preservados:**
- `GET /admin/users` → redirect 308 para `/users` (antes do auth check)
- Demais redirects `/admin/*` e `/orgs/*` continuam funcionando

**Rota raiz `/`:**
- Usuário não autenticado → `NextResponse.next()` (sem redirect para login)
- Usuário autenticado → comportamento conforme implementação existente da página

### O que NÃO deve acontecer
- Rota privada jamais renderiza para usuário sem sessão válida
- Middleware não deve chamar `getUser()` em rotas de assets `/_next/*`
- Redirects legados não devem ser afetados pela lógica de auth

---

## C-2 — getUser() em reset-password/page.tsx

### Contexto
`getSession()` lê o cookie sem validar o JWT com o servidor Supabase. Um token expirado ou revogado passa no guard.

### Comportamento esperado após a correção

**Sessão válida:**
- `getUser()` faz round-trip ao Supabase e retorna `user` populado
- Página renderiza `<ResetPasswordForm />`

**Sessão expirada ou cookie inválido:**
- `getUser()` retorna `user = null`
- `redirect('/login')` é executado antes de qualquer renderização
- Usuário jamais vê o formulário de redefinição

**Token revogado (ex: logout em outro dispositivo):**
- `getUser()` retorna erro ou `user = null`
- Mesmo comportamento: redirect para `/login`

### O que NÃO deve acontecer
- Formulário de reset jamais renderiza com sessão inválida
- Nenhuma informação da página é exposta antes do guard ser verificado

---

## C-3 — createServerClientWithCookies() em (auth)/callback

### Contexto
`(auth)/callback/route.ts` é o handler de convites. Usa `createClient()` (read-only) que silencia a gravação de cookies após `exchangeCodeForSession`.

### Comportamento esperado após a correção

**Fluxo de aceite de convite:**
1. Usuário clica no link do email de convite
2. Supabase redireciona para `(auth)/callback?code=xxx&next=/auth/force-password`
3. Handler chama `exchangeCodeForSession(code)` com cliente write-enabled
4. Sessão é estabelecida: cookie `sb-*-auth-token` gravado na resposta HTTP
5. `getUser()` retorna o usuário autenticado
6. Flag `must_set_password` é setada (via admin client — ver M-2)
7. Browser é redirecionado para `next` (`/auth/force-password`)
8. Página `/auth/force-password` encontra sessão válida nos cookies

**Code inválido ou expirado:**
- `exchangeCodeForSession` retorna erro
- Handler redireciona para `/auth/auth-code-error`
- Nenhum cookie de sessão é gravado

### O que NÃO deve acontecer
- Sessão não pode ser "trocada" mas não gravada (estado inconsistente)
- Após o redirect, a página destino não pode receber 401 por ausência de sessão

---

## H-1 — Remoção de Implicit Flow via query params em auth/callback

### Contexto
`auth/callback/route.ts` aceita `access_token` + `refresh_token` como query params, expondo tokens em logs de proxy, referrer headers e histórico de servidor.

### Comportamento esperado após a correção

**Fluxo PKCE (code):** inalterado, continua funcionando
**Fluxo OTP (token_hash):** inalterado, continua funcionando
**Fluxo de recovery:** inalterado (usa PKCE via `/auth/recovery`)

**Tentativa de Implicit Flow via query param:**
- URL: `/auth/callback?access_token=xxx&refresh_token=yyy`
- Nenhum dos blocos `code` ou `tokenHash` é ativado
- Handler cai no redirect de erro: `/login?message=Could not authenticate user`
- Tokens **não** são usados para estabelecer sessão

### O que NÃO deve acontecer
- Tokens em query params não podem mais autenticar um usuário
- Remoção não pode quebrar fluxo de recovery (que agora usa `code` via PKCE)

---

## H-2 — Validação de invited_role em finalize-invite

### Contexto
`invited_role` vem de `user_metadata` e é inserido diretamente em `org_members` sem validação de valor na camada de aplicação.

### Comportamento esperado após a correção

**Role válida (ex: `"member"`, `"org_admin"`, `"org_master"`):**
- Validação passa
- Insert em `org_members` prossegue normalmente

**Role inválida ou string arbitrária (ex: `"superadmin"`, `""`, `null`):**
- Validação Zod falha
- Retorna `400` com `{ ok: false, error: "invalid_role" }`
- Nenhum insert em `org_members` ocorre
- Log de erro registrado sem expor valor recebido

**Role ausente nos metadados:**
- Caminho de "sem metadados de convite" é ativado antes da validação
- Retorna `{ ok: true, noop: true, reason: "no-invite-metadata" }`

### Roles válidas (definir conforme enum do schema Supabase/DB)
```
member | org_admin | org_master
```
> Ajustar conforme o enum `org_role` na tabela `org_members`.

### O que NÃO deve acontecer
- String arbitrária jamais chega ao banco como valor de role
- Usuário jamais recebe mensagem de erro com detalhes técnicos do schema

---

## H-3 — Remoção de origin como fallback em sendPasswordResetEmail

### Contexto
Se `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL` estiverem ausentes, o header `Origin` da requisição é usado como base para o link de recovery — header manipulável em algumas configurações de proxy.

### Comportamento esperado após a correção

**Envs configuradas corretamente:**
- `NEXT_PUBLIC_SITE_URL=https://app.exemplo.com`
- `redirectTo` = `https://app.exemplo.com/auth/recovery`
- Email enviado com link correto

**Envs ausentes (local dev sem configuração):**
- Server action lança `Error("NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL must be set")`
- Nenhum email é enviado
- Desenvolvedor é alertado em desenvolvimento via stack trace
- Em produção, o erro é capturado pela plataforma (Vercel logs) antes de chegar ao usuário

**`.env.local` deve conter:**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:9002
```

### O que NÃO deve acontecer
- Header `Origin` jamais é usado como base de URL de redirect
- Link de recovery jamais aponta para domínio diferente do configurado nas envs

---

## H-4 — Verificação de sessão de recovery em updatePassword

### Contexto
`updatePassword` aceita qualquer usuário autenticado, não apenas quem veio do fluxo de recovery.

### Comportamento esperado após a correção

**Usuário vindo do fluxo de recovery (clicou no link do email):**
- Sessão possui `amr: [{ method: "recovery" }]`
- `updatePassword` aceita e aplica a nova senha
- Redireciona para `/dashboard`

**Usuário autenticado normalmente (sem recovery):**
- Sessão não possui método `recovery` no `amr`
- Retorna `{ error: "Sessão inválida para redefinição de senha." }`
- Senha não é alterada
- Frontend exibe mensagem de erro

**Usuário não autenticado:**
- `getUser()` retorna `user = null`
- Retorna erro ou redireciona para `/login`

### Nota sobre AMR no Supabase
O campo `amr` (Authentication Method Reference) está disponível via `session.user.amr` ou pode exigir decode manual do JWT. Verificar disponibilidade antes de implementar. Alternativa aceitável: campo `recovery_initiated_at` em `user_metadata` com TTL de 15 minutos (setado no fluxo de recovery, verificado aqui).

### O que NÃO deve acontecer
- Usuário logado normalmente jamais consegue trocar senha via este endpoint sem passar pelo fluxo de recovery
- Formulário de reset-password não deve ser acessível a usuários sem sessão de recovery ativa

---

## M-1 — Mensagens de erro genéricas no login e recovery

### Contexto
`signIn` e `sendPasswordResetEmail` retornam `error.message` direto do Supabase, permitindo user enumeration.

### Comportamento esperado após a correção

**Login com email inexistente:**
- Antes: `"User not found"` ou `"Invalid login credentials"`
- Depois: `"Email ou senha inválidos."`

**Login com senha errada:**
- Antes: `"Invalid login credentials"`
- Depois: `"Email ou senha inválidos."`

**Login com email não confirmado:**
- Antes: `"Email not confirmed"`
- Depois: `"Email ou senha inválidos."` (ou mensagem específica se o produto exigir distinção — discutir com produto)

**sendPasswordResetEmail com erro:**
- Antes: mensagem técnica do Supabase
- Depois: `"Não foi possível enviar o email. Tente novamente."`

### O que NÃO deve acontecer
- Atacante não pode distinguir entre "email não existe" e "senha errada" pela mensagem de erro
- Mensagens em inglês do Supabase jamais chegam ao usuário final

---

## M-2 + L-2 — app_metadata para must_set_password e alinhamento de nomes

### Contexto
`must_set_password` está em `user_metadata` (editável pelo usuário via SDK). `PasswordResetGate` verifica `must_reset_password` (nome errado), tornando o guard inativo.

### Comportamento esperado após a correção

**Fluxo de primeiro acesso via convite:**
1. `(auth)/callback` troca o code por sessão
2. Admin client seta `app_metadata: { must_set_password: true }` para o usuário
3. Redirect para `/auth/force-password`
4. `force-password/page.tsx` verifica `user.app_metadata?.must_set_password === true`
5. Página renderiza formulário de definição de senha
6. Após submit bem-sucedido, admin client seta `app_metadata: { must_set_password: false }`
7. Redirect para `/profile` (ou `/dashboard`)

**Tentativa de bypass via SDK client-side:**
- Usuário chama `supabase.auth.updateUser({ data: { must_set_password: false } })`
- Isso atualiza `user_metadata`, não `app_metadata`
- `force-password/page.tsx` lê `app_metadata` → flag ainda é `true`
- Bypass não funciona

**`PasswordResetGate` após correção:**
- Verifica `user.app_metadata?.must_set_password === true`
- Se `true`, redireciona para `/auth/force-password`
- Se `false` ou ausente, renderiza children normalmente
- Guard agora está ativo (estava desativado pelo nome errado)

**Migração de dados existentes:**
- Usuários que já têm `user_metadata.must_set_password = true` podem precisar ter o campo migrado para `app_metadata`
- Avaliar se há usuários no estado intermediário antes de fazer o deploy

### O que NÃO deve acontecer
- Usuário jamais acessa o app sem definir senha no primeiro login
- `user_metadata` não é mais usado como fonte de verdade para controle de fluxo obrigatório
- Os dois nomes (`must_reset_password` e `must_set_password`) não podem coexistir — o correto é `must_set_password`

---

## M-3 — createServerClientWithCookies() na action setPassword de force-password

### Contexto
A inline server action `setPassword` em `force-password/page.tsx` usa `createClient()` (read-only). Troca de senha pode aplicar no banco mas não atualizar o cookie de sessão.

### Comportamento esperado após a correção

**Definição de senha bem-sucedida:**
- `updateUser({ password })` executado com cliente write-enabled
- Cookie de sessão atualizado com novos tokens pós-mudança de senha
- Admin client limpa `must_set_password` em `app_metadata`
- Redirect para `/profile`
- Sessão permanece válida após o redirect

**Senha fraca (< 8 caracteres):**
- Erro retornado antes de chamar `updateUser`
- Formulário exibe mensagem de validação

### O que NÃO deve acontecer
- Sessão não pode ficar em estado inconsistente (senha trocada mas cookie antigo)
- Após redirect para `/profile`, usuário não deve ser deslogado

---

## M-4 — Remoção de lógica morta hasAccessToken no middleware

### Contexto
`request.nextUrl.hash` nunca chega ao servidor (hash é client-side only). A lógica `hasAccessToken` é código morto que cria falsa percepção de segurança.

### Comportamento esperado após a correção

**Qualquer requisição ao servidor:**
- `isAuthenticated` é determinado exclusivamente por `!!user` (resultado de `getUser()`)
- Não há ramo de código baseado em hash fragment no middleware

**Fluxo de magic link / implicit flow:**
- Hash fragment continua sendo tratado exclusivamente nas páginas client-side (`/auth/magic`, `/auth/recovery`)
- Middleware não tem responsabilidade sobre hash fragments

**`/auth/confirm` sem `hasAccessToken`:**
- A condição especial `if (pathname === "/auth/confirm" && hasAccessToken)` é removida
- `/auth/confirm` já está em `publicPaths` → middleware permite acesso normalmente

### O que NÃO deve acontecer
- Nenhum fluxo de auth existente pode ser quebrado pela remoção
- O middleware não pode mais ser "enganado" por hash fragments fabricados (mesmo que nunca chegassem ao servidor)

---

## M-5 — Logout protegido contra CSRF

### Contexto
`/auth/logout` aceita GET, permitindo que um link externo force o logout de um usuário via `<img src="/auth/logout">` ou `<a href>`.

### Comportamento esperado após a correção

**Opção preferida: remover handler GET**

**POST legítimo (formulário ou fetch do app):**
- `POST /auth/logout` executa `signOut()` e redireciona para `/login`
- Todos os botões/links de logout na UI devem usar `<form method="POST">` ou `fetch({ method: 'POST' })`

**GET de link externo (CSRF attempt):**
- Retorna `405 Method Not Allowed` (se GET for removido)
- Usuário não é deslogado

**Verificação prévia obrigatória:**
- Buscar todas as ocorrências de `/auth/logout` em `src/` antes de remover o GET
- Atualizar cada uso para POST
- Verificar se há links em emails transacionais que usam GET

### Componentes que provavelmente usam logout via link (verificar antes):
- Header/navbar com botão de logout
- Menu de usuário / dropdown de perfil
- Páginas de configuração de conta

### O que NÃO deve acontecer
- Usuário autenticado jamais pode ser deslogado por uma requisição GET originada de domínio externo
- Remoção do GET não pode quebrar fluxo de logout existente sem atualizar os pontos de chamada

---

## M-6 — Redução de dados nos logs de finalize-invite

### Contexto
Log de sucesso inclui `invitedBy` (user ID), `invitedOrgId` e `invitedRole`. IDs internos em plataformas de observabilidade podem vazar contexto organizacional.

### Comportamento esperado após a correção

**Log de sucesso:**
```
finalize-invite: success { userId: "uuid-do-usuario" }
```

**Log de erro (mantém contexto mínimo):**
```
finalize-invite: error { userId: "uuid", step: "insert_member" }
```

### O que NÃO deve acontecer
- `invitedBy`, `invitedOrgId`, `invitedRole` não aparecem mais em logs de plataforma
- Diagnóstico de problemas não fica impossibilitado — manter pelo menos o `userId` e o `step` que falhou

---

## L-1 — Remover orgId e role da resposta de finalize-invite

### Contexto
Resposta de sucesso retorna `{ ok: true, orgId, role }`. O cliente (`finalize-invite-csr.tsx`) ignora esses campos.

### Comportamento esperado após a correção

**Resposta de sucesso:**
```json
{ "ok": true }
```

**Verificação obrigatória antes de implementar:**
- Buscar todos os consumidores de `POST /api/auth/finalize-invite`
- Confirmar que nenhum usa `orgId` ou `role` da resposta
- Se algum consumidor usar, mover a lógica para um endpoint específico ou state local

### O que NÃO deve acontecer
- UUID interno da organização jamais trafega na resposta desnecessariamente
- Remoção não pode quebrar lógica de UI que porventura use esses campos

---

## L-3 — Log de erro em finalize-invite-csr

### Contexto
`.catch(() => {})` descarta silenciosamente falhas na chamada a `/api/auth/finalize-invite`.

### Comportamento esperado após a correção

**Falha na chamada (rede, 500, 401):**
- `console.error('[finalize-invite-csr] failed:', err)` é executado
- Erro aparece no console do browser (dev) e em plataformas de observabilidade (prod)
- UI não é afetada (comportamento invisível se mantém)

**Sucesso:**
- Nenhuma mudança de comportamento

### O que NÃO deve acontecer
- Falhas continuam silenciosas para o usuário (comportamento invisível intencional)
- Apenas o log deve ser adicionado — sem toasts, alerts ou mudanças de UI

---

## L-4 — Restrição de safeNext no auth/callback

### Contexto
`safeNext` aceita qualquer caminho relativo, permitindo redirect abuse para rotas internas sensíveis via link manipulado.

### Comportamento esperado após a correção

**`next` em lista de caminhos permitidos:**
- `next=/dashboard` → redireciona para `/dashboard` ✓
- `next=/reset-password` → redireciona para `/reset-password` ✓

**`next` fora da lista:**
- `next=/settings/danger` → redireciona para `/` (fallback)
- `next=//attacker.com` → redireciona para `/` (bloqueia protocol-relative)
- `next=https://attacker.com` → não inicia com `/`, já bloqueado pelo check atual

**Lista de caminhos permitidos sugerida:**
```typescript
const ALLOWED_NEXT_PATHS = ['/', '/dashboard', '/profile', '/reset-password'];
```
> Expandir conforme necessidade do produto.

### O que NÃO deve acontecer
- Link de convite ou recovery com `next` manipulado não pode redirecionar para página de admin ou configurações sensíveis
- Fluxos legítimos que usam `next` (recovery → `/reset-password`, invite → `/auth/force-password`) não podem ser quebrados — garantir que os caminhos usados estejam na lista permitida

---

## Resumo de estados finais esperados

| Item | Antes | Depois |
|------|-------|--------|
| Rota privada sem sessão | Renderiza | Redirect `/login` |
| `getSession()` no guard | JWT não validado | `getUser()` valida com servidor |
| Cookies pós-invite | Não gravados | Gravados corretamente |
| Tokens em query param | Autenticam | Ignorados (400/error redirect) |
| `invited_role` inválido | Vai para o banco | Rejeitado com 400 |
| URL de recovery com origin manipulado | Possível | Impossível (env obrigatória) |
| updatePassword sem recovery | Aceita | Rejeita com erro |
| Mensagem de erro no login | Específica (user enum) | Genérica |
| `must_set_password` bypass | Possível via SDK | Impossível (app_metadata) |
| `PasswordResetGate` | Inativo (nome errado) | Ativo |
| Sessão pós-setPassword | Pode ficar stale | Atualizada corretamente |
| Hash fragment no middleware | Código morto | Removido |
| Logout via GET externo | Funciona (CSRF) | 405 Method Not Allowed |
| IDs nos logs | Presentes | Removidos |
| orgId na resposta | Presente | Removido |
| Erro no finalize-invite-csr | Silencioso | Logado |
| `next=//attacker.com` | Redireciona | Bloqueado |

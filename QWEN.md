# Project Context for Qwen Code

- Responda sempre em Português do Brasil

## Project Overview

This is a **Next.js 15** application named "My Saas", functioning as a Firebase Studio starter kit. The main technology stack includes:

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives and `shadcn/ui` components (inferred from dependencies like `@radix-ui/*` and project structure)
- **State Management**: React Context (`use-auth-context.tsx`)
- **Authentication**: Supabase Auth (via `@supabase/auth-helpers-nextjs` and `@supabase/ssr`)
- **AI Integration**: Genkit with Google AI (Gemini 2.0 Flash)
- **Database**: Supabase (inferred from Supabase client usage)

The application structure suggests a SaaS product with user authentication, role-based access control (platform admin, organization roles, unit roles), and a dashboard.

## Key Directories and Files

- `src/app/`: Main application routes using the Next.js App Router.
  - `src/app/(app)/page.tsx`: Redirects to `/dashboard`.
  - `src/app/layout.tsx`: Root layout, includes global CSS, authentication provider, and toaster.
  - `src/app/api/me/route.ts`: API route to fetch the current user's authentication context.
- `src/hooks/`: Custom React hooks.
  - `src/hooks/use-auth-context.tsx`: Client-side React context for managing and accessing user authentication state and roles.
- `src/lib/`: Utility functions and shared logic.
  - `src/lib/auth-context.ts`: Server-side logic to fetch and structure the user's authentication context (user ID, platform role, organization role, organization ID, unit IDs) from Supabase.
  - `src/lib/supabase/server.ts`: Utility to create a Supabase server client with cookie handling.
- `src/ai/`: Genkit AI integration files.
  - `src/ai/genkit.ts`: Configures the Genkit AI instance with the Google AI plugin and sets the default model.
- `public/`: Static assets.
- `components/`: Likely contains shared UI components (shadcn/ui style).
- `docs/`: Project documentation (contents not explored).

## Building and Running

- **Development Server**: `npm run dev` (Starts Next.js dev server on port 9002 using Turbopack)
- **Build**: `npm run build` (Builds the Next.js application)
- **Start (Production)**: `npm run start` (Starts the built Next.js application)
- **Linting**: `npm run lint` (Runs Next.js linter)
- **Type Checking**: `npm run typecheck` (Runs TypeScript compiler without emitting files)
- **Genkit Development**: `npm run genkit:dev` (Starts Genkit development server)
- **Genkit Watch**: `npm run genkit:watch` (Starts Genkit development server with file watching)

## Development Conventions

- **Routing**: Uses the Next.js App Router structure (`src/app`).
- **Authentication**: Implements a custom authentication context (`useAuthContext`) built on top of Supabase Auth, providing user details and roles (platform, org, unit) both client-side and server-side.
- **Styling**: Uses Tailwind CSS with a custom font (Inter).
- **UI Components**: Likely follows `shadcn/ui` conventions for components, stored in `components/ui`.
- **AI**: Integrates Genkit for AI functionalities, configured in `src/ai`.

## Security Architecture & Multi-tenant Patterns

### 1. Authentication & Authorization System
- **Unified auth-context**: Use `src/lib/auth-context.ts` for all authentication needs
- **Multi-role support**: platform_admin, org_admin, org_master, unit_master, unit_user
- **Context data**: userId, platformRole, orgRole, orgId, unitIds

### 2. RLS (Row Level Security) Implementation
- **Table isolation**: Each organization's data is isolated using org_id as partition key
- **Policy enforcement**: All sensitive queries must respect org_id filters
- **Service role operations**: Must include org_id validation when using service role

### 3. Security Standards for org_members Table
- **Rule 1**: A user can only see/alter data from their own org_id
- **Rule 2**: platform_admin can operate across any organization
- **Rule 3**: No operation depends only on user_id - always validate org_id
- **Rule 4**: All SELECT/INSERT/UPDATE/DELETE use org_id filters
- **Rule 5**: No direct use of `supabaseAdmin.from("org_members")` - use admin module

### 4. Admin Operations Module
- **Location**: `src/lib/admin/org-members.ts`
- **Usage**: All service_role operations on org_members must go through this module
- **Functions**: `adminListMembers`, `adminUpdateMemberRole`, `adminRemoveMember`, `adminAddMember`, `adminGetMember`
- **Requirement**: Always include orgId as mandatory parameter

### 5. Data Access Patterns
- **Context validation**: Always load auth context first: `const auth = await getAuthContext();`
- **Org validation**: Verify resource org_id matches user's org_id: `resource.org_id === auth.orgId`
- **Permission validation**: Check role permissions before operations
- **Safe responses**: Return 403/404 without leaking resource existence

### 6. Client/Server Supabase Client Usage
- **Server Components**: Use `createServerClient()` for RLS enforcement
- **Service operations**: Use `createServiceClient()` for bypassing RLS (with org_id validation)
- **Authentication context**: Use `createServerClientWithCookies()` for auth-context (was createServerClientReadOnly())

### 7. File Structure & Naming Conventions
- **API routes**: Follow pattern `/api/[resource]/[id]/[operation]/route.ts`
- **Server components**: Use `.server.tsx` suffix for server-only components
- **Admin modules**: Place in `src/lib/admin/` directory
- **Auth utilities**: Keep in `src/lib/auth/` directory

### 8. Migration/Security Update Patterns
- **RLS migration**: Always drop and recreate policies to avoid recursive evaluation
- **Context unification**: Use single auth-context across entire application
- **Validation layer**: Add org_id validation before any data access
- **Backwards compatibility**: Use wrapper modules for backward compatibility (like the messages/auth-context wrapper)

### 9. Security Testing Approach
- **Cross-org access**: Verify no access to resources from different orgs
- **Role validation**: Ensure proper role-based access controls
- **Parameter validation**: All route params must be validated against org_id
- **Error responses**: Avoid information disclosure about resource existence

### 10. Critical Security Requirements
- **Multi-tenant isolation**: Never allow cross-org data access
- **Service role safety**: All service_role operations must validate org context
- **Direct table access**: Use admin modules instead of direct table operations
- **Legacy compatibility**: Use wrapper modules for backward compatibility (like the messages/auth-context wrapper)

## Critical Security Rules

### 1. Regra Suprema do Sistema
- **Qualquer usuário só pode acessar dados do org_id ao qual pertence**
- **Somente platform_admin ignora essa regra**
- **Essa regra é imutável**

### 2. Fonte Única de org_id
- **O único lugar válido para descobrir organização do usuário é**: `org_members (user_id → org_id)`
- **Nunca usar profiles para isso**
- **Nunca inferir org por params, URL ou qualquer outra tabela**

### 3. Auth-context unificado
- **Sempre usar**: `import { getAuthContext } from "@/lib/auth-context"`
- **Jamais usar o antigo /messages/auth-context diretamente**

### 4. Uso obrigatório do módulo admin
- **É PROIBIDO usar**: `supabaseAdmin.from("org_members")` diretamente no código
- **Qualquer operação com service_role deve passar por**: `src/lib/admin/org-members.ts` que exige orgId obrigatoriamente

### 5. Toda rota ou página deve validar org_id
- **Antes de acessar qualquer recurso**:
  - Carregar auth
  - Validar auth.orgId
  - Validar que o recurso pertence à mesma org
- **Se não pertencer**: retornar 403 / 404, sem vazar dados

### 6. Nenhum SELECT pode permitir cross-org
- **Sempre garantir filtro por org_id em**:
  - SELECT livres
  - JOINs complexos
  - Páginas server-side

### 7. Regras de permissão
- **platform_admin** → acesso total
- **org_admin** → gerencia tudo dentro da própria org
- **unit_master** → gerencia apenas sua(s) unidade(s)
- **unit_user** → acesso restrito

### 8. Nunca usar SELECT recursivo em org_members
- **O SELECT da RLS deve SEMPRE usar**: `org_id IN (select get_user_org_ids(auth.uid()))`
- **Jamais SELECT direto dentro da policy**

### 9. Operações críticas (disable/enable/update roles)
- **Sempre validar**:
  - Mesma org
  - Permissões (org_admin / platform_admin)
  - targetId pertence à mesma organização

### 10. Proibido depender apenas de user_id
- **Nenhuma operação pode considerar apenas**: `.eq("user_id", targetId)` sem verificar também org_id

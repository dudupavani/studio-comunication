# Project Context for Qwen Code

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

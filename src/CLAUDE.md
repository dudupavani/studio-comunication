# Source Tree Memory

This file applies to code under `src/`.

## Code placement

- UI belongs in `src/app`, `src/components`, and `src/hooks`
- Domain logic belongs in `src/lib/*`
- Route handlers should stay thin and delegate business rules
- Shared UI primitives in `src/components/ui/*` are protected and should not be changed without explicit request

## High-risk changes

- auth, tenant scope, user lifecycle, chat, notifications, comunicados, and AI integrations
- anything that changes contract shape between UI, API, and domain

## Before concluding

- confirm the right `.context` doc was consulted
- confirm architecture and permission impact was considered globally
- confirm UI changes still follow `AGENTS.md` and `.context/docs/design.md`

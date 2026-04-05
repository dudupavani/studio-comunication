# Source Tree Memory

This file applies to code under `src/`.

## Code placement

- UI belongs in `src/app`, `src/components`, and `src/hooks`
- Domain logic belongs in `src/lib/*`
- Route handlers should stay thin and delegate business rules
- Shared UI primitives in `src/components/ui/*` are protected and should not be changed without explicit request
- Archived product modules under `src/app/(app)/chats`, `src/app/(app)/comunicados`, `src/app/(app)/design-editor`, and `src/app/(app)/learning` are out of default scope and should be treated as nonexistent unless the task explicitly asks to reactivate or maintain them
- Apply the same rule to supporting code whose primary purpose is serving those archived modules

## High-risk changes

- auth, tenant scope, user lifecycle, notifications, and AI integrations
- anything that changes contract shape between UI, API, and domain

## Before concluding

- confirm the right `.context` doc was consulted
- confirm architecture and permission impact was considered globally
- confirm UI changes still follow `AGENTS.md` and `.context/docs/design.md`

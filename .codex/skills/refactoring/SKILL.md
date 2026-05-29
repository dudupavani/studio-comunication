---
type: skill
name: Refactoring
description: Safe code refactoring with step-by-step approach
skillSlug: refactoring
phases: [E]
---

# Refactoring Skill

## Purpose
Refactor code safely in `studio` while preserving behavior and permission constraints.

## Workflow
1. Freeze current behavior with tests or explicit assertions.
2. Refactor in small commits by domain boundary.
3. Re-run typecheck/tests after each logical step.
4. Update docs if structure or ownership changes.

## Refactoring Targets
- Duplicate validation/auth code in API routes.
- Repeated query mapping logic in domain modules.
- Overly coupled UI components with domain concerns.

## Guardrails
- Do not change `components/ui` primitives unless requested.
- Do not bypass chat mention RPC flow.
- Preserve Supabase type source-of-truth convention.

# Feature Developer

## Mission
Implement product changes end-to-end while preserving domain boundaries and repository policies.

## Typical Ownership
- Route + domain service + UI/hook updates for a single feature slice.
- Supabase schema and types for data model changes.
- Local test/typecheck validation and docs updates.

## Implementation Workflow
1. Understand domain constraints in `AGENTS.md`.
2. Design minimal viable change touching only necessary layers.
3. Implement backend/domain contracts before UI wiring.
4. Add migration + type updates for schema changes.
5. Validate with typecheck/tests and update docs when behavior changes.

## Repo-Specific Guardrails
- Use RPC path for chat messages with mentions.
- Keep inbox as notification center; chat keeps its specific behavior.
- Do not customize `src/components/ui/*` without explicit request.
- Preserve heading/text style conventions described in `AGENTS.md`.

## Validation Checklist
- Correct auth checks in route handlers.
- Input validation present for external payloads.
- Typecheck passes.
- No unrelated refactors bundled in same change.

# Frontend Specialist

## Mission
Deliver UI behavior and visual consistency for app routes without breaking shared design/system constraints.

## Main Areas
- `src/app/(app)/**` and `src/components/**`.
- Domain UIs: chats, inbox, comunicados, calendar, users/org/units.
- Hooks and client state interactions (`src/hooks/**`).

## Workflow
1. Review route-level requirements and existing UI patterns.
2. Implement UI changes using existing components and spacing/typography conventions.
3. Verify loading/error states and action disabling for async flows.
4. Confirm API contracts and payload formats used by hooks/components.

## UI Policy Highlights
- Do not add manual heading font-size/weight/color classes to `h1..h6`.
- Avoid manual color classes for normal paragraph and table cell body text unless explicitly justified.
- Do not modify `components/ui` primitives unless requested.

## Common Pitfalls
- Visual regressions from bypassing shared components.
- Async actions without disabled/loading state.
- Implicit side effects in AI-assisted UX paths.

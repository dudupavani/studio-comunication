---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code
skillSlug: test-generation
phases: [E, V]
---

# Test Generation Skill

## Purpose
Generate tests for behavioral changes in `studio`, prioritizing permissions and communication domains.

## Test Stack
- TypeScript test files under `tests/`.
- Harness entry via `tests/run-tests.ts`.
- Command: `npm run test`.

## Strategy
1. Define behavior contract first.
2. Cover success path and authorization/validation failures.
3. Add regression assertions for bug fixes.
4. Run typecheck with tests.

## Priority Domains
- Role/tenant access control.
- Chats and mention consistency.
- Inbox/notification update behavior.
- Announcements metrics/reactions/comments endpoints.
- Calendar access by role and scope.

## Validation
```bash
npm run typecheck
npm run test
```

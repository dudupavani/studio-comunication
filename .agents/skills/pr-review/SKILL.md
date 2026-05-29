---
type: skill
name: Pr Review
description: Review pull requests against team standards and best practices
skillSlug: pr-review
phases: [R, V]
---

# PR Review Skill

## Purpose
Review pull requests in `studio` for correctness, policy compliance, and regression risk.

## Review Order
1. Behavior and business impact.
2. Authorization and tenant boundaries.
3. Data/schema integrity.
4. Test coverage and type safety.
5. Documentation updates.

## Critical Checks
- API routes validate inputs and return coherent status codes.
- Permission checks are present for read/write sensitive operations.
- Schema changes include files in `database/migrations`.
- `src/types/supabase.ts` remains the database type source of truth.
- Chat mention changes keep RPC-based write flow.
- AI routes keep timeout + safe error pattern.

## Verification Commands
```bash
npm run typecheck
npm run test
npm run lint
```

## Approval Rules
- Block PR when auth/tenant leak risk exists.
- Block PR when schema changed without migration/type sync.
- Request follow-up when tests are missing for changed behavior.

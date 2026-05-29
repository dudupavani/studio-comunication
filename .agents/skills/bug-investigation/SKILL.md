---
type: skill
name: Bug Investigation
description: Systematic bug investigation and root cause analysis
skillSlug: bug-investigation
phases: [E, V]
---

# Bug Investigation Skill

## Purpose
Investigate issues with reproducible evidence and minimal-impact fixes.

## Workflow
1. Reproduce with exact role/org/unit context and request payload.
2. Identify failing boundary (UI, route, domain, DB policy, external provider).
3. Confirm root cause with code path evidence.
4. Apply focused fix and verify no regressions.

## Common Failure Areas
- Missing role checks in route handlers.
- Inconsistent payload validation between client and API.
- Missing env/model/timeouts in AI flows.
- Schema changes not reflected in TypeScript contracts.

## Validation Commands
```bash
npm run typecheck
npm run test
```

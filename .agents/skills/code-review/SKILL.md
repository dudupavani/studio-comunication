---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices
skillSlug: code-review
phases: [R, V]
---

# Code Review Skill

## Purpose
Audit code quality with emphasis on maintainability, domain boundaries, and repository conventions.

## Checklist
- Domain logic stays in `src/lib/*`, not duplicated across route handlers.
- Route handlers are thin and delegate to domain modules.
- No unauthorized edits to `src/components/ui/*` unless requested.
- Heading and body text style conventions from `AGENTS.md` are preserved.
- New code follows existing naming and folder patterns.

## Security and Performance Pass
- Validate auth guards before data access.
- Check for cross-tenant query leakage risks.
- Watch for repeated fetches and unnecessary client re-renders.

## Typical Findings in This Repo
- Missing org/unit scope checks.
- DTO validation done only in UI, not route layer.
- Schema/type mismatch after migration changes.

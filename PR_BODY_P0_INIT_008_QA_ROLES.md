## 📌 Summary

This PR establishes the 3-role agentic accountability pipeline across the entire AEGIS v3.0 monorepo. It replaces the lazy blanket assignments of `senior_qa_engineer` with specialized, domain-specific expert roles (SDET, Security Test Engineer, Penetration Tester, etc.) for all 80 tasks spanning Phase 0 to Phase 6. Additionally, it updates the Git conventions, commitlint config, and AGENT_HARNESS to strictly enforce these roles.

## 🔗 Task Reference

- **Task ID**: P0-INIT-008
- **Phase**: PHASE 0 — Foundation & Scaffold
- **Priority**: P0 — Critical
- **Assigned Agent**: `senior_git_operations_engineer`

## 📦 Changes

### Files Added

- `docs/phases/CODE_REVIEW_PHASE*.md` — Migrated all phase documents into the `docs/phases/` directory for better organization.
- `.claude/skills/flexycode/senior-git-operations-engineer/SKILL.md` — Created the new Git Operations Engineer agent skill file.
- `.gemini/flexycode/senior-git-operations-engineer/SKILL.md` — Mirrored the skill file to the Gemini agent directory.

### Files Modified

- `commitlint.config.cjs` — Added AEGIS extended commit types and scopes to support the new agentic workflows.
- `.claude/skills/flexycode/AGENT_HARNESS.md` — Updated the routing tables and QA Assignment Rules to reflect the specialized 3-role pipeline.
- `.gemini/flexycode/AGENT_HARNESS.md` — Synced the harness updates to the Gemini agent directory.
- `docs/phases/CODE_REVIEW_PHASE0.md` through `PHASE6.md` — Updated QA agent assignments for 32 out of 80 tasks to use `senior_sdet`, `senior_security_test_engineer`, `senior_penetration_tester`, `senior_security_reviewer`, and `senior_devsecops_engineer`.

### Files Deleted

- `docs/CODE_REVIEW_PHASE*.md` — Moved to `docs/phases/`.

## ✅ Acceptance Criteria

- [x] All 80 tasks audited for QA/Tester suitability.
- [x] 3-role pipeline (Assigned Agent -> QA Agent -> Review Agent) established.
- [x] Domain-specific QA mapping applied (e.g., Penetration Tester for Phase 3/5 APIs, SDET for CI).
- [x] AGENT_HARNESS routing tables updated to match phase definitions.
- [x] Git Operations Engineer skill created with strict commit & branch conventions.
- [x] Commitlint config updated to enforce the new conventions.

## 🧪 Testing

- [x] `pnpm run lint` — Validated markdown files.
- [x] Manual verification: Verified via PowerShell scripting that 100% of tasks now have a designated 3-role mapping.

## 📋 Reviewer Checklist

- [x] Branch naming follows phase-aware convention.
- [x] Commit messages follow icon convention.
- [x] No secrets or `.env.local` files committed.
- [x] Documentation is accurate and complete.

## 🔮 Next Steps

Unblocks all development for Phase 2 (Data Pipelines) and Phase 3 (AI Scanner) by establishing the definitive agent routing pipeline required for PR validation.

## 💬 Notes for Reviewers

The `senior_qa_engineer` remains responsible for functional/UX testing, while security, infrastructure, and blockchain testing are now delegated to domain experts. This guarantees a true "defense-in-depth" agentic workflow.

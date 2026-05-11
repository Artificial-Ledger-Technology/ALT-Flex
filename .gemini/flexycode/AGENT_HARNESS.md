---
name: Agent Harness
description: The Agent Harness is the orchestration layer that governs agent discovery, activation, routing, inter-agent collaboration, and task-to-agent mapping across the AltFlex AEGIS v3.0 monorepo. It defines the anatomy of how agents are selected, composed, and coordinated to execute complex multi-skill tasks.
---

# Agent Harness — Orchestration & Collaboration Protocol

The **Agent Harness** is the meta-layer that sits above all individual agent skills. It defines how agents are discovered, activated, composed, and coordinated to execute tasks. Think of it as the "operating system" for the agentic skill system — it routes tasks to the right agent, manages inter-agent dependencies, and ensures consistent governance across all workflows.

---

## Harness Anatomy

```
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT HARNESS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Discovery    │  │  Activation  │  │  Routing     │          │
│  │  Registry     │  │  Protocol    │  │  Engine      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│  ┌──────▼─────────────────▼─────────────────▼───────┐          │
│  │           3-ROLE COLLABORATION PIPELINE           │          │
│  │                                                   │          │
│  │  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │          │
│  │  │  Assigned  │→ │   QA     │→ │   Review     │  │          │
│  │  │  Agent     │  │  Agent   │  │   Agent      │  │          │
│  │  │(Developer) │  │ (Tester) │  │  (Reviewer)  │  │          │
│  │  └────────────┘  └──────────┘  └──────────────┘  │          │
│  │                                                   │          │
│  │  ┌───────────────────────────────────────────┐   │          │
│  │  │          GOVERNANCE LAYER                  │   │          │
│  │  │  Git Conventions │ Code Standards          │   │          │
│  │  │  Security Gates  │ Quality Gates           │   │          │
│  │  └───────────────────────────────────────────┘   │          │
│  └───────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Agent Discovery Registry

The harness maintains a registry of all available agents, their capabilities, and activation triggers.

### Agent Manifest

| Agent ID                         | Domain                | Activation Triggers                                                  |
| -------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `senior_software_engineer`       | Backend, domain logic | Feature implementation, use cases, service layer, hexagonal patterns |
| `senior_blockchain_architect`    | System design         | Architecture docs, C4 diagrams, ADRs, domain modeling                |
| `senior_blockchain_engineer`     | Smart contracts       | Solidity, Foundry, EVM, contract deployment                          |
| `senior_frontend_engineer`       | Web UI                | Next.js, React, components, accessibility, responsive design         |
| `senior_api_design_engineer`     | API contracts         | OpenAPI, REST endpoints, Zod schemas, Fastify routes                 |
| `senior_data_architect`          | Database, ETL         | PostgreSQL, migrations, seed data, query optimization                |
| `senior_devops_engineer`         | Infrastructure        | Docker, K8s, CI/CD, monitoring, deployment                           |
| `senior_devsecops_engineer`      | Security automation   | Supply chain security, SAST/DAST, compliance                         |
| `senior_code_reviewer`           | Code quality          | PR review, architectural review, security review                     |
| `senior_qa_engineer`             | Test strategy         | Test design, coverage, fuzzing, phase gate validation                |
| `senior_sdet`                    | Test infrastructure   | Test frameworks, CI test pipeline, test data factories               |
| `senior_security_reviewer`       | Security analysis     | Vulnerability assessment, threat modeling, security standards        |
| `senior_security_test_engineer`  | Security testing      | Penetration testing automation, security regression suites           |
| `senior_penetration_tester`      | Offensive security    | Attack simulation, exploit development, red team                     |
| `senior_smart_contract_auditor`  | Contract security     | Audit reports, vulnerability detection, formal verification          |
| `senior_smart_contract_engineer` | Contract development  | Solidity implementation, gas optimization, upgrade patterns          |
| `senior_technical_writer`        | Documentation         | README, guides, API docs, academic deliverables                      |
| `senior_git_operations_engineer` | Version control       | Branch naming, commit conventions, PR templates, release tags        |

---

## 2. Activation Protocol — 3-Role Pipeline

Every task in `CODE_REVIEW_PHASEn.md` follows a strict **3-role pipeline**:

```
Task Created
  ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: IMPLEMENTATION                                      │
│  Assigned Agent (Developer) implements the task               │
│  → Creates branch: type/phase/task-id-description             │
│  → Writes code with icon-prefixed commits                     │
│  → Opens Pull Request with structured PR template             │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: QA / INTEGRATION TESTING                            │
│  QA Agent (Tester) validates the PR                           │
│  → Runs integration tests against the PR branch              │
│  → Verifies acceptance criteria from the task definition     │
│  → Validates no regressions, edge cases covered              │
│  → Signs off or requests changes                             │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: CODE REVIEW                                         │
│  Review Agent (Reviewer) does final review before merge       │
│  → Reviews architecture compliance, type safety, security    │
│  → Checks Git hygiene (commit messages, branch naming)       │
│  → Approves merge to target branch                           │
│  → Ensures PR is production-ready                            │
└──────────────────────┬───────────────────────────────────────┘
                       ↓
                  ✅ MERGED
```

### Role Definitions

| Role               | Field in Task Table | Responsibility                                               |
| ------------------ | ------------------- | ------------------------------------------------------------ |
| **Assigned Agent** | `Assigned Agent`    | Implements the feature, writes tests, opens PR               |
| **QA Agent**       | `QA Agent`          | QA/Integration testing the PR, validates acceptance criteria |
| **Review Agent**   | `Review Agent`      | Code review, architecture compliance, merge approval         |

### QA Agent Assignment Rules

| Task Domain                        | QA Agent                        | Why                                                    |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------ |
| General features, use cases, data  | `senior_qa_engineer`            | Functional correctness, acceptance criteria validation |
| API contracts & endpoints          | `senior_security_test_engineer` | OWASP compliance, auth/authz, input validation         |
| Safety scanner / AI security       | `senior_security_test_engineer` | Security detection is the core domain                  |
| Smart contract / Blockchain / EVM  | `senior_security_test_engineer` | Contract security properties, exploit coverage         |
| System/Gateway endpoints           | `senior_penetration_tester`     | Primary attack surface, offensive validation           |
| Pattern recognition / exploit data | `senior_penetration_tester`     | Adversarial evasion testing, exploit breadth           |
| Docker / containers / CD pipeline  | `senior_devsecops_engineer`     | Container hardening, deployment security gates         |
| Dependencies / supply chain        | `senior_devsecops_engineer`     | SCA, pnpm audit, license compliance                    |
| CI pipeline / test infra / configs | `senior_sdet`                   | Test pipeline architecture, automation quality         |
| Phase gate / validation tasks      | `senior_sdet`                   | Test infrastructure validation, CI health              |
| Error handling / logging           | `senior_security_reviewer`      | PII redaction, secret masking, info leakage            |
| Env vars / secrets management      | `senior_security_test_engineer` | No secrets leak, Zod env validation                    |
| Tasks assigned TO QA/SDET          | `senior_sdet` (peer validates)  | Avoids self-review                                     |

### Review Agent Assignment Rules

| Task Domain                    | Review Agent                    |
| ------------------------------ | ------------------------------- |
| Backend / ETL / API / Frontend | `senior_code_reviewer`          |
| Smart contract / Blockchain    | `senior_smart_contract_auditor` |
| Security / Secrets / Auth      | `senior_security_reviewer`      |
| All other tasks                | `senior_code_reviewer`          |

---

## 3. Task-to-Agent Routing

### Phase 0 — Foundation & Scaffold

| Task ID     | Assigned Agent                   | QA Agent                        | Review Agent               |
| ----------- | -------------------------------- | ------------------------------- | -------------------------- |
| P0-INIT-001 | `senior_technical_writer`        | `senior_qa_engineer`            | `senior_code_reviewer`     |
| P0-INIT-002 | `senior_software_engineer`       | `senior_sdet`                   | `senior_code_reviewer`     |
| P0-INIT-003 | `senior_software_engineer`       | `senior_sdet`                   | `senior_code_reviewer`     |
| P0-INIT-004 | `senior_software_engineer`       | `senior_devsecops_engineer`     | `senior_code_reviewer`     |
| P0-INIT-005 | `senior_devops_engineer`         | `senior_sdet`                   | `senior_code_reviewer`     |
| P0-INIT-006 | `senior_devsecops_engineer`      | `senior_security_test_engineer` | `senior_security_reviewer` |
| P0-INIT-007 | `senior_devops_engineer`         | `senior_devsecops_engineer`     | `senior_code_reviewer`     |
| P0-INIT-008 | `senior_git_operations_engineer` | `senior_qa_engineer`            | `senior_code_reviewer`     |
| P0-INIT-009 | `senior_blockchain_architect`    | `senior_qa_engineer`            | `senior_code_reviewer`     |
| P0-INIT-010 | `senior_qa_engineer`             | `senior_sdet`                   | `senior_code_reviewer`     |

### Phase 1 — Architecture & API Design

| Task ID     | Assigned Agent                | QA Agent                        | Review Agent               |
| ----------- | ----------------------------- | ------------------------------- | -------------------------- |
| P1-ARCH-001 | `senior_blockchain_architect` | `senior_qa_engineer`            | `senior_code_reviewer`     |
| P1-ARCH-002 | `senior_technical_writer`     | `senior_qa_engineer`            | `senior_code_reviewer`     |
| P1-ARCH-003 | `senior_api_design_engineer`  | `senior_security_test_engineer` | `senior_code_reviewer`     |
| P1-ARCH-004 | `senior_api_design_engineer`  | `senior_security_test_engineer` | `senior_code_reviewer`     |
| P1-ARCH-005 | `senior_api_design_engineer`  | `senior_security_test_engineer` | `senior_code_reviewer`     |
| P1-ARCH-006 | `senior_api_design_engineer`  | `senior_penetration_tester`     | `senior_security_reviewer` |
| P1-ARCH-007 | `senior_data_architect`       | `senior_security_test_engineer` | `senior_code_reviewer`     |
| P1-ARCH-008 | `senior_data_architect`       | `senior_qa_engineer`            | `senior_code_reviewer`     |
| P1-ARCH-009 | `senior_software_engineer`    | `senior_sdet`                   | `senior_code_reviewer`     |
| P1-ARCH-010 | `senior_software_engineer`    | `senior_security_reviewer`      | `senior_code_reviewer`     |
| P1-ARCH-011 | `senior_software_engineer`    | `senior_security_test_engineer` | `senior_code_reviewer`     |
| P1-ARCH-012 | `senior_qa_engineer`          | `senior_sdet`                   | `senior_code_reviewer`     |

---

## 4. Inter-Agent Collaboration Protocol

### Handoff Pattern — 3-Role Pipeline

The handoff follows the strict order:

```
Assigned Agent [implements task]
  → Creates branch following naming convention
  → Writes code with icon-prefixed commits
  → Validates own output against acceptance criteria
  → Opens Pull Request with structured template
  → Tags QA Agent for review

QA Agent [validates PR]
  → Pulls the PR branch
  → Runs integration/acceptance tests
  → Verifies acceptance criteria from CODE_REVIEW_PHASEn.md
  → Approves or requests changes
  → Tags Review Agent when QA passes

Review Agent [final review]
  → Reviews code quality, architecture, security
  → Checks Git conventions (commits, branch, PR format)
  → Approves merge or requests final changes
  → Merges PR to target branch
```

### Conflict Resolution

When agents have conflicting recommendations:

1. **Architecture conflicts** → `senior_blockchain_architect` has final authority
2. **Security conflicts** → `senior_security_reviewer` has final authority
3. **Quality conflicts** → `senior_code_reviewer` has final authority
4. **Git convention conflicts** → `senior_git_operations_engineer` has final authority
5. **Test strategy conflicts** → `senior_qa_engineer` has final authority

### Governance Agents (Always-On)

These agents apply their standards to ALL work regardless of the primary agent:

| Governance Agent                 | Enforcement Scope                           |
| -------------------------------- | ------------------------------------------- |
| `senior_git_operations_engineer` | Branch names, commit messages, PR templates |
| `senior_code_reviewer`           | Code quality, type safety, architecture     |
| `senior_security_reviewer`       | No secrets in code, input validation, auth  |

---

## 5. Phase Gate Validation Protocol

At every phase gate, the harness activates a validation pipeline:

```
Phase Gate Trigger
  → senior_qa_engineer: Validates acceptance criteria
  → senior_sdet: Runs automated test suites
  → senior_code_reviewer: Final code quality review
  → senior_security_reviewer: Security audit
  → senior_git_operations_engineer: Release tag + changelog
  → senior_technical_writer: Documentation completeness
```

### Phase Gate Checklist (Standard)

- [ ] All acceptance criteria met per `CODE_REVIEW_PHASEn.md`
- [ ] `pnpm run build` — 0 errors
- [ ] `pnpm run lint` — 0 errors
- [ ] `pnpm run test` — all tests pass
- [ ] TypeScript `tsc --noEmit` — 0 errors
- [ ] No security vulnerabilities (`pnpm audit`)
- [ ] All commits follow icon convention
- [ ] All branches follow naming convention
- [ ] PR description complete with all sections
- [ ] Release tagged with `v<major>.<minor>.<patch>-<phase>-<descriptor>`

---

## 6. Agent Skill File Locations

All agent skills are mirrored across both `.claude/` and `.gemini/` directories:

```
.claude/skills/flexycode/
  ├── senior-software-engineer/SKILL.md
  ├── senior-blockchain-architect/SKILL.md
  ├── senior-blockchain-engineer/SKILL.md
  ├── senior-frontend-engineer/SKILL.md
  ├── senior-api-design-engineer/SKILL.md
  ├── senior-data-architect/SKILL.md
  ├── senior-devops-engineer/SKILL.md
  ├── senior-devsecops-engineer/SKILL.md
  ├── senior-code-reviewer/SKILL.md
  ├── senior-qa-engineer/SKILL.md
  ├── senior-sdet/SKILL.md
  ├── senior-security-reviewer/SKILL.md
  ├── senior-security-test-engineer/SKILL.md
  ├── senior-penetration-tester/SKILL.md
  ├── senior-smart-contract-auditor/SKILL.md
  ├── senior-smart-contract-engineer/SKILL.md
  ├── senior-technical-writer/SKILL.md
  ├── senior-git-operations-engineer/SKILL.md   ← NEW
  └── AGENT_HARNESS.md                          ← THIS FILE

.gemini/flexycode/
  └── [mirrors the above structure]
```

---

## When to Invoke This Harness

The Agent Harness is consulted when:

- A task spans multiple agent domains
- Multiple agents need to coordinate on a single deliverable
- A phase gate validation is triggered
- An inter-agent conflict needs resolution
- A new task needs to be routed to the correct agent
- Agent assignments need to be determined for CODE_REVIEW_PHASE tasks

---
description: God-level end-to-end workflow for blockchain feature development — from architecture through deployment and monitoring, orchestrating all 19 Senior agentic roles through a comprehensive 10-phase lifecycle.
---

# Blockchain Development Workflow — God-Level Orchestration

This workflow orchestrates all **19 Senior-level + 4 QA-specialist agent roles** through a complete blockchain feature development lifecycle. Each phase activates specific skills in the correct order, with defined inputs, outputs, quality gates, and collaboration touchpoints.

## Role Registry — AltFlex AEGIS v3.0

### Development Roles (15)

| #   | Role                           | Domain                                    |
| --- | ------------------------------ | ----------------------------------------- |
| 1   | Senior Blockchain Architect    | System architecture, C4, DDD, ADRs        |
| 2   | Senior Software Engineer       | Backend services, hexagonal, Fastify      |
| 3   | Senior Blockchain Engineer     | Protocol internals, L1/L2, ZK, MEV        |
| 4   | Senior Smart Contract Engineer | Solidity, gas optimization, upgrades      |
| 5   | Senior Frontend Engineer       | React/Next.js, Web3, design systems       |
| 6   | Senior API Design Engineer     | OpenAPI, Zod schemas, REST contracts      |
| 7   | Senior Data Architect          | PostgreSQL, migrations, caching, ETL      |
| 8   | Senior DevOps Engineer         | CI/CD, Docker, K8s, SRE, monitoring       |
| 9   | Senior Code Reviewer           | Multi-pass review, quality governance     |
| 10  | Senior Security Reviewer       | Threat modeling, STRIDE, security posture |
| 11  | Senior Smart Contract Auditor  | Audit methodology, PoC exploits, reports  |
| 12  | Senior QA Engineer             | Test strategy, coverage, phase gates      |
| 13  | Senior Technical Writer        | Architecture docs, thesis alignment       |
| 14  | Deploy                         | Release engineering, multi-env deploys    |

### QA Specialist Roles (4)

| #   | Role                          | Domain                                 |
| --- | ----------------------------- | -------------------------------------- |
| 15  | Senior DevSecOps Engineer     | CI/CD security, supply chain, SAST     |
| 16  | Senior Security Test Engineer | OWASP testing, security regression     |
| 17  | Senior SDET                   | Test framework, automation, CI infra   |
| 18  | Senior Penetration Tester     | Offensive security, exploit simulation |

---

## Phase 1: Architecture & Design

**Lead**: Senior Blockchain Architect + Senior Software Engineer
**Support**: Senior Technical Writer, Senior API Design Engineer, Senior Data Architect

1. Define feature requirements, acceptance criteria, and threat model
2. Design the on-chain / off-chain architecture split with justification
3. Create C4 diagrams (Level 1-3) with Mermaid
4. Design hexagonal architecture — ports, adapters, use cases, domain model
5. Define smart contract interfaces and data models
6. Design the API layer (endpoints, schemas, pagination) and database schema
7. Write Architecture Decision Records (ADRs) for all significant decisions
8. Define the security threat model (STRIDE analysis)
9. Define cross-cutting concerns (logging, errors, auth, caching)

**Quality Gate**: Architecture review board approval, all diagrams render correctly
**Deliverables**: `ARCHITECTURE.md`, C4 diagrams, ADRs, threat model, API spec draft

---

## Phase 2: API Contract Design

**Lead**: Senior API Design Engineer
**Support**: Senior Software Engineer, Senior Data Architect, Senior Blockchain Engineer

1. Define all REST endpoints with full OpenAPI 3.1 specifications
2. Engineer Zod request/response schemas with type inference
3. Design pagination, filtering, sorting, and search patterns
4. Standardize error response format (RFC 7807)
5. Define rate limiting tiers and throttling strategy
6. Design async job patterns (BullMQ) for long-running operations
7. Create consumer-driven contract test definitions (Pact)

**Quality Gate**: API contract review, Spectral lint pass, consumer stakeholder sign-off
**Deliverables**: OpenAPI 3.1 spec, Zod schemas in `@aegis/core`, route stubs

---

## Phase 3: Smart Contract Development

**Lead**: Senior Smart Contract Engineer
**Support**: Senior Blockchain Engineer, Senior QA Engineer

1. Implement smart contracts following designed interfaces
2. Write comprehensive NatSpec documentation on all functions
3. Implement unit tests with Foundry (≥ 95% coverage)
4. Write integration tests for multi-contract interactions
5. Optimize gas consumption — storage packing, assembly hot paths
6. Write deployment scripts with CREATE2 for deterministic addresses
7. Generate gas snapshots for regression tracking

**Quality Gate**: 95% coverage, gas snapshot baseline, NatSpec completeness
**Deliverables**: Contracts, tests, deployment scripts, gas report

---

## Phase 4: Security Audit

**Lead**: Senior Smart Contract Auditor
**Support**: Senior Security Reviewer, Senior Penetration Tester, Senior QA Engineer

1. Run static analysis (Slither, Aderyn, Mythril) — triage all findings
2. Perform line-by-line manual code review with security checklist
3. Write invariant tests and fuzz property definitions
4. Execute fuzzing campaigns (Echidna/Medusa) with persistent corpus
5. Develop proof-of-concept exploits for all findings
6. Run formal verification on critical invariants (Halmos/Certora)
7. Generate comprehensive audit report with CVSS scoring
8. Verify all fixes eliminate root causes — re-audit cycle

**Quality Gate**: Zero critical/high findings open, all fixes verified
**Deliverables**: Formal audit report, PoC exploits, verified fix confirmation

---

## Phase 5: Backend Development

**Lead**: Senior Software Engineer
**Support**: Senior Data Architect, Senior API Design Engineer, Senior DevOps Engineer, Senior DevSecOps Engineer

1. Bootstrap Fastify server with full middleware pipeline
2. Implement hexagonal architecture — use cases, ports, adapters
3. Build database access layer with connection pooling
4. Write database migrations (idempotent UP + reversible DOWN)
5. Curate and build seed data scripts
6. Build blockchain event indexers/listeners (Viem + WebSocket)
7. Implement BullMQ job processors for async operations
8. Implement WebSocket channels for real-time updates
9. Write integration tests for all API endpoints (Supertest + TestContainers)

**Quality Gate**: 85% backend coverage, all endpoints match API contract, migration tests pass
**Deliverables**: API service, indexer, workers, API docs, migration scripts

---

## Phase 6: Frontend Development

**Lead**: Senior Frontend Engineer
**Support**: Senior Software Engineer, Senior Smart Contract Engineer, Senior QA Engineer

1. Build UI components using design system (shadcn/ui + Radix)
2. Implement server components with Suspense data fetching
3. Integrate wallet connection (Wagmi + RainbowKit)
4. Build transaction UX flows (approve → execute → confirm)
5. Implement responsive layouts (320px — 2560px)
6. Add loading states, error boundaries, empty states, skeletons
7. Implement dark/light theme system
8. Write component tests (React Testing Library + Vitest)
9. Write E2E tests (Playwright — Chromium, Firefox)

**Quality Gate**: 80% coverage, Core Web Vitals pass, axe-core zero critical, responsive verified
**Deliverables**: Frontend feature, component tests, E2E tests, Lighthouse report

---

## Phase 7: Quality Assurance & Testing

**Lead**: Senior QA Engineer
**Support**: Senior SDET, Senior Security Test Engineer, ALL roles

1. Execute full test suite — unit → integration → E2E
2. Run fork tests against mainnet state for contract interactions
3. Perform regression testing across all affected modules
4. Execute load/performance testing (k6 with SLO thresholds)
5. Run accessibility audits (axe-core, Lighthouse — WCAG 2.1 AA)
6. Validate coverage meets all thresholds across all layers
7. Run mutation testing (Stryker) — kill rate > 80%
8. Generate comprehensive test report with quality metrics

**Quality Gate**: All coverage thresholds met, zero critical defects, performance SLOs pass
**Deliverables**: Test report, coverage report, performance benchmarks, accessibility audit

---

## Phase 8: Security Review & Hardening

**Lead**: Senior Security Reviewer
**Support**: Senior DevSecOps Engineer, Senior Security Test Engineer, Senior Penetration Tester

1. Complete security checklist review (infrastructure, application, data, blockchain, dependencies)
2. Run OWASP Top 10 security tests on all API endpoints
3. Execute penetration testing on exposed attack surfaces
4. Validate CI/CD security gates (image scanning, SAST, dependency audit)
5. Verify secret management — no secrets in code, proper rotation policy
6. Validate authentication/authorization matrix — RBAC enforcement
7. Run supply chain security audit — dependency analysis, SBOM generation
8. Generate security review report with severity-classified findings

**Quality Gate**: Zero critical/high security findings, OWASP tests pass, pen test report clean
**Deliverables**: Security review report, pen test findings, compliance matrix

---

## Phase 9: Code Review & Sign-Off

**Lead**: Senior Code Reviewer
**Support**: Senior Security Reviewer, Senior Technical Writer, Senior Blockchain Architect

1. Multi-pass PR review — Architecture → Security → Logic → Tests → Style
2. Verify hexagonal architecture boundary compliance
3. Verify all ADRs are followed in implementation
4. Validate documentation completeness and accuracy
5. Verify test quality — patterns, coverage, edge cases
6. Approve or request changes with severity-tagged comments
7. Verify all review comments resolved before merge

**Quality Gate**: 2+ reviewer approvals, zero BLOCKER/CRITICAL comments open
**Deliverables**: PR approvals, review comments, architectural compliance verification

---

## Phase 10: Deployment & Operations

**Lead**: Senior DevOps Engineer + Deploy Skill
**Support**: Senior DevSecOps Engineer, Senior Blockchain Engineer, Senior Software Engineer

1. Build production Docker images with multi-stage Dockerfiles
2. Scan images for vulnerabilities (Trivy — zero critical CVEs)
3. Deploy smart contracts to testnet → verify → e2e test
4. Deploy backend services via CI/CD pipeline (blue-green/canary)
5. Deploy frontend to CDN/hosting with preview environments
6. Run database migrations in production (zero-downtime)
7. Configure monitoring dashboards and alerting rules
8. Deploy to mainnet (smart contracts) with multi-sig approval
9. Execute post-deployment verification checklist
10. Monitor post-deployment metrics for 30 minutes

**Quality Gate**: All health checks green, error rate < 0.01%, P99 < 500ms
**Deliverables**: Deployed services, monitoring dashboards, runbooks, deployment report

---

## Cross-Phase Collaboration Matrix

| Phase            | Lead                                     | Supporting Roles                                          |
| ---------------- | ---------------------------------------- | --------------------------------------------------------- |
| 1. Architecture  | Blockchain Architect + Software Engineer | Technical Writer, API Design Eng, Data Architect          |
| 2. API Contracts | API Design Engineer                      | Software Engineer, Data Architect, Blockchain Engineer    |
| 3. Contracts     | Smart Contract Engineer                  | Blockchain Engineer, QA Engineer                          |
| 4. Audit         | Smart Contract Auditor                   | Security Reviewer, Penetration Tester, QA Engineer        |
| 5. Backend       | Software Engineer                        | Data Architect, API Design Eng, DevOps Eng, DevSecOps Eng |
| 6. Frontend      | Frontend Engineer                        | Software Engineer, Smart Contract Eng, QA Engineer        |
| 7. QA            | QA Engineer                              | SDET, Security Test Eng, ALL                              |
| 8. Security      | Security Reviewer                        | DevSecOps Eng, Security Test Eng, Penetration Tester      |
| 9. Code Review   | Code Reviewer                            | Security Reviewer, Technical Writer, Blockchain Architect |
| 10. Deployment   | DevOps Engineer + Deploy                 | DevSecOps Eng, Blockchain Eng, Software Eng               |

## Emergency Procedures

### Security Incident Response

1. **Senior Security Reviewer** performs triage and impact assessment — classify severity
2. **Senior Smart Contract Auditor** analyzes on-chain traces — identify root cause
3. **Senior DevOps Engineer** pauses affected contracts (if pausable) — contain damage
4. **Senior Penetration Tester** validates exploit path — confirm attack vector
5. **Senior Smart Contract Engineer** develops and tests the fix — remediate
6. **Senior Smart Contract Auditor** re-audits the fix — verify remediation
7. **Senior DevSecOps Engineer** validates CI/CD security — prevent recurrence
8. **Senior DevOps Engineer** deploys the fix through emergency process — restore
9. **Senior Blockchain Architect** leads blameless post-mortem — learn and improve
10. **Senior Technical Writer** documents the incident — capture institutional knowledge

### Production Outage Response

1. **Senior DevOps Engineer** performs initial diagnosis — identify failing component
2. **Senior Software Engineer** assists with root cause analysis — trace error propagation
3. **Senior DevOps Engineer** executes rollback if necessary — restore service
4. **Senior QA Engineer** validates recovery — confirm system health
5. **Senior SDET** runs automated smoke tests — verify regression
6. **Senior Technical Writer** documents the incident — update runbooks
7. Team conducts blameless post-mortem within 24 hours

---

_Aligned with: AltFlex AEGIS v3.0 — Phase 1: High-Level Architecture & API Design_
_Role Count: 18 roles + 1 workflow skill = 19 total agentic capabilities_

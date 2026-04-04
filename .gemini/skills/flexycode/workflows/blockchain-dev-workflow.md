---
description: End-to-end workflow for blockchain feature development — from design through deployment and monitoring.
---

# Blockchain Development Workflow

This workflow orchestrates the 14 Senior-level agent roles through a complete blockchain feature development lifecycle. Each phase activates specific skills in the correct order.

## Phase 1: Architecture & Design

**Lead**: Senior Blockchain Architect + Senior Software Engineer

1. Define the feature requirements and acceptance criteria
2. Design the on-chain/off-chain architecture split
3. Identify smart contract interfaces and data models
4. Design the API layer and database schema
5. Create architecture decision records (ADRs)
6. Define the security threat model

**Supporting**: Senior Technical Writer (documentation), Senior API Design Engineer (API contracts), Senior Data Architect (data models)

**Deliverables**: Architecture diagram, contract interfaces, API spec, threat model

---

## Phase 2: Smart Contract Development

**Lead**: Senior Smart Contract Engineer

1. Implement smart contracts following the designed interfaces
2. Write comprehensive NatSpec documentation
3. Implement unit tests with Foundry (≥ 95% coverage)
4. Write integration tests for multi-contract interactions
5. Run gas optimization passes
6. Write deployment scripts

**Supporting**: Senior Blockchain Engineer (protocol requirements), Senior QA Engineer (test strategy)

**Deliverables**: Contracts, tests, deployment scripts, gas report

---

## Phase 3: Security Audit

**Lead**: Senior Smart Contract Auditor

1. Run static analysis (Slither, Aderyn)
2. Perform line-by-line manual review
3. Write invariant tests and fuzz properties
4. Execute fuzzing campaigns (Echidna/Medusa)
5. Develop proof-of-concept exploits for findings
6. Generate formal audit report with severities
7. Verify fixes after remediation

**Supporting**: Senior Security Reviewer (overall security posture), Senior QA Engineer (fuzz infrastructure)

**Deliverables**: Audit report, PoC exploits, verified fix confirmation

---

## Phase 4: Backend Development

**Lead**: Senior Software Engineer

1. Build blockchain event indexers/listeners
2. Implement API endpoints for frontend consumption
3. Set up database migrations and models
4. Build background workers (transaction monitor, price feeds)
5. Write integration tests for all API endpoints
6. Implement WebSocket channels for real-time updates

**Supporting**: Senior Data Architect (schema design), Senior API Design Engineer (API contracts), Senior DevOps Engineer (infrastructure)

**Deliverables**: API service, indexer, workers, API docs

---

## Phase 5: Frontend Development

**Lead**: Senior Frontend Engineer

1. Build UI components for the feature
2. Integrate wallet connection and contract interactions
3. Implement transaction UX flows (approve → execute → confirm)
4. Build responsive layouts (mobile + desktop)
5. Add loading states, error handling, and empty states
6. Write component tests and E2E tests

**Supporting**: Senior Software Engineer (API integration), Senior Smart Contract Engineer (ABI types)

**Deliverables**: Frontend feature, component tests, E2E tests

---

## Phase 6: Quality Assurance

**Lead**: Senior QA Engineer

1. Execute full test suite (unit → integration → e2e)
2. Run fork tests against mainnet state
3. Perform regression testing
4. Execute load/performance testing on APIs
5. Run accessibility audits on frontend
6. Validate coverage meets all thresholds
7. Generate comprehensive test report

**Supporting**: All roles (verification)

**Deliverables**: Test report, coverage report, performance benchmarks

---

## Phase 7: Code Review

**Lead**: Senior Code Reviewer

1. Review all PRs using multi-pass methodology
2. Architecture review for consistency and patterns
3. Security review for all attack vectors
4. Code quality assessment (readability, maintainability, types)
5. Test quality validation
6. Documentation completeness check
7. Approve or request changes with severity-tagged comments

**Supporting**: Senior Security Reviewer (security focus), Senior Technical Writer (docs quality)

**Deliverables**: PR approvals, review comments, knowledge sharing

---

## Phase 8: Deployment & Operations

**Lead**: Senior DevOps Engineer

1. Build Docker images and push to registry
2. Deploy smart contracts to testnet → verify → test
3. Deploy backend services via CI/CD pipeline
4. Deploy frontend to CDN/hosting
5. Configure monitoring dashboards and alerts
6. Deploy to mainnet with canary strategy
7. Verify contract on block explorer
8. Monitor post-deployment metrics

**Supporting**: Senior Blockchain Engineer (chain configs), Senior Software Engineer (deploy verification)

**Deliverables**: Deployed services, monitoring dashboards, runbooks

---

## Cross-Phase Collaboration Matrix

| Phase           | Primary Skill                           | Supporting Skills                                           |
| --------------- | --------------------------------------- | ----------------------------------------------------------- |
| 1. Architecture | Senior Blockchain Architect + Senior SE | Senior Tech Writer, Senior API Design Eng, Senior Data Arch |
| 2. Contracts    | Senior Smart Contract Engineer          | Senior Blockchain Eng, Senior QA Eng                        |
| 3. Audit        | Senior Smart Contract Auditor           | Senior Security Reviewer, Senior QA Eng                     |
| 4. Backend      | Senior Software Engineer                | Senior Data Architect, Senior API Design Eng, Senior DevOps |
| 5. Frontend     | Senior Frontend Engineer                | Senior Software Eng, Senior Smart Contract Eng              |
| 6. QA           | Senior QA Engineer                      | All (verification)                                          |
| 7. Review       | Senior Code Reviewer                    | Senior Security Reviewer, Senior Tech Writer                |
| 8. Deploy       | Senior DevOps Engineer                  | Senior Blockchain Eng, Senior Software Eng                  |

## Emergency Procedures

### Security Incident

1. **Senior Smart Contract Auditor** performs triage and impact assessment
2. **Senior DevOps Engineer** pauses affected contracts (if pausable)
3. **Senior Smart Contract Engineer** develops and tests the fix
4. **Senior Smart Contract Auditor** re-audits the fix
5. **Senior Security Reviewer** validates the overall security posture
6. **Senior DevOps Engineer** deploys the fix through emergency process
7. **Senior Blockchain Architect** leads post-mortem

### Production Outage

1. **Senior DevOps Engineer** performs initial diagnosis
2. **Senior Software Engineer** assists with root cause analysis
3. **Senior DevOps Engineer** executes rollback if necessary
4. **Senior QA Engineer** validates recovery
5. **Senior Technical Writer** documents the incident
6. Team conducts blameless post-mortem

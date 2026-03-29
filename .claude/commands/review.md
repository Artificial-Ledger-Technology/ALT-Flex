# /review — Code Review Command

## Description

Perform a comprehensive, multi-pass code review following the AltFlex AEGIS review standards. Reviews cover architecture, security, logic, style, and performance.

## Usage

```
/review [file path or PR description]
```

## Review Methodology

### Pass 1: Architecture Review

- Verify changes align with **Hexagonal Architecture** (Ports & Adapters)
- Check that `@aegis/core` has ZERO imports from other `@aegis/*` packages
- Verify proper separation: Domain → Application → Adapter → Infrastructure
- Ensure new code follows existing naming conventions and patterns
- Check dependency additions for necessity, bundle size, and maintenance status
- Validate database schema changes and migration safety

### Pass 2: Security Review

- **Backend**: SQL injection, input validation, rate limiting, CORS, auth bypass
- **Frontend**: XSS, CSRF, wallet interaction safety, transaction preview
- **Smart Contracts**: Reentrancy, access control, oracle manipulation (if applicable)
- **Infrastructure**: Secret management, API key exposure, env var leaks
- **Dependencies**: Known vulnerabilities (`pnpm audit`), supply chain risks
- **Blockchain-specific**: RPC endpoint exposure, private key handling, tx signing

### Pass 3: Logic & Correctness

- Verify business logic correctness
- Check edge cases and boundary conditions
- Validate error handling — no swallowed errors
- Confirm Zod schema validation on data boundaries
- Check async/await patterns — no unhandled rejections
- Verify TypeScript strict mode compliance — no `any`, no type assertions without justification

### Pass 4: Style & Readability

- Code follows project Prettier config (2-space, single quotes, trailing commas)
- Clear, descriptive naming (no abbreviations without context)
- Appropriate comments — explain "why", not "what"
- Self-documenting code preferred over comments
- Module size reasonable (< 300 lines per file)

### Pass 5: Performance

- No N+1 queries in database interactions
- Appropriate use of caching (Redis) for hot paths
- No unnecessary re-renders in React components
- No unbounded iterations or recursion
- Connection pool usage verified
- Bundle size impact considered for frontend changes

## Severity Labels

| Label             | Meaning                                    | Action                |
| ----------------- | ------------------------------------------ | --------------------- |
| 🔴 **BLOCKER**    | Security issue, data loss, breaking change | Must fix before merge |
| 🟡 **ISSUE**      | Bug, logic error, missing edge case        | Needs resolution      |
| 🔵 **SUGGESTION** | Better pattern, readability improvement    | Optional — discuss    |
| 💡 **NIT**        | Minor style preference                     | Author's discretion   |
| ❓ **QUESTION**   | Need clarification                         | Response required     |
| 📚 **LEARNING**   | Knowledge sharing opportunity              | Informational         |

## Review Checklists

### For Engine Packages (hacks-engine, skills-engine, forensic-engine)

- [ ] Domain logic has zero framework dependencies
- [ ] Port interfaces are generic and reusable
- [ ] Adapters implement ports correctly
- [ ] Use cases follow single-responsibility principle
- [ ] Error types are specific and typed
- [ ] Zod schemas validate all external input
- [ ] Unit tests cover core flows (≥ 95% line coverage)

### For API Gateway

- [ ] Input validation on all endpoints via Zod
- [ ] Proper error responses with typed error codes
- [ ] Rate limiting configured on public endpoints
- [ ] Authentication/authorization on protected routes
- [ ] OpenAPI spec updated if routes changed
- [ ] Structured logging with correlation IDs

### For Web Frontend

- [ ] TypeScript strict mode — no `any`
- [ ] Server Components used where possible (Next.js 15)
- [ ] Responsive design (mobile + desktop)
- [ ] Loading and error states implemented
- [ ] No `console.log` left in production code
- [ ] Accessibility: keyboard nav, ARIA labels
- [ ] Component tests included

## Output Format

Provide a structured review with:

1. **Summary**: Overall assessment (Approve / Request Changes / Needs Discussion)
2. **Findings**: Listed by severity with file, line, and explanation
3. **Suggestions**: Optional improvements
4. **Praise**: Highlight well-written code

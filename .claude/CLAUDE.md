# AltFlex AEGIS v3.0 — Claude AI Agent Configuration

> **A**daptive **E**xploit & **G**overnance **I**ntelligence **S**ystem  
> _The Shield of Web3_

## Project Identity

- **Name**: AltFlex AEGIS v3.0
- **Package Scope**: `@aegis/*`
- **Architecture**: Hexagonal (Ports & Adapters) TypeScript Monorepo
- **Stack**: Node.js 20+ · TypeScript 5.4 · pnpm 10 · Turborepo · Next.js 15 · Fastify 5 · PostgreSQL 16 · Redis 7 · Foundry

## Engines

| Engine                     | Package                  | Purpose                                        |
| -------------------------- | ------------------------ | ---------------------------------------------- |
| **α — Hacks Dashboard**    | `@aegis/hacks-engine`    | DeFi exploit ETL, incident tracking, analytics |
| **β — AI Skills Explorer** | `@aegis/skills-engine`   | AI audit skill indexing, AST safety scanner    |
| **γ — Forensic Engine**    | `@aegis/forensic-engine` | Foundry POC simulation, EVM trace analysis     |

## Agent Behavior

When working on this codebase, you MUST:

1. **Follow Hexagonal Architecture** — Domain logic lives in `@aegis/core`. External dependencies ONLY through Port interfaces with Adapter implementations.
2. **Respect Package Boundaries** — `@aegis/core` must NEVER import from any other `@aegis/*` package. All inter-package deps use `workspace:*` protocol.
3. **Use Strict TypeScript** — `strict: true`, no `any` types, no type assertions without justification. Use Zod for runtime validation.
4. **Write Conventional Commits** — `type(scope): description` format. Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Valid scopes: core, hacks-engine, skills-engine, forensic-engine, web, api-gateway, infra, docker, deps, ci, docs, phase-0 through phase-6.
5. **Enforce Code Quality** — ESLint + Prettier + Husky pre-commit hooks. 2-space indent, single quotes, trailing commas, 100 char print width.
6. **Validate Environment** — All env vars validated via Zod schemas on startup. Reference `.env.example` for required variables.
7. **Test Everything** — Vitest for unit + integration tests. Minimum 95% coverage for critical paths.

## Key References

- `docs/CODE_REVIEW_PHASE0.md` — Phase 0 task breakdown and acceptance criteria
- `docs/PHASE_0_PROJECT_INITIALIZATION.md` — Initialization guide
- `docs/BRAND_GUIDE.md` — Color palette and design tokens
- `README.md` — Full architecture, domain models, API reference, phase roadmap

## Commands Reference

| Command                   | Purpose                               |
| ------------------------- | ------------------------------------- |
| `pnpm dev`                | Start all apps/packages in watch mode |
| `pnpm build`              | Build all packages via Turbo          |
| `pnpm test`               | Run all test suites                   |
| `pnpm lint`               | Lint all packages                     |
| `pnpm typecheck`          | Type-check all packages               |
| `pnpm format`             | Format with Prettier                  |
| `pnpm --filter <pkg> dev` | Run single workspace                  |

## Skills & Rules

See `.claude/commands/` for agent commands, `.claude/rules/` for mandatory coding rules, and `.claude/skills/` for specialized agent capabilities.

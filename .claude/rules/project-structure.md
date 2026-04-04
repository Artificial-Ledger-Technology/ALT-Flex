# Project Structure — Mandatory Rules

## Architecture: Hexagonal (Ports & Adapters)

AltFlex AEGIS follows strict Hexagonal Architecture. Every external dependency — databases, APIs, blockchain RPC nodes, AI models, the Foundry CLI — is accessed exclusively through abstract `Port` interfaces. Concrete implementations are `Adapters`.

### Key Principle

**The domain layer has ZERO coupling to any framework or infrastructure concern.**

### Layer Rules

| Layer                                       | Can Import From                    | Cannot Import From                    |
| ------------------------------------------- | ---------------------------------- | ------------------------------------- |
| **Domain** (entities, value objects, ports) | Nothing external                   | Adapters, Application, Infrastructure |
| **Application** (use cases)                 | Domain, `@aegis/core`              | Adapters, Infrastructure              |
| **Adapters** (API clients, DB repos)        | Domain, Application, External libs | Other Adapters                        |
| **Infrastructure** (migrations, config)     | Everything                         | —                                     |

## Package Dependency Rules

```
@aegis/core (Shared Kernel)
  └── ZERO @aegis/* dependencies — pure domain kernel

@aegis/hacks-engine → @aegis/core
@aegis/skills-engine → @aegis/core
@aegis/forensic-engine → @aegis/core

@aegis/api-gateway → @aegis/core + all engines
@aegis/web → (HTTP only — no workspace deps)
```

**RULE**: `@aegis/core` must NEVER import from any other `@aegis/*` package. This is the hexagonal boundary.

## Monorepo Structure

```
ALT-Flex/
├── packages/
│   ├── core/                    ← @aegis/core — Shared Kernel
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── entities/    ← HackIncident, AISkillFile, ExploitPOC
│   │       │   ├── value-objects/ ← AttackVector, Chain, SafetyLabel
│   │       │   └── ports/       ← IHackDataPort, ISkillDataPort, etc.
│   │       └── shared/
│   │           ├── types/       ← Global TypeScript types
│   │           ├── utils/       ← Pure utility functions
│   │           ├── constants/   ← Chain IDs, attack vector maps
│   │           └── errors/      ← Custom error hierarchy (AegisError)
│   │
│   ├── hacks-engine/            ← @aegis/hacks-engine — Engine α
│   │   └── src/
│   │       ├── adapters/        ← DefiLlama, DeFiHackLabs, PostgreSQL
│   │       ├── application/     ← Use cases (SyncHacks, FilterHacks, etc.)
│   │       ├── domain/
│   │       └── infrastructure/  ← Migrations, seed data
│   │
│   ├── skills-engine/           ← @aegis/skills-engine — Engine β
│   │   └── src/
│   │       ├── adapters/        ← GitHub scraper, YAML/MD/MCP parsers
│   │       ├── application/     ← IndexSkills, ScanSafety, SearchSkills
│   │       ├── domain/safety/   ← Safety rule definitions
│   │       └── infrastructure/  ← Migrations, safety-rules configs
│   │
│   └── forensic-engine/         ← @aegis/forensic-engine — Engine γ
│       └── src/
│           ├── adapters/        ← Foundry CLI wrapper, RPC providers
│           ├── application/     ← SimulateExploit, TraceTransaction
│           ├── domain/
│           └── infrastructure/
│
├── apps/
│   ├── web/                     ← @aegis/web — Next.js 15 Frontend
│   │   └── src/
│   │       ├── app/             ← App Router pages
│   │       ├── components/      ← UI components
│   │       ├── lib/             ← API client, utilities
│   │       ├── hooks/           ← Custom React hooks
│   │       └── styles/          ← CSS, design tokens
│   │
│   └── api-gateway/             ← @aegis/api-gateway — Fastify BFF
│       └── src/
│           ├── routes/          ← Endpoint definitions
│           ├── middleware/      ← Auth, rate limit, validation
│           ├── config/          ← Zod-validated environment config
│           └── server.ts
│
├── infrastructure/
│   ├── docker/                  ← Dockerfiles
│   ├── terraform/               ← Cloud IaC (Phase 6)
│   └── ci/                      ← GitHub Actions workflows
│
├── docs/                        ← Documentation
└── research/                    ← Jupyter notebooks, ML experiments
```

## File Organization Rules

1. **One concern per file** — no 500-line mega-files
2. **Max 300 lines** per source file (soft limit, hard limit 500)
3. **Co-locate tests** — `src/application/sync-hacks.ts` → `src/application/__tests__/sync-hacks.test.ts`
4. **Index files** — each directory has `index.ts` exporting its public API
5. **No circular imports** — detected by ESLint rule
6. **Package.json per workspace** — defines name, version, scripts, dependencies

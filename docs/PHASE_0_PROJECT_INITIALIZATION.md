# 🛡️ Phase 0 — Clean Slate Initialization

> **AltFlex AEGIS v3.0** · Adaptive Exploit & Governance Intelligence System  
> Phase Goal: Scaffold a production-grade, hexagonal-architecture monorepo, configure all tooling, and validate the full development environment before writing a single line of business logic.

---

## 📋 Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Why "AEGIS"? — The Rebrand](#why-aegis--the-rebrand)
3. [Architecture Decision Records](#architecture-decision-records)
4. [Prerequisites Checklist](#prerequisites-checklist)
5. [Directory Scaffold](#directory-scaffold)
6. [Root Workspace Setup](#root-workspace-setup)
7. [Package Configuration](#package-configuration)
8. [Domain Models Blueprint](#domain-models-blueprint)
9. [Database Schema Design](#database-schema-design)
10. [Environment Variables](#environment-variables)
11. [Docker Orchestration](#docker-orchestration)
12. [Code Quality Tooling](#code-quality-tooling)
13. [Git Configuration & Branch Strategy](#git-configuration--branch-strategy)
14. [Validation Checklist](#validation-checklist)
15. [Academic Alignment Matrix](#academic-alignment-matrix)
16. [Common Pitfalls & Fixes](#common-pitfalls--fixes)

---

## Overview & Goals

Phase 0 is the bedrock. A poorly initialized project cascades into dependency hell, environment drift, and architecture entropy. This is doubly critical because AltFlex AEGIS serves a **dual purpose**:

1. **Academic Engine** — Core system for Methods of Research → Thesis 1 (AI Safety Scanner, Phase 3) → Thesis 2 (Deep EVM Integration, Phase 5), graduating 2027.
2. **Commercial Engine** — A Web3 industry product rivaling the [SCH Hacks Dashboard](https://smartcontractshacking.com/tools/web3-hacks-dashboard) and [AI Skills Explorer](https://smartcontractshacking.com/tools/ai-skills-explorer).

This phase ensures:

- ✅ **Reproducible environment** — any collaborator or thesis panelist can clone and run with zero guessing
- ✅ **Typed throughout** — TypeScript strict mode across all packages
- ✅ **Hexagonal isolation** — domain logic has ZERO coupling to frameworks, databases, or external APIs
- ✅ **Dual-engine boundaries** — Hacks Dashboard and AI Skills Explorer share a kernel but are independently deployable
- ✅ **Security-first** — secrets never committed; `.env.example` is the source of truth
- ✅ **Lint + format on commit** — Husky + lint-staged block bad code at the gate
- ✅ **Container-ready** — one `docker compose up` boots all 6 services

---

## Why "AEGIS"? — The Rebrand

The v1/v2 name — *"AltFlex: AI-Powered Forensic Framework for Exploit Detection"* — no longer captures the scope. The platform now has two distinct intelligence pillars and a governance mandate (AI skill safety).

| Aspect | v1/v2 (AltFlex) | v3.0 (AltFlex AEGIS) |
|--------|-----------------|---------------------|
| **Scope** | Flash loan detection for 5 protocols | Every DeFi hack in history (1,000+ incidents) |
| **Engine Count** | 1 (Transaction analysis) | 2 (Hacks Dashboard + AI Skills Explorer) |
| **AI Role** | XGBoost anomaly detector | Safety Scanner + LLM audit skill governance |
| **Chain Support** | Ethereum only | EVM + Non-EVM (Solana, Cosmos, Move) |
| **Data Sources** | Etherscan, PolygonScan | DefiLlama, DeFiHackLabs, GitHub AI repos |
| **Architecture** | Monolithic Python/Next.js | Hexagonal TypeScript microservices |
| **Academic Purpose** | Capstone proof-of-concept | Thesis 1 & 2 research system |

**AEGIS** = **A**daptive **E**xploit & **G**overnance **I**ntelligence **S**ystem

> *In Greek mythology, the aegis (αἰγίς) was the shield of Zeus — a supernatural defense that could only be wielded by the most powerful. AltFlex AEGIS is the shield for Web3.*

---

## Architecture Decision Records

### ADR-001: pnpm Workspaces over Turborepo / Nx / Lerna

**Decision**: Use native pnpm workspaces with Turbo for task orchestration (not Nx or Lerna).

**Rationale**:
- pnpm is the fastest package manager with strict dependency isolation
- Turbo provides efficient task caching without framework lock-in
- Nx is overkill for our 6-package monorepo; Lerna is effectively deprecated
- Academic reviewers will find pnpm more transparent than opaque Nx graph analysis

### ADR-002: TypeScript-First Monorepo (Not Python/TS Hybrid)

**Decision**: v3.0 is 100% TypeScript. Python is limited to Jupyter notebooks in `research/`.

**Rationale**:
- v1/v2 suffered from Python/TypeScript impedance mismatch
- Type safety across the full stack eliminates a class of integration bugs
- Fastify (TS) replaces FastAPI (Python) — equal performance, unified language
- ML inference from Python models can be wrapped via ONNX or REST microservice

### ADR-003: Hexagonal Architecture with Explicit Ports & Adapters

**Decision**: Every external dependency (databases, APIs, AI models, RPC nodes) is accessed exclusively through abstract `Port` interfaces. Concrete implementations are `Adapters`.

**Rationale**:
- Satisfies the "15-year future-proofing" requirement — swap any external dependency without touching domain logic
- Makes unit testing trivial: test against ports using in-memory adapters
- Academic papers can reference architecture diagrams that clearly show system boundaries
- Enables chain agnosticism: `IChainDataPort` → `EthereumAdapter`, `SolanaAdapter`, `CosmosAdapter`

### ADR-004: Next.js 15 App Router with React 19

**Decision**: Use Next.js 15 with React 19 Server Components for the frontend.

**Rationale**:
- Server Components reduce client-side JS bundle (critical for data-heavy dashboards)
- Streaming SSR enables fast initial load for large hack datasets
- App Router enables layouts and parallel routes for the dual-engine UI
- React 19 `use()` hook simplifies async data fetching patterns

### ADR-005: PostgreSQL + Redis (Not MongoDB)

**Decision**: PostgreSQL 16 as primary datastore, Redis 7 as cache + job queue backend.

**Rationale**:
- Hack incidents are inherently relational (protocol → chains → attacks → transactions)
- PostgreSQL JSONB columns provide NoSQL flexibility where needed (skill file metadata)
- Full-text search via `tsvector` eliminates the need for Elasticsearch at this scale
- Redis + BullMQ provides a battle-tested job queue for ETL workers

---

## Prerequisites Checklist

Before proceeding, ensure every tool is installed and verified:

| Tool | Version | Verify Command | Purpose |
|------|---------|---------------|---------|
| Node.js | 20 LTS (≥20.11) | `node --version` | Runtime |
| pnpm | ≥9.0 | `pnpm --version` | Package manager |
| TypeScript | ≥5.4 | `npx tsc --version` | Type system |
| Docker Desktop | ≥4.25 | `docker --version` | Containerization |
| Docker Compose | ≥2.24 | `docker compose version` | Orchestration |
| Git | ≥2.40 | `git --version` | Version control |
| Foundry | latest | `forge --version` | Solidity testing (Phase 5) |
| PostgreSQL | 16 | `psql --version` | Database (via Docker OK) |
| VS Code | latest | — | IDE |

**Install pnpm** (if not present):
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Directory Scaffold

The full hexagonal monorepo structure:

```
AltFlex-AEGIS/                          ← Git root / pnpm workspace root
│
├── packages/                           ← Shared libraries & engine modules
│   ├── core/                           ← 🧬 Shared Kernel
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── entities/           ← HackIncident, AISkillFile, ExploitPOC
│   │   │   │   ├── value-objects/      ← AttackVector, Chain, SafetyLabel
│   │   │   │   └── ports/             ← Abstract interfaces (Hexagonal "Ports")
│   │   │   │       ├── IHackDataPort.ts
│   │   │   │       ├── ISkillDataPort.ts
│   │   │   │       ├── IChainDataPort.ts
│   │   │   │       ├── ISafetyScannerPort.ts
│   │   │   │       └── ICachePort.ts
│   │   │   ├── shared/
│   │   │   │   ├── types/             ← Global TypeScript types
│   │   │   │   ├── utils/             ← Pure utility functions
│   │   │   │   ├── constants/         ← Chain IDs, attack vectors, labels
│   │   │   │   └── errors/            ← Custom error hierarchy
│   │   │   └── index.ts               ← Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── hacks-engine/                   ← ⚡ Engine α — Hacks Dashboard
│   │   ├── src/
│   │   │   ├── adapters/              ← Hexagonal "Adapters"
│   │   │   │   ├── defillama/         ← DefiLlama API client
│   │   │   │   ├── defihacklabs/      ← SunWeb3Sec GitHub scraper
│   │   │   │   └── postgres/          ← PostgreSQL repository
│   │   │   ├── application/           ← Use Cases / Service Layer
│   │   │   │   ├── SyncHacksUseCase.ts
│   │   │   │   ├── FilterHacksUseCase.ts
│   │   │   │   └── GetHackStatsUseCase.ts
│   │   │   ├── domain/               ← Engine-specific domain extensions
│   │   │   └── infrastructure/        ← Database migrations, seeds
│   │   │       ├── migrations/
│   │   │       └── seed/              ← Initial hack data for dev
│   │   ├── __tests__/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── skills-engine/                  ← 🧠 Engine β — AI Skills Explorer
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   ├── github/            ← GitHub repo scraper
│   │   │   │   ├── parsers/           ← YAML/Markdown/MCP skill parsers
│   │   │   │   └── postgres/
│   │   │   ├── application/
│   │   │   │   ├── IndexSkillsUseCase.ts
│   │   │   │   ├── ScanSkillSafetyUseCase.ts
│   │   │   │   └── SearchSkillsUseCase.ts
│   │   │   ├── domain/
│   │   │   │   └── safety/            ← Safety rule definitions
│   │   │   └── infrastructure/
│   │   │       ├── migrations/
│   │   │       └── safety-rules/      ← AST/regex safety rule configs
│   │   ├── __tests__/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── forensic-engine/               ← 🔬 Foundry & EVM Trace Engine
│       ├── src/
│       │   ├── adapters/
│       │   │   ├── foundry/           ← Foundry CLI wrapper
│       │   │   └── rpc/              ← Multi-chain RPC providers
│       │   ├── application/
│       │   │   ├── SimulateExploitUseCase.ts
│       │   │   └── TraceTransactionUseCase.ts
│       │   ├── domain/
│       │   └── infrastructure/
│       ├── __tests__/
│       ├── package.json
│       └── tsconfig.json
│
├── apps/                              ← Deployable applications
│   ├── web/                           ← 🌐 Next.js 15 Frontend
│   │   ├── src/
│   │   │   ├── app/                   ← App Router pages
│   │   │   │   ├── (marketing)/       ← Landing, about
│   │   │   │   ├── dashboard/         ← Protected dashboard layout
│   │   │   │   │   ├── hacks/         ← Hacks Dashboard views
│   │   │   │   │   ├── skills/        ← AI Skills Explorer views
│   │   │   │   │   └── forensics/     ← Forensic analysis views
│   │   │   │   └── api/               ← Next.js API routes (if any)
│   │   │   ├── components/
│   │   │   │   ├── ui/               ← Base UI primitives
│   │   │   │   ├── hacks/            ← HackCard, HackTable, FilterSidebar
│   │   │   │   ├── skills/           ← SkillCard, SafetyBadge, CopyButton
│   │   │   │   ├── forensics/        ← TraceViewer, ExploitSimulator
│   │   │   │   └── layout/           ← Header, Sidebar, Footer
│   │   │   ├── lib/                  ← API client, utilities
│   │   │   ├── hooks/                ← Custom React hooks
│   │   │   └── styles/               ← Global CSS, design tokens
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api-gateway/                   ← 🚪 Fastify BFF API
│       ├── src/
│       │   ├── routes/
│       │   │   ├── hacks.ts           ← /api/v1/hacks/*
│       │   │   ├── skills.ts          ← /api/v1/skills/*
│       │   │   ├── forensics.ts       ← /api/v1/forensics/*
│       │   │   └── health.ts          ← /api/v1/health
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── rateLimit.ts
│       │   │   └── validation.ts
│       │   ├── config/
│       │   │   └── env.ts             ← Zod-validated env config
│       │   └── server.ts              ← Fastify entry point
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/                    ← DevOps & deployment
│   ├── docker/
│   │   ├── Dockerfile.api-gateway
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.hacks-worker
│   │   └── Dockerfile.skills-worker
│   ├── terraform/                     ← Cloud IaC (Phase 6)
│   └── ci/
│       └── .github/
│           └── workflows/
│               ├── ci.yml
│               └── deploy.yml
│
├── docs/                              ← Documentation hub
│   ├── CODE_REVIEW_PHASE0.md
│   ├── PHASE_0_PROJECT_INITIALIZATION.md  ← This file
│   ├── ARCHITECTURE.md                ← Phase 1 deliverable
│   ├── API_SPECIFICATION.md           ← Phase 1 deliverable
│   ├── BRAND_GUIDE.md
│   └── academic/
│       ├── thesis-1-proposal.md
│       └── thesis-2-proposal.md
│
├── research/                          ← Jupyter notebooks & experiments
│   ├── notebooks/
│   └── experiments/
│
├── .env.example                       ← Environment template
├── .gitignore
├── .gitattributes
├── .prettierrc
├── .eslintrc.cjs
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Makefile
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── package.json
└── README.md                          ← Project hero page
```

---

## Root Workspace Setup

### Step 1: Initialize pnpm Workspace

```bash
# Initialize root package.json
pnpm init

# Create workspace config
```

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Root `package.json`**:
```jsonc
{
  "name": "@aegis/root",
  "private": true,
  "version": "3.0.0",
  "description": "AltFlex AEGIS — Adaptive Exploit & Governance Intelligence System",
  "engines": {
    "node": ">=20.11.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "test": "turbo run test",
    "test:coverage": "turbo run test:coverage",
    "clean": "turbo run clean && rm -rf node_modules",
    "typecheck": "turbo run typecheck",
    "prepare": "husky"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

### Step 2: Turbo Configuration

**`turbo.json`**:
```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## Package Configuration

### @aegis/core — The Shared Kernel

```jsonc
// packages/core/package.json
{
  "name": "@aegis/core",
  "version": "3.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.22.0",
    "date-fns": "^3.3.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.3.0"
  }
}
```

### @aegis/hacks-engine

```jsonc
// packages/hacks-engine/package.json
{
  "name": "@aegis/hacks-engine",
  "version": "3.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@aegis/core": "workspace:*",
    "axios": "^1.6.0",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "bullmq": "^5.1.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "typescript": "^5.4.0",
    "vitest": "^1.3.0"
  }
}
```

### @aegis/skills-engine

```jsonc
// packages/skills-engine/package.json
{
  "name": "@aegis/skills-engine",
  "version": "3.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@aegis/core": "workspace:*",
    "gray-matter": "^4.0.3",
    "acorn": "^8.11.0",
    "acorn-walk": "^8.3.0",
    "semver": "^7.6.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "@types/semver": "^7.5.0",
    "typescript": "^5.4.0",
    "vitest": "^1.3.0"
  }
}
```

---

## Domain Models Blueprint

The domain layer is the **nucleus** of the hexagonal architecture. These models are pure TypeScript — zero framework or database coupling.

### Core Entities

```typescript
// packages/core/src/domain/entities/HackIncident.ts

import { z } from 'zod';
import { AttackVector } from '../value-objects/AttackVector';
import { Chain } from '../value-objects/Chain';

/**
 * HackIncident — Core domain entity representing a single DeFi exploit.
 *
 * Sourced from:
 * - DefiLlama Hacks API (financial macro data: TVL loss, date, protocol)
 * - SunWeb3Sec/DeFiHackLabs (granular: Foundry POC, root-cause vulnerability)
 *
 * @academic This entity is central to Thesis 1 (Pattern Classification)
 *           and Thesis 2 (Foundry-based simulation).
 */
export const HackIncidentSchema = z.object({
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  /** Protocol name (e.g., "Euler Finance", "Curve Lend") */
  protocolName: z.string().min(1),

  /** Date of the exploit */
  date: z.coerce.date(),

  /** Blockchain where the exploit occurred */
  chain: z.nativeEnum(Chain),

  /** Primary attack vector classification */
  attackVector: z.nativeEnum(AttackVector),

  /** Total value lost in USD */
  lossUsd: z.number().nonnegative(),

  /** Transaction hashes associated with the exploit */
  txHashes: z.array(z.string()).default([]),

  /** Reference URLs (Twitter/X posts, blog posts, etc.) */
  sources: z.array(z.string().url()).default([]),

  /** Whether a Foundry POC exists in DeFiHackLabs */
  hasFoundryPoc: z.boolean().default(false),

  /** Path to Foundry test file (relative to DeFiHackLabs repo) */
  foundryTestPath: z.string().optional(),

  /** Brief description of the vulnerability */
  description: z.string().default(''),

  /** Funds recovered (if any) */
  fundsReturned: z.number().nonnegative().default(0),

  /** ETL metadata */
  dataSource: z.enum(['defillama', 'defihacklabs', 'manual']),
  lastSyncedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type HackIncident = z.infer<typeof HackIncidentSchema>;
```

```typescript
// packages/core/src/domain/entities/AISkillFile.ts

import { z } from 'zod';
import { SafetyLabel } from '../value-objects/SafetyLabel';

/**
 * AISkillFile — An AI audit skill file scraped from GitHub.
 *
 * These are structured prompts (YAML/Markdown) that give AI assistants
 * specialized knowledge for smart contract security auditing.
 *
 * @academic This entity is central to Thesis 1 — the Safety Scanner
 *           analyzes these files for prompt injection and malicious intent.
 */
export const AISkillFileSchema = z.object({
  id: z.string().uuid(),

  /** Skill name (e.g., "Solidity Reentrancy Detector") */
  name: z.string().min(1),

  /** Source GitHub repository (owner/repo) */
  sourceRepo: z.string(),

  /** File path within the repository */
  filePath: z.string(),

  /** Target AI platform */
  platform: z.enum([
    'claude',
    'cursor',
    'mcp',
    'copilot',
    'gemini',
    'generic',
  ]),

  /** Target smart contract language */
  language: z.enum([
    'solidity',
    'vyper',
    'rust',
    'move',
    'cairo',
    'multi',
  ]),

  /** Raw file content */
  content: z.string(),

  /** File format */
  format: z.enum(['yaml', 'markdown', 'json', 'toml']),

  /** Safety assessment label */
  safetyLabel: z.nativeEnum(SafetyLabel),

  /** Author / team (e.g., "Trail of Bits", "Pashov", "Cyfrin") */
  author: z.string().default('Unknown'),

  /** Number of times copied by users */
  copyCount: z.number().int().nonnegative().default(0),

  /** Star / like count */
  starCount: z.number().int().nonnegative().default(0),

  /** Content hash for deduplication */
  contentHash: z.string(),

  /** Metadata */
  lastSyncedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AISkillFile = z.infer<typeof AISkillFileSchema>;
```

### Value Objects

```typescript
// packages/core/src/domain/value-objects/AttackVector.ts

/**
 * AttackVector — Enumerated vulnerability taxonomy.
 *
 * Aligned with the SmartContractHacking.com classification system
 * (11 base categories) plus extended categories for AltFlex AEGIS.
 */
export enum AttackVector {
  ACCESS_CONTROL        = 'access-control',
  ARITHMETIC_OVERFLOW   = 'arithmetic-overflow',
  DELEGATECALL_INJECTION = 'delegatecall-injection',
  FLASH_LOAN            = 'flash-loan',
  ORACLE_MANIPULATION   = 'oracle-manipulation',
  REENTRANCY            = 'reentrancy',
  DAO_GOVERNANCE        = 'dao-governance',
  FRONTRUNNING          = 'frontrunning',
  PHISHING              = 'phishing',
  DOS                   = 'dos',
  REPLAY                = 'replay',
  SELF_DESTRUCT         = 'self-destruct',
  RUG_PULL              = 'rug-pull',
  BRIDGE_EXPLOIT        = 'bridge-exploit',
  LOGIC_ERROR           = 'logic-error',
  OTHER                 = 'other',
}
```

```typescript
// packages/core/src/domain/value-objects/Chain.ts

/**
 * Chain — Supported blockchain networks.
 *
 * Designed for chain agnosticism: supports both EVM and Non-EVM chains.
 * Each chain has a unique slug, display name, chain ID (EVM only),
 * and block explorer URL.
 */
export enum Chain {
  // EVM Chains
  ETHEREUM  = 'ethereum',
  BSC       = 'bsc',
  POLYGON   = 'polygon',
  ARBITRUM  = 'arbitrum',
  OPTIMISM  = 'optimism',
  AVALANCHE = 'avalanche',
  BASE      = 'base',
  FANTOM    = 'fantom',
  GNOSIS    = 'gnosis',
  CRONOS    = 'cronos',

  // Non-EVM Chains
  SOLANA    = 'solana',
  COSMOS    = 'cosmos',
  NEAR      = 'near',
  STELLAR   = 'stellar',

  // Multi-chain / Unknown
  MULTI     = 'multi',
  UNKNOWN   = 'unknown',
}
```

```typescript
// packages/core/src/domain/value-objects/SafetyLabel.ts

/**
 * SafetyLabel — Safety classification for AI skill files.
 *
 * Assigned by the Skill Safety Scanner (Phase 3, Thesis 1).
 * The scanner uses AST parsing and regex rules to detect:
 * - Prompt injection patterns
 * - File-system read/write requests
 * - External API / network calls
 * - Code exfiltration vectors
 * - Shell command execution
 */
export enum SafetyLabel {
  /** Passed all safety checks — no suspicious patterns found */
  SAFE = 'safe',

  /** Has not been scanned yet — default state on first index */
  UNANALYZED = 'unanalyzed',

  /** Contains patterns that warrant manual review */
  SUSPICIOUS = 'suspicious',

  /** Contains confirmed malicious patterns — DO NOT USE */
  MALICIOUS = 'malicious',
}
```

### Hexagonal Ports (Abstract Interfaces)

```typescript
// packages/core/src/domain/ports/IHackDataPort.ts

import { HackIncident } from '../entities/HackIncident';
import { AttackVector } from '../value-objects/AttackVector';
import { Chain } from '../value-objects/Chain';

/**
 * IHackDataPort — Abstract interface for hack data persistence.
 *
 * This is a Hexagonal Architecture "Port". The domain layer depends
 * on this interface; concrete implementations (PostgreSQL, in-memory)
 * are "Adapters" that live outside the domain.
 *
 * @hexagonal Port — Domain Layer
 */
export interface IHackDataPort {
  findById(id: string): Promise<HackIncident | null>;
  findAll(filters: HackFilters): Promise<PaginatedResult<HackIncident>>;
  save(incident: HackIncident): Promise<void>;
  saveBatch(incidents: HackIncident[]): Promise<void>;
  count(filters?: Partial<HackFilters>): Promise<number>;
  getTotalLossUsd(filters?: Partial<HackFilters>): Promise<number>;
  getAttackVectorStats(): Promise<AttackVectorStat[]>;
}

export interface HackFilters {
  attackVector?: AttackVector;
  chain?: Chain;
  protocol?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minLossUsd?: number;
  maxLossUsd?: number;
  hasFoundryPoc?: boolean;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: 'date' | 'lossUsd' | 'protocolName';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AttackVectorStat {
  attackVector: AttackVector;
  count: number;
  totalLossUsd: number;
  lastIncidentDate: Date;
}
```

---

## Database Schema Design

### PostgreSQL Schema (Hacks Engine)

```sql
-- Infrastructure: packages/hacks-engine/src/infrastructure/migrations/001_create_hack_incidents.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

CREATE TABLE hack_incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_name   VARCHAR(255) NOT NULL,
    date            TIMESTAMPTZ NOT NULL,
    chain           VARCHAR(50) NOT NULL,
    attack_vector   VARCHAR(50) NOT NULL,
    loss_usd        NUMERIC(20, 2) NOT NULL DEFAULT 0,
    tx_hashes       TEXT[] DEFAULT '{}',
    sources         TEXT[] DEFAULT '{}',
    has_foundry_poc BOOLEAN DEFAULT FALSE,
    foundry_test_path VARCHAR(500),
    description     TEXT DEFAULT '',
    funds_returned  NUMERIC(20, 2) DEFAULT 0,
    data_source     VARCHAR(20) NOT NULL,
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance filtering
CREATE INDEX idx_hack_incidents_chain ON hack_incidents(chain);
CREATE INDEX idx_hack_incidents_attack_vector ON hack_incidents(attack_vector);
CREATE INDEX idx_hack_incidents_date ON hack_incidents(date DESC);
CREATE INDEX idx_hack_incidents_loss ON hack_incidents(loss_usd DESC);
CREATE INDEX idx_hack_incidents_protocol_trgm ON hack_incidents
    USING gin(protocol_name gin_trgm_ops);
```

### PostgreSQL Schema (Skills Engine)

```sql
-- Infrastructure: packages/skills-engine/src/infrastructure/migrations/001_create_ai_skills.sql

CREATE TABLE ai_skill_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    source_repo     VARCHAR(255) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    platform        VARCHAR(50) NOT NULL,
    language        VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    format          VARCHAR(20) NOT NULL,
    safety_label    VARCHAR(20) NOT NULL DEFAULT 'unanalyzed',
    author          VARCHAR(255) DEFAULT 'Unknown',
    copy_count      INTEGER DEFAULT 0,
    star_count      INTEGER DEFAULT 0,
    content_hash    VARCHAR(64) NOT NULL,  -- SHA-256
    last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_repo, file_path)
);

CREATE TABLE safety_scan_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_file_id   UUID NOT NULL REFERENCES ai_skill_files(id) ON DELETE CASCADE,
    scan_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    final_label     VARCHAR(20) NOT NULL,
    findings        JSONB NOT NULL DEFAULT '[]',
    rule_matches    JSONB NOT NULL DEFAULT '[]',
    scanner_version VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_skills_platform ON ai_skill_files(platform);
CREATE INDEX idx_ai_skills_language ON ai_skill_files(language);
CREATE INDEX idx_ai_skills_safety ON ai_skill_files(safety_label);
CREATE INDEX idx_ai_skills_content_hash ON ai_skill_files(content_hash);
CREATE INDEX idx_safety_scans_skill ON safety_scan_results(skill_file_id);
```

---

## Environment Variables

See `P0-INIT-006` in `CODE_REVIEW_PHASE0.md` for the complete `.env.example` template.

**Runtime Validation** — Environment variables are validated on startup using Zod:

```typescript
// apps/api-gateway/src/config/env.ts

import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_VERSION: z.string().default('3.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default('aegis_dev'),
  POSTGRES_USER: z.string().default('aegis'),
  POSTGRES_PASSWORD: z.string().min(1),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // API
  API_PORT: z.coerce.number().default(4000),
  API_RATE_LIMIT_MAX: z.coerce.number().default(100),
  JWT_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}
```

---

## Docker Orchestration

**`docker-compose.dev.yml`** — Development environment with hot-reload:

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: aegis-postgres
    environment:
      POSTGRES_DB: aegis_dev
      POSTGRES_USER: aegis
      POSTGRES_PASSWORD: devpassword
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U aegis']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: aegis-redis
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  api-gateway:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.api-gateway
      target: development
    container_name: aegis-api
    ports:
      - '4000:4000'
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./packages:/app/packages
      - ./apps/api-gateway:/app/apps/api-gateway

  web:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.web
      target: development
    container_name: aegis-web
    ports:
      - '3000:3000'
    env_file: .env
    depends_on:
      - api-gateway
    volumes:
      - ./apps/web:/app/apps/web

volumes:
  postgres_data:
```

---

## Code Quality Tooling

### Prettier Configuration

**`.prettierrc`**:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true
}
```

### ESLint Configuration

**`.eslintrc.cjs`**:
```javascript
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.base.json', './packages/*/tsconfig.json', './apps/*/tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'prettier', // Must be last
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist/', 'node_modules/', '.next/', '*.js', '*.cjs'],
};
```

### Husky Setup

```bash
# Initialize Husky
pnpm exec husky init

# Pre-commit hook
echo 'pnpm exec lint-staged' > .husky/pre-commit

# Commit message hook (Conventional Commits)
cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate conventional commit format
commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z-]+\))?!?: .{1,}"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo "❌ Invalid commit message format."
  echo "   Expected: <type>(<scope>): <description>"
  echo "   Example:  feat(hacks-engine): add DefiLlama ETL adapter"
  exit 1
fi
EOF
```

---

## Git Configuration & Branch Strategy

### `.gitignore`

```gitignore
# === Dependencies ===
node_modules/
.pnpm-store/

# === Build Output ===
dist/
.next/
out/
*.tsbuildinfo

# === Environment ===
.env
.env.local
.env.*.local

# === IDE ===
.vscode/settings.json
.idea/
*.swp
*.swo

# === OS ===
.DS_Store
Thumbs.db

# === Testing ===
coverage/
*.lcov

# === Docker ===
docker-compose.override.yml

# === Foundry ===
cache/
broadcast/

# === Python (research notebooks) ===
__pycache__/
*.pyc
.venv/
*.pkl
*.h5

# === Logs ===
logs/
*.log

# === Data (use Git LFS for large files) ===
*.csv
*.parquet
!seed/**/*.csv
```

### Branch Strategy

```mermaid
gitgraph
    commit id: "Phase 0: Init"
    branch develop
    commit id: "P0: Scaffold"
    commit id: "P0: Domain Models"

    branch feat/hacks-etl
    commit id: "P2: DefiLlama adapter"
    commit id: "P2: DeFiHackLabs parser"
    checkout develop
    merge feat/hacks-etl

    branch feat/skills-scanner
    commit id: "P3: Safety Scanner"
    commit id: "P3: AST Parser"
    checkout develop
    merge feat/skills-scanner

    branch thesis/1/safety-analysis
    commit id: "T1: Research methodology"
    commit id: "T1: Results & analysis"
    checkout develop
    merge thesis/1/safety-analysis

    checkout main
    merge develop id: "v3.0.0-alpha"
```

---

## Validation Checklist

Run these commands after completing all P0 tasks. **Every check must pass.**

```bash
# 1. Dependencies
pnpm install                              # ✅ Zero errors

# 2. Build
pnpm run build                            # ✅ All packages compile

# 3. Type checking
pnpm run typecheck                        # ✅ Zero type errors

# 4. Linting
pnpm run lint                             # ✅ Zero lint errors

# 5. Formatting
pnpm run format:check                     # ✅ Zero formatting issues

# 6. Tests (smoke)
pnpm run test                             # ✅ Basic tests pass

# 7. Docker services
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps  # ✅ All healthy

# 8. Service connectivity
curl http://localhost:4000/api/v1/health   # ✅ API responds
curl http://localhost:3000                 # ✅ Frontend loads

# 9. Database
docker exec aegis-postgres psql -U aegis -d aegis_dev -c "SELECT 1;"  # ✅ Connected

# 10. Redis
docker exec aegis-redis redis-cli ping    # ✅ PONG

# 11. Git hooks
git add . && git commit -m "test: invalid" # ❌ Rejected (bad format)
git commit -m "feat(core): add domain models" # ✅ Accepted
```

---

## Academic Alignment Matrix

> This matrix maps each AltFlex AEGIS phase to academic deliverables, ensuring the project satisfies both commercial and thesis requirements.

| Phase | Timeline | Academic Deliverable | Thesis | Commercial Value |
|-------|----------|---------------------|--------|-----------------|
| **Phase 0** | Week 1–2 | Project proposal, methodology design | Methods of Research | Platform foundation |
| **Phase 1** | Week 3–4 | Architecture documentation, literature review | Methods of Research | API specification |
| **Phase 2** | Week 5–8 | Data pipeline validation, ETL benchmarks | Methods of Research | Real-time hack data |
| **Phase 3** | Week 9–16 | **Safety Scanner research & implementation** | **Thesis 1** | AI skill governance |
| **Phase 4** | Week 17–22 | Frontend implementation, UX study | Thesis 1 / Thesis 2 | User-facing product |
| **Phase 5** | Week 23–32 | **Deep EVM analysis, Foundry integration** | **Thesis 2** | Forensic intelligence |
| **Phase 6** | Week 33–40 | Performance evaluation, deployment study | Thesis 2 | Production launch |

### Thesis 1 Scope (AI Safety Scanner)
- **Title**: "Automated Detection of Malicious Intent in AI Audit Skill Files for Web3 Security"
- **Core Contribution**: AST-based parser + heuristic rules for detecting prompt injection, file-system abuse, code exfiltration in YAML/Markdown skill files
- **Evaluation**: Accuracy, precision, recall against labeled dataset of safe/malicious skill files

### Thesis 2 Scope (Deep EVM Integration)
- **Title**: "Programmatic Exploit Simulation and Forensic Trace Analysis Using Foundry for Historical DeFi Incidents"
- **Core Contribution**: Automated Foundry POC execution, transaction trace visualization, root-cause mapping
- **Evaluation**: Coverage of DeFiHackLabs POCs, simulation accuracy, trace analysis depth

---

## Common Pitfalls & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| `ERR_PNPM_PEER_DEP_ISSUES` | Strict peer dependency enforcement | Add `auto-install-peers=true` to `.npmrc` |
| TypeScript path aliases not resolving | Missing `paths` in `tsconfig.json` | Ensure `baseUrl` is set and paths map to `workspace:*` |
| Docker Compose `depends_on` race | Service starts before DB is ready | Use `healthcheck` + `condition: service_healthy` |
| Husky hooks not triggering | `.husky/` not initialized | Run `pnpm exec husky init` |
| `Cannot find module '@aegis/core'` | pnpm workspace not linked | Run `pnpm install` from root (not from package) |
| ESLint `parserOptions.project` error | `tsconfig.json` not found | Ensure `tsconfigRootDir` points to monorepo root |
| Next.js + pnpm `ENOENT` | Symlink issues on Windows | Add `shamefully-hoist=true` to `.npmrc` |
| PostgreSQL connection refused | Docker not running or port conflict | `docker compose ps` and check port `5432` |

---

## What's Next: Phase 1

Once Phase 0 validation is complete, Phase 1 will deliver:

- 📄 **ARCHITECTURE.md** — Full hexagonal architecture diagrams with Mermaid
- 📄 **API_SPECIFICATION.md** — OpenAPI 3.1 spec for all endpoints
- 📄 **README.md** — New hero page with AEGIS branding
- 🗄️ **Database migrations** — Production-ready PostgreSQL schemas
- 🧪 **Seed data** — Development dataset from DefiLlama + DeFiHackLabs

> **⚠️ Phase 1 is gated on Phase 0 completion. Do not proceed until the Validation Checklist is fully green.**

---

*Document Version: 3.0.0*  
*Author: AltFlex AEGIS Engineering*  
*Last Updated: March 2026*

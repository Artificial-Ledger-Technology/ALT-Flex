## 🚀 PR Title: feat(architecture): Wire Inter-Package Dependencies (P1-ARCH-009)

### 📌 Problem Statement

The AEGIS v3.0 monorepo workspace was scaffolded but the inter-package dependency boundary was hollow. Engine packages lacked barrel exports, the `@aegis/core` package had no modern `exports` map for Node.js resolution, Next.js was missing core in its explicit dependencies, and `tsc --build` from the root was broken. This structural deficiency blocked the Shared Error & Logging framework (P1-ARCH-010).

### 🎯 Architecture Decisions & Changes

This PR systematically addresses the monorepo wiring according to hexagonal architecture principles and Turborepo best practices:

- **Root TypeScript Reference Topology**: Created a root `tsconfig.json` with project references to all 6 workspace packages (`core`, `hacks-engine`, `skills-engine`, `forensic-engine`, `api-gateway`, `web`), enabling topological, incremental builds via `tsc --build`.
- **Node.js ESM Resolution Maps**: Added conditional `exports` fields to all package `package.json` configurations, ensuring correct native ES module resolution.
- **Forward-Compatible Barrel Exports**: Transformed the empty `index.ts` files inside all three Engine packages into robust, well-documented barrel exports that selectively re-export Domain Entities, Value Objects, Ports, and API Schemas from `@aegis/core`.
- **Sub-module Layer Stubs**: Replaced empty `.gitkeep` files with `index.ts` placeholder exports in the `adapters/`, `application/`, `domain/`, and `infrastructure/` subdirectories of each engine to establish strict boundaries for Phase 2, 3, and 5 integrations.
- **Next.js Dependency Link**: Added `@aegis/core: workspace:*` to the Next.js `apps/web/package.json` dependencies to ensure correct linking by `pnpm install` alongside `transpilePackages`.

### 🤖 Agentic Infrastructure Enhancements

- **New Role Introduced**: Created the God-level **Senior Monorepo Infrastructure Engineer** skill file for both Claude and Gemini. This specialist AI role now governs the workspace architecture, pnpm cataloging, TS composite topologies, and Turborepo performance optimizations for the squad.

### ✅ Verification Status

- [x] `pnpm install` completes with `workspace:*` links properly resolved.
- [x] `pnpm run build` fully constructs all 6 packages via Turborepo without circular dependency errors.
- [x] `tsc --build` executes successfully from the root directory.
- [x] `pnpm run typecheck` produces **0 errors** across the entire workspace.

### ⛓️ Dependencies

- **Depends On:** Phase 0 Initialization (P1-ARCH-001)
- **Unblocks:** Shared Error Handling & Logging Framework (P1-ARCH-010)

> _"Surgical changes, simplicity first, verifiable success." — Monorepo Infrastructure Engineer_

# Code Style — Mandatory Rules

## TypeScript Standards

### Strict Mode

- `strict: true` — non-negotiable
- `noUncheckedIndexedAccess: true` — array/object access returns `T | undefined`
- `exactOptionalPropertyTypes: true` — `undefined` must be explicit
- `noImplicitReturns: true` — all code paths must return
- `noFallthroughCasesInSwitch: true` — every case needs `break` or `return`

### Type Safety

- **NEVER use `any`** — use `unknown` and narrow with type guards
- **NEVER use type assertions (`as`)** unless unavoidable and commented with justification
- Use `satisfies` operator for type checking without widening
- Use branded types for domain identifiers (e.g., `HackId`, `SkillId`)
- Use discriminated unions for state machines and variant types
- Use `const` assertions for literal types: `as const`

### Naming Conventions

| Element               | Convention                       | Example                                  |
| --------------------- | -------------------------------- | ---------------------------------------- |
| Variables / Functions | camelCase                        | `getHackById`, `filterByChain`           |
| Constants             | SCREAMING_SNAKE_CASE             | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`   |
| Types / Interfaces    | PascalCase                       | `HackIncident`, `IChainDataPort`         |
| Enums                 | PascalCase (members: PascalCase) | `AttackVector.FlashLoan`                 |
| Files                 | kebab-case                       | `hack-incident.ts`, `chain-data-port.ts` |
| Directories           | kebab-case                       | `value-objects/`, `use-cases/`           |
| Port Interfaces       | `I` prefix + PascalCase          | `IHackDataPort`, `ICachePort`            |
| React Components      | PascalCase                       | `HackCard.tsx`, `FilterSidebar.tsx`      |

### Imports

- Use named imports, avoid `import *`
- Group imports: 1) Node built-ins, 2) External deps, 3) Internal `@aegis/*`, 4) Relative
- Sort imports alphabetically within groups
- Use the `type` keyword for type-only imports: `import type { HackIncident } from '@aegis/core'`

## Formatting (Prettier)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

## ESLint Rules

- Extends `@typescript-eslint/recommended-type-checked`
- No `console.log` in production code (use Winston logger)
- No unused variables (prefix with `_` if intentionally unused)
- Prefer `const` over `let`, never use `var`
- Use arrow functions for callbacks
- Prefer template literals over string concatenation
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## Documentation

### Code Comments

- Explain **why**, not **what** — the code should be self-documenting
- Use JSDoc for public API functions
- Use `// TODO(username):` for tracked todos
- Use `// HACK:` for temporary workarounds (must have linked issue)

### File Headers

Every source file should have a brief module-level comment if the purpose isn't obvious from the filename:

```typescript
/**
 * @module SyncHacksUseCase
 * Orchestrates the ETL pipeline that syncs DeFi hack data from
 * DefiLlama API and SunWeb3Sec/DeFiHackLabs GitHub repository.
 */
```

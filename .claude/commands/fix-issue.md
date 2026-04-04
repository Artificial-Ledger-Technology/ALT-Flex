# /fix-issue — Issue Diagnosis & Resolution Command

## Description

Systematically diagnose and fix issues in the AltFlex AEGIS codebase. Follows a structured root-cause analysis workflow before applying fixes.

## Usage

```
/fix-issue [description or error message]
```

## Diagnostic Workflow

### Step 1: Reproduce

- Parse the error message or issue description
- Identify the affected package: `core` | `hacks-engine` | `skills-engine` | `forensic-engine` | `api-gateway` | `web`
- Attempt to reproduce locally

### Step 2: Locate

- Search for the error origin using stack traces
- Check recent commits on the affected package: `git log --oneline -10 -- packages/<pkg>/`
- Identify the root cause file and line number

### Step 3: Understand

- Read the surrounding code context
- Check the hexagonal architecture boundary — is the bug in Domain, Port, Adapter, or Application layer?
- Review related tests for missing edge cases
- Check if the issue affects other packages through the dependency chain:
  ```
  @aegis/core ← (depended on by all engines)
  @aegis/hacks-engine ← @aegis/api-gateway
  @aegis/skills-engine ← @aegis/api-gateway
  @aegis/forensic-engine ← @aegis/api-gateway
  ```

### Step 4: Fix

- Apply the minimal, targeted fix
- Ensure the fix respects hexagonal boundaries
- Use proper TypeScript types — no `any` escape hatches
- Validate with Zod schemas if the fix involves data flow
- Follow existing patterns in the codebase

### Step 5: Test

- Write or update unit tests to cover the fix
- Run the affected package tests: `pnpm --filter @aegis/<pkg> test`
- Run the full test suite: `pnpm test`
- Verify typecheck passes: `pnpm typecheck`

### Step 6: Verify

- Run `pnpm lint` — zero errors
- Run `pnpm build` — clean build
- If the fix touches API routes, verify with health check
- If the fix touches domain models, verify Zod validation

## Common Issue Categories

### TypeScript Errors

- Check `tsconfig.json` extends `../../tsconfig.base.json` correctly
- Verify `workspace:*` dependencies are installed: `pnpm install`
- Check path aliases resolve: `@aegis/core` → `packages/core/src`

### Build Failures

- Clear Turbo cache: `pnpm clean`
- Reinstall deps: `rm -rf node_modules && pnpm install`
- Check build order in `turbo.json` — packages must build before dependents

### Database Issues

- Verify Docker services: `docker compose -f docker-compose.dev.yml ps`
- Check PostgreSQL: `docker compose -f docker-compose.dev.yml logs postgres`
- Check Redis: `docker compose -f docker-compose.dev.yml logs redis`

### Environment Issues

- Compare `.env` against `.env.example` for missing variables
- Validate `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Check `NODE_ENV` is set correctly

## Commit Convention for Fixes

```
fix(<scope>): <short description of what was fixed>

# Examples:
fix(core): resolve HackIncident schema strict validation
fix(api-gateway): handle missing auth header gracefully
fix(web): prevent hydration mismatch in HackCard component
```

## Output Format

After fixing, provide:

1. **Root Cause**: What caused the issue
2. **Fix Applied**: What was changed and why
3. **Tests Added**: What test coverage was added
4. **Verification**: Confirmation that all checks pass

# /deploy — Deployment Orchestration Command

## Description

Orchestrate the deployment pipeline for AltFlex AEGIS services. Handles build verification, Docker image creation, environment validation, and service deployment.

## Usage

```
/deploy [target] [environment]
```

**Targets**: `all` | `api-gateway` | `web` | `hacks-worker` | `skills-worker` | `infrastructure`  
**Environments**: `dev` | `staging` | `production`

## Pre-Deployment Checklist

Before deploying, verify ALL of the following:

1. **Code Quality Gate**

   ```bash
   pnpm lint          # Zero ESLint errors
   pnpm typecheck     # Zero TypeScript errors
   pnpm test          # All tests pass
   pnpm build         # Clean build across all packages
   ```

2. **Environment Validation**
   - Confirm `.env` has all required variables from `.env.example`
   - Verify database connection: PostgreSQL 16 on port 5432
   - Verify cache connection: Redis 7 on port 6379
   - Validate JWT_SECRET is ≥ 32 characters (production only)

3. **Docker Build**

   ```bash
   # Development
   docker compose -f docker-compose.dev.yml up --build -d

   # Production
   docker compose -f docker-compose.prod.yml up --build -d
   ```

4. **Health Check Verification**
   - API Gateway: `GET http://localhost:4000/api/v1/health`
   - Web Frontend: `http://localhost:3000`
   - PostgreSQL: `pg_isready -h localhost -p 5432`
   - Redis: `redis-cli ping`

## Deployment Steps

### Development Environment

1. Run `docker compose -f docker-compose.dev.yml up -d` for PostgreSQL + Redis
2. Run `pnpm dev` to start all services with hot-reload
3. Verify health endpoints respond with `status: "ok"`

### Staging Environment

1. Ensure all PRs are merged to `develop` branch
2. Run full CI pipeline: lint → typecheck → test → build
3. Build Docker images with staging tag
4. Deploy using blue-green strategy
5. Run smoke tests against staging endpoints
6. Monitor logs for 15 minutes post-deploy

### Production Environment

1. Create release branch from `develop`
2. Tag release: `git tag v3.0.x`
3. Build production Docker images
4. Deploy with canary strategy (10% → 50% → 100%)
5. Verify all health checks
6. Monitor error rates and latency for 30 minutes
7. Merge release branch to `main`

## Rollback Procedure

If any deployment fails:

1. Stop the failed deployment immediately
2. Rollback to the previous Docker image tag
3. Verify health checks on rollback
4. Create an incident report
5. Open a `fix/` branch for the root cause

## Post-Deployment

- Verify Turbo cache is warm for subsequent builds
- Confirm database migrations ran successfully
- Check that BullMQ workers are processing jobs
- Monitor PostgreSQL connection pool usage

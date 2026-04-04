---
name: Deploy
description: End-to-end deployment orchestration for AltFlex AEGIS services — from build verification through Docker containerization, infrastructure provisioning, and production deployment with health monitoring.
---

# Deploy Skill

You are the **Deployment Specialist** for AltFlex AEGIS v3.0. You orchestrate the full deployment lifecycle across all environments (development, staging, production) for the dual-engine Web3 security intelligence platform.

## Core Capabilities

### Build Pipeline

- Verify code quality: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- Validate Turbo cache integrity and task graph
- Ensure all `workspace:*` dependencies resolve correctly
- Verify `@aegis/core` builds before dependent packages (topological order)

### Docker Operations

- Build multi-stage Docker images for each service
- Optimize layer caching for faster rebuilds
- Scan images for vulnerabilities (Trivy)
- Tag images with Git commit SHA + semantic version

### Environment Management

- Validate all `.env` variables against `.env.example` schema
- Verify database connectivity (PostgreSQL 16 on port 5432)
- Verify cache connectivity (Redis 7 on port 6379)
- Ensure JWT_SECRET meets minimum length (32 chars) in production
- Validate RPC endpoint availability for Forensic Engine

### Infrastructure

- Docker Compose for local development stack
- Health check verification for all services
- Database migration execution (forward-only in production)
- BullMQ worker health monitoring
- Connection pool status verification

## Deployment Environments

### Development

```bash
# Boot infrastructure
docker compose -f docker-compose.dev.yml up -d

# Start all services with hot-reload
pnpm dev

# Verify
curl http://localhost:4000/api/v1/health  # API Gateway
curl http://localhost:3000                  # Web Frontend
```

### Staging

1. All PRs merged to `develop` branch
2. Full CI pipeline passes
3. Build Docker images with staging tag
4. Blue-green deployment strategy
5. Smoke test all health endpoints
6. Monitor for 15 minutes before promotion

### Production

1. Release branch from `develop`
2. Semantic version tag: `v3.0.x`
3. Production Docker image build
4. Canary deployment: 10% → 50% → 100%
5. All health checks verified
6. 30-minute monitoring window
7. Merge release to `main`

## Service Health Checks

| Service      | Health Endpoint                   | Expected Response                        |
| ------------ | --------------------------------- | ---------------------------------------- |
| API Gateway  | `GET /api/v1/health`              | `{ "status": "ok", "version": "3.0.0" }` |
| PostgreSQL   | `pg_isready -h localhost -p 5432` | Exit code 0                              |
| Redis        | `redis-cli ping`                  | `PONG`                                   |
| Web Frontend | `GET http://localhost:3000`       | HTTP 200                                 |

## Rollback Procedure

If deployment fails:

1. Immediately stop the failing deployment
2. Revert to previous Docker image tag
3. Verify health checks pass on rollback
4. Create incident report with root cause
5. Open `fix/` branch for the issue

## Post-Deployment Checklist

- [ ] All health endpoints return `status: "ok"`
- [ ] Database migrations completed successfully
- [ ] BullMQ workers are processing jobs (hacks-sync, skills-index)
- [ ] Error rate < 0.1% in first 30 minutes
- [ ] Response latency P99 < 500ms
- [ ] Redis cache warming complete
- [ ] Turbo build cache populated for hot pipeline

## When to Invoke This Skill

- Setting up local development environment
- Deploying to any environment (dev, staging, production)
- Troubleshooting deployment failures
- Verifying service health after changes
- Running database migrations
- Rolling back a failed deployment
- Configuring Docker and infrastructure

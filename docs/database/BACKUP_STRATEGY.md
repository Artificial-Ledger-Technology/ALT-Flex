# Database Backup Strategy — AltFlex AEGIS v3.0

> **Task**: P6-PROD-009 — Finalize DB Migration Pipeline and Automated Backups
> **Author**: Senior Data Architect
> **Last Updated**: August 2026

---

## Overview

This document defines the database backup and recovery strategy for AltFlex AEGIS v3.0.
The strategy covers automated backups, retention policies, recovery procedures, and
platform-specific configuration for Railway, Render, and self-hosted environments.

---

## Backup Architecture

```
┌─────────────────────┐     pg_dump      ┌──────────────────────┐
│  PostgreSQL 16      │ ──────────────── │  Local Backup Volume │
│  (aegis_prod)       │                  │  /backups/           │
└─────────────────────┘                  └──────────┬───────────┘
                                                    │
                                              aws s3 cp
                                                    │
                                         ┌──────────▼───────────┐
                                         │  S3 Bucket (offsite) │
                                         │  (optional)          │
                                         └──────────────────────┘
```

### Components

| Component                | Location                                   | Purpose                          |
| ------------------------ | ------------------------------------------ | -------------------------------- |
| `db-backup.sh`           | `infrastructure/scripts/db-backup.sh`      | Automated pg_dump + S3 upload    |
| `db-restore.sh`          | `infrastructure/scripts/db-restore.sh`     | Restore from backup file or S3   |
| `docker-entrypoint.sh`   | `infrastructure/scripts/docker-entrypoint.sh` | Auto-migrate before API start |
| `db-backup` service      | `docker-compose.prod.yml`                  | Cron-scheduled backup container  |

---

## Migration Pipeline

### Deployment Flow

```
Container Start
    │
    ▼
┌──────────────────────────┐
│ docker-entrypoint.sh     │
│                          │
│  1. SKIP_MIGRATIONS?     │──── true ──▶ Skip to step 3
│  2. Run migrate.js       │──── fail ──▶ EXIT 1 (container stops)
│  3. RUN_SEED?            │──── true ──▶ Run seed.js (non-fatal)
│  4. Start server         │
└──────────────────────────┘
```

### Environment Variables

| Variable          | Default   | Description                                           |
| ----------------- | --------- | ----------------------------------------------------- |
| `SKIP_MIGRATIONS` | `false`   | Skip migrations on container start (for scaling)      |
| `RUN_SEED`        | `false`   | Run seed script after migrations (first deploy only)  |
| `DATABASE_URL`    | (required)| PostgreSQL connection string                          |

### Migration Safety

- **Idempotent**: All migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`
- **Tracked**: Applied migrations recorded in `schema_migrations` table
- **Reversible**: Each migration file contains `-- DOWN` block for rollback
- **Sequential**: Applied in alphabetical order by filename
- **Fail-fast**: Container does NOT start if migration fails

---

## Backup Schedule

### Default Schedule

| Schedule         | Type        | Retention   | Storage              |
| ---------------- | ----------- | ----------- | -------------------- |
| Daily at 02:00 UTC | Full backup | 30 days    | Local volume + S3    |

### Backup Format

- **Tool**: `pg_dump` with custom format (`-Fc`)
- **Compression**: Level 9 (maximum)
- **Naming**: `aegis_YYYYMMDD_HHMMSS.dump`
- **Average Size**: ~5-50 MB (depends on data volume)

---

## Environment Variables (Backup)

| Variable                 | Default        | Description                                |
| ------------------------ | -------------- | ------------------------------------------ |
| `BACKUP_DIR`             | `/backups`     | Local directory for backup storage         |
| `BACKUP_RETENTION_DAYS`  | `30`           | Days to keep local backups before cleanup  |
| `BACKUP_S3_BUCKET`       | (disabled)     | S3 bucket URI (e.g., `s3://my-bucket/aegis`) |
| `BACKUP_S3_REGION`       | `us-east-1`   | AWS region for S3 operations               |
| `BACKUP_FILENAME_PREFIX` | `aegis`        | Prefix for backup filenames                |

---

## Recovery Procedures

### Recovery Time Objective (RTO)

| Scenario                    | Target RTO | Method                              |
| --------------------------- | ---------- | ----------------------------------- |
| Schema corruption           | < 15 min   | Re-run migrations (`pnpm run migrate`) |
| Data corruption (recent)    | < 30 min   | pg_restore from latest backup       |
| Data corruption (historical)| < 1 hour   | pg_restore from S3 backup archive   |
| Complete database loss       | < 1 hour   | pg_restore + re-run seed + ETL sync |

### Recovery Point Objective (RPO)

| Data Type          | RPO          | Rationale                                          |
| ------------------ | ------------ | -------------------------------------------------- |
| Hack Incidents     | < 24 hours   | Re-syncable from DefiLlama/DeFiHackLabs APIs      |
| AI Skill Files     | < 24 hours   | Re-syncable from GitHub API                        |
| Safety Scan Results| < 24 hours   | Re-scannable from cached skill content             |
| ETL Sync Log       | Acceptable loss | Operational metadata, not business-critical       |

### Restore Steps

#### From Local Backup

```bash
# 1. List available backups
ls -la /backups/

# 2. Restore from latest
./infrastructure/scripts/db-restore.sh /backups/aegis_20260810_020000.dump

# 3. Verify
pnpm run migrate   # Ensure schema is up-to-date after restore
```

#### From S3 Backup

```bash
# 1. List available S3 backups
aws s3 ls s3://my-bucket/aegis-backups/

# 2. Restore directly from S3
./infrastructure/scripts/db-restore.sh s3://my-bucket/aegis-backups/aegis_20260810_020000.dump
```

---

## Platform-Specific Configuration

### Railway

Railway provides managed PostgreSQL with automatic backups:

1. Navigate to your Railway project → PostgreSQL service
2. Go to **Settings** → **Backups**
3. Enable automatic backups (daily by default)
4. Set retention period (7 days on Hobby, 30 days on Pro)

> [!NOTE]
> Railway's managed backups complement the `db-backup.sh` script.
> Use both for defense-in-depth: managed backups for convenience,
> scripted backups to S3 for offsite disaster recovery.

### Render

Render provides managed PostgreSQL with automatic daily backups:

1. Navigate to your Render dashboard → PostgreSQL service
2. Go to **Backups** tab
3. Automatic daily backups are enabled by default
4. Point-in-time recovery available on paid plans

> [!NOTE]
> Render retains 7 days of backups on free tier, 30 days on paid.
> Supplement with the S3 backup script for longer retention.

### Self-Hosted (Docker Compose)

The `db-backup` service in `docker-compose.prod.yml` runs the backup script
on a cron schedule automatically:

```yaml
# Already configured in docker-compose.prod.yml
db-backup:
  image: postgres:16-alpine
  # Runs daily at 02:00 UTC via crond
  volumes:
    - backupdata_prod:/backups
```

To set up S3 offsite backups, set these environment variables:

```bash
BACKUP_S3_BUCKET=s3://your-bucket/aegis-backups
BACKUP_S3_REGION=us-east-1
```

---

## Manual Operations

### Run Backup Manually

```bash
# Via Make
make backup

# Via Docker
docker compose -f docker-compose.prod.yml exec db-backup /scripts/db-backup.sh

# Via script directly (requires pg_dump in PATH)
DATABASE_URL=postgresql://... ./infrastructure/scripts/db-backup.sh
```

### Run Restore Manually

```bash
# Via Make
make restore BACKUP_FILE=/backups/aegis_20260810_020000.dump

# Via script directly
DATABASE_URL=postgresql://... ./infrastructure/scripts/db-restore.sh /backups/aegis_20260810_020000.dump
```

### Run Migrations Manually

```bash
# Apply all pending migrations
pnpm run migrate
pnpm run db:migrate    # alias

# Rollback all migrations
pnpm run migrate:down

# Seed database
pnpm run seed
pnpm run db:seed       # alias
```

---

## Monitoring & Alerting

### Backup Health Checks

- Monitor the `db-backup` container exit codes via Docker health checks
- Set up alerts for non-zero exit codes (backup failure)
- Track backup file sizes — sudden drops may indicate partial backups

### Recommended Alerts

| Alert                      | Condition                                | Severity |
| -------------------------- | ---------------------------------------- | -------- |
| Backup failed              | `db-backup` container exit code ≠ 0      | 🔴 P0   |
| No backup in 48 hours      | Latest `.dump` file older than 48h       | 🟠 P1   |
| Backup size anomaly        | File size < 50% of 7-day average         | 🟡 P2   |
| S3 upload failed           | S3 upload step returned non-zero         | 🟡 P2   |

---

_Document Version: 1.0.0_
_Task: P6-PROD-009_
_Phase: Phase 6 — Production Hardening & CI/CD_

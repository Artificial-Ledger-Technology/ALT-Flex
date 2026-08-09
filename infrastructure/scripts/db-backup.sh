#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# AltFlex AEGIS v3.0 — Database Backup Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Automated PostgreSQL backup using pg_dump with optional S3 upload.
# Designed to run as a cron job or manually via `make backup`.
#
# Environment Variables (Required):
#   DATABASE_URL            — PostgreSQL connection string
#
# Environment Variables (Optional):
#   BACKUP_DIR              — Local backup directory (default: /backups)
#   BACKUP_RETENTION_DAYS   — Days to keep local backups (default: 30)
#   BACKUP_S3_BUCKET        — S3 bucket for offsite backup (e.g., s3://my-bucket/aegis-backups)
#   BACKUP_S3_REGION        — AWS region for S3 bucket (default: us-east-1)
#   BACKUP_FILENAME_PREFIX  — Prefix for backup files (default: aegis)
#
# Output:
#   Creates compressed pg_dump files: <prefix>_<YYYYMMDD_HHMMSS>.dump
#   Exit code 0 on success, 1 on failure.
#
# Usage:
#   ./db-backup.sh                     # Run backup with defaults
#   BACKUP_S3_BUCKET=s3://my-bucket/aegis ./db-backup.sh   # Backup + S3 upload
#
# Cron Example (daily at 02:00 UTC):
#   0 2 * * * /app/scripts/db-backup.sh >> /var/log/aegis-backup.log 2>&1
#
# @task P6-PROD-009
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ── Configuration ────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_FILENAME_PREFIX="${BACKUP_FILENAME_PREFIX:-aegis}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-us-east-1}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${BACKUP_FILENAME_PREFIX}_${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# ── Validation ───────────────────────────────────────────────────────────────
if [ -z "${DATABASE_URL}" ]; then
  echo "[$(date -Iseconds)] ❌ ERROR: DATABASE_URL is not set. Aborting backup."
  exit 1
fi

# ── Setup ────────────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

echo "═══════════════════════════════════════════════════════════════"
echo "  🗄️  AEGIS v3.0 — Database Backup"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Timestamp:  ${TIMESTAMP}"
echo "  Output:     ${BACKUP_PATH}"
echo "  Retention:  ${BACKUP_RETENTION_DAYS} days"
echo ""

# ── Step 1: Create Backup ────────────────────────────────────────────────────
echo "[$(date -Iseconds)] 📦 Starting pg_dump..."

if pg_dump "${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_PATH}" \
  2>&1; then
  BACKUP_SIZE=$(ls -lh "${BACKUP_PATH}" | awk '{print $5}')
  echo "[$(date -Iseconds)] ✅ Backup created: ${BACKUP_FILENAME} (${BACKUP_SIZE})"
else
  echo "[$(date -Iseconds)] ❌ pg_dump failed. Aborting."
  exit 1
fi

echo ""

# ── Step 2: Upload to S3 (Optional) ─────────────────────────────────────────
if [ -n "${BACKUP_S3_BUCKET}" ]; then
  echo "[$(date -Iseconds)] ☁️  Uploading to S3: ${BACKUP_S3_BUCKET}/${BACKUP_FILENAME}"

  if command -v aws > /dev/null 2>&1; then
    if aws s3 cp "${BACKUP_PATH}" "${BACKUP_S3_BUCKET}/${BACKUP_FILENAME}" \
      --region "${BACKUP_S3_REGION}" \
      2>&1; then
      echo "[$(date -Iseconds)] ✅ S3 upload successful."
    else
      echo "[$(date -Iseconds)] ⚠️  S3 upload failed. Local backup is still available."
    fi
  else
    echo "[$(date -Iseconds)] ⚠️  AWS CLI not installed. Skipping S3 upload."
    echo "   Install with: apk add --no-cache aws-cli"
  fi
  echo ""
fi

# ── Step 3: Cleanup Old Backups ──────────────────────────────────────────────
echo "[$(date -Iseconds)] 🧹 Cleaning backups older than ${BACKUP_RETENTION_DAYS} days..."

DELETED_COUNT=$(find "${BACKUP_DIR}" -name "${BACKUP_FILENAME_PREFIX}_*.dump" -type f -mtime +${BACKUP_RETENTION_DAYS} -print -delete | wc -l)

if [ "${DELETED_COUNT}" -gt 0 ]; then
  echo "[$(date -Iseconds)] 🗑️  Deleted ${DELETED_COUNT} old backup(s)."
else
  echo "[$(date -Iseconds)] ✅ No old backups to clean."
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "${BACKUP_FILENAME_PREFIX}_*.dump" -type f | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | awk '{print $1}')

echo "═══════════════════════════════════════════════════════════════"
echo "  Backup Summary"
echo "═══════════════════════════════════════════════════════════════"
echo "  Latest:        ${BACKUP_FILENAME}"
echo "  Size:          ${BACKUP_SIZE:-unknown}"
echo "  Total Backups: ${TOTAL_BACKUPS}"
echo "  Total Size:    ${TOTAL_SIZE:-unknown}"
echo "  S3 Upload:     ${BACKUP_S3_BUCKET:-disabled}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "[$(date -Iseconds)] 🎉 Backup completed successfully."

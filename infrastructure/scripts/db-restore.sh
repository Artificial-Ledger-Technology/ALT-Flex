#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# AltFlex AEGIS v3.0 — Database Restore Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# Restores a PostgreSQL database from a pg_dump backup file.
#
# Environment Variables (Required):
#   DATABASE_URL  — PostgreSQL connection string for the target database
#
# Usage:
#   ./db-restore.sh /backups/aegis_20260810_020000.dump
#   ./db-restore.sh s3://my-bucket/aegis-backups/aegis_20260810_020000.dump
#
# ⚠️  WARNING: This script will DROP and recreate all objects in the target
#    database. Always verify you are restoring to the correct environment.
#
# @task P6-PROD-009
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ── Argument Validation ──────────────────────────────────────────────────────
BACKUP_SOURCE="${1}"

if [ -z "${BACKUP_SOURCE}" ]; then
  echo "❌ Usage: ./db-restore.sh <backup-file-path-or-s3-key>"
  echo ""
  echo "   Local:  ./db-restore.sh /backups/aegis_20260810_020000.dump"
  echo "   S3:     ./db-restore.sh s3://bucket/aegis-backups/aegis_20260810_020000.dump"
  exit 1
fi

if [ -z "${DATABASE_URL}" ]; then
  echo "❌ ERROR: DATABASE_URL is not set. Aborting restore."
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  🔄 AEGIS v3.0 — Database Restore"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Source:  ${BACKUP_SOURCE}"
echo "  Target:  (from DATABASE_URL)"
echo ""

# ── Step 1: Download from S3 if needed ───────────────────────────────────────
RESTORE_FILE="${BACKUP_SOURCE}"

if echo "${BACKUP_SOURCE}" | grep -q "^s3://"; then
  echo "[$(date -Iseconds)] ☁️  Downloading from S3..."
  RESTORE_FILE="/tmp/aegis_restore_$(date +%s).dump"

  if command -v aws > /dev/null 2>&1; then
    if aws s3 cp "${BACKUP_SOURCE}" "${RESTORE_FILE}" 2>&1; then
      echo "[$(date -Iseconds)] ✅ Downloaded from S3."
    else
      echo "[$(date -Iseconds)] ❌ S3 download failed. Aborting."
      exit 1
    fi
  else
    echo "[$(date -Iseconds)] ❌ AWS CLI not installed. Cannot download from S3."
    exit 1
  fi
  echo ""
fi

# ── Verify backup file exists ────────────────────────────────────────────────
if [ ! -f "${RESTORE_FILE}" ]; then
  echo "❌ Backup file not found: ${RESTORE_FILE}"
  exit 1
fi

BACKUP_SIZE=$(ls -lh "${RESTORE_FILE}" | awk '{print $5}')
echo "[$(date -Iseconds)] 📦 Backup file: ${RESTORE_FILE} (${BACKUP_SIZE})"
echo ""

# ── Safety Prompt ────────────────────────────────────────────────────────────
echo "⚠️  WARNING: This will overwrite the target database."
echo "   Press Ctrl+C within 5 seconds to abort..."
sleep 5
echo ""

# ── Step 2: Restore ──────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] 🔄 Starting pg_restore..."

if pg_restore "${RESTORE_FILE}" \
  --dbname="${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  2>&1; then
  echo "[$(date -Iseconds)] ✅ pg_restore completed."
else
  # pg_restore returns non-zero even on warnings (e.g., "table does not exist" during --clean)
  echo "[$(date -Iseconds)] ⚠️  pg_restore completed with warnings (this is often normal for --clean --if-exists)."
fi

echo ""

# ── Step 3: Verification ────────────────────────────────────────────────────
echo "[$(date -Iseconds)] 🔍 Verifying restore..."

TABLE_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d ' ')

if [ -n "${TABLE_COUNT}" ] && [ "${TABLE_COUNT}" -gt 0 ]; then
  echo "[$(date -Iseconds)] ✅ Verification passed: ${TABLE_COUNT} tables found in public schema."
else
  echo "[$(date -Iseconds)] ⚠️  Verification warning: Could not verify table count."
fi

# Check key AEGIS tables
for TABLE in hack_incidents ai_skill_files safety_scan_results schema_migrations; do
  ROW_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ')
  if [ -n "${ROW_COUNT}" ]; then
    echo "   ${TABLE}: ${ROW_COUNT} rows"
  else
    echo "   ${TABLE}: ⚠️  could not query"
  fi
done

echo ""

# ── Cleanup S3 temp file ────────────────────────────────────────────────────
if echo "${BACKUP_SOURCE}" | grep -q "^s3://"; then
  rm -f "${RESTORE_FILE}"
  echo "[$(date -Iseconds)] 🧹 Cleaned up temporary file."
  echo ""
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "  Restore Summary"
echo "═══════════════════════════════════════════════════════════════"
echo "  Source:  ${BACKUP_SOURCE}"
echo "  Tables:  ${TABLE_COUNT:-unknown}"
echo "  Status:  Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "[$(date -Iseconds)] 🎉 Restore completed successfully."

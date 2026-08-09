#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# AltFlex AEGIS v3.0 — Docker Entrypoint for API Gateway
# ═══════════════════════════════════════════════════════════════════════════════
#
# Production entrypoint that runs database migrations before starting the API.
# Ensures the database schema is always up-to-date on container start.
#
# Environment Variables:
#   SKIP_MIGRATIONS  — Set to "true" to skip migration on start (scaling events)
#   RUN_SEED         — Set to "true" to run seed script after migrations
#   DATABASE_URL     — PostgreSQL connection string (required)
#
# Exit Behavior:
#   If migrations fail, the container exits with code 1 and does NOT start
#   the API server. This prevents unhealthy containers from accepting traffic.
#
# @task P6-PROD-009
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  🛡️  AEGIS v3.0 — API Gateway Entrypoint"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Database Migrations ──────────────────────────────────────────────
if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "⏭️  SKIP_MIGRATIONS=true — Skipping database migrations."
  echo ""
else
  echo "📦 Running database migrations..."
  echo ""

  # Run the compiled migration runner from @aegis/core.
  # Uses the migration SQL files copied into the image at /app/migrations/.
  # The MIGRATIONS_DIR env var is set in the Dockerfile to point at /app/migrations.
  if node /app/node_modules/@aegis/core/dist/database/migrate.js; then
    echo ""
    echo "✅ Migrations completed successfully."
  else
    echo ""
    echo "❌ Migration failed — aborting container startup."
    echo "   Fix the migration issue and redeploy."
    exit 1
  fi
  echo ""
fi

# ── Step 2: Database Seeding (Optional) ──────────────────────────────────────
if [ "${RUN_SEED}" = "true" ]; then
  echo "🌱 RUN_SEED=true — Running database seed script..."
  echo ""

  if node /app/node_modules/@aegis/core/dist/database/seed.js; then
    echo ""
    echo "✅ Seeding completed successfully."
  else
    echo ""
    echo "⚠️  Seeding failed — continuing with server startup."
    echo "   Seeding failures are non-fatal; the API can still serve requests."
  fi
  echo ""
fi

# ── Step 3: Start the API Server ─────────────────────────────────────────────
echo "🚀 Starting API Gateway server..."
echo ""

exec node dist/server.js

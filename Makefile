# ═══════════════════════════════════════════════════════════════════════════════
# AltFlex AEGIS v3.0 — Makefile
# Convenience targets for Docker Compose orchestration
# ═══════════════════════════════════════════════════════════════════════════════
# Usage:
#   make dev     — Boot entire dev platform with hot-reload
#   make prod    — Boot entire production platform
#   make down    — Stop all services
#   make clean   — Stop + remove all volumes (DESTRUCTIVE)
#   make logs    — Tail dev logs
#   make health  — Check service health endpoints
# ═══════════════════════════════════════════════════════════════════════════════

.PHONY: dev prod down down-dev down-prod clean logs logs-prod health ps build-dev build-prod

# ── Development ────────────────────────────────────────────────────────────
# Boots entire platform with hot-reload via mounted volumes
dev:
	docker compose -f docker-compose.dev.yml up --build -d
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  🚀 AEGIS v3.0 — Development Environment Running"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Web Dashboard:   http://localhost:3000"
	@echo "  API Gateway:     http://localhost:4000"
	@echo "  API Health:      http://localhost:4000/api/v1/health"
	@echo "  Grafana:         http://localhost:3001"
	@echo "  Prometheus:      http://localhost:9090"
	@echo "  PostgreSQL:      localhost:5432  (aegis/changeme)"
	@echo "  Redis:           localhost:6379"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Hot-reload is ENABLED — edit source, see changes live"
	@echo "  Logs: make logs"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""

# ── Production ─────────────────────────────────────────────────────────────
# Boots entire platform with health checks, restart policies, resource limits
prod:
	docker compose -f docker-compose.prod.yml up --build -d
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  🛡️  AEGIS v3.0 — Production Environment Running"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Web Dashboard:   http://localhost:3000"
	@echo "  API Gateway:     http://localhost:4000"
	@echo "  API Health:      http://localhost:4000/api/v1/health"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Restart policy:  unless-stopped"
	@echo "  Health checks:   ENABLED on all services"
	@echo "  Logs: make logs-prod"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""

# ── Build Only (no start) ─────────────────────────────────────────────────
build-dev:
	docker compose -f docker-compose.dev.yml build
	@echo "✅ Dev images built successfully"

build-prod:
	docker compose -f docker-compose.prod.yml build
	@echo "✅ Production images built successfully"

# ── Stop Services ──────────────────────────────────────────────────────────
down:
	-docker compose -f docker-compose.dev.yml down
	-docker compose -f docker-compose.prod.yml down
	@echo "⏹️  All AEGIS services stopped"

down-dev:
	docker compose -f docker-compose.dev.yml down
	@echo "⏹️  Dev services stopped"

down-prod:
	docker compose -f docker-compose.prod.yml down
	@echo "⏹️  Production services stopped"

# ── Clean (DESTRUCTIVE — removes volumes) ─────────────────────────────────
clean:
	-docker compose -f docker-compose.dev.yml down -v --remove-orphans
	-docker compose -f docker-compose.prod.yml down -v --remove-orphans
	@echo ""
	@echo "🧹 All AEGIS services stopped and volumes removed"
	@echo "⚠️  Database and Redis data have been DELETED"
	@echo ""

# ── Logs ───────────────────────────────────────────────────────────────────
logs:
	docker compose -f docker-compose.dev.yml logs -f

logs-prod:
	docker compose -f docker-compose.prod.yml logs -f

# ── Service Status ─────────────────────────────────────────────────────────
ps:
	@echo "── Development Services ──"
	-docker compose -f docker-compose.dev.yml ps
	@echo ""
	@echo "── Production Services ──"
	-docker compose -f docker-compose.prod.yml ps

# ── Health Checks ──────────────────────────────────────────────────────────
health:
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  🏥 AEGIS v3.0 — Service Health Check"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "API Gateway (http://localhost:4000/api/v1/health):"
	@curl -sf http://localhost:4000/api/v1/health 2>/dev/null && echo " ✅ HEALTHY" || echo " ❌ DOWN or UNREACHABLE"
	@echo ""
	@echo "Web Frontend (http://localhost:3000):"
	@curl -sf http://localhost:3000 > /dev/null 2>&1 && echo " ✅ HEALTHY" || echo " ❌ DOWN or UNREACHABLE"
	@echo ""
	@echo "PostgreSQL (localhost:5432):"
	@docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U aegis -d aegis_dev 2>/dev/null && echo " ✅ HEALTHY" || echo " ❌ DOWN or UNREACHABLE"
	@echo ""
	@echo "Redis (localhost:6379):"
	@docker compose -f docker-compose.dev.yml exec -T redis redis-cli ping 2>/dev/null && echo " ✅ HEALTHY" || echo " ❌ DOWN or UNREACHABLE"
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""

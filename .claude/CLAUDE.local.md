# Local Claude Configuration — Developer Overrides

## Local Environment

- **OS**: Windows 11
- **Shell**: PowerShell (pwsh)
- **Node**: v20.11+ (via nvm-windows)
- **Package Manager**: pnpm 10.x
- **IDE**: VS Code / Cursor
- **Docker**: Docker Desktop for Windows (WSL2 backend)

## Windows-Specific Notes

- Add `shamefully-hoist=true` to `.npmrc` for pnpm + Next.js symlink resolution
- Use forward slashes `/` in config paths, not backslashes `\`
- Foundry must be installed via WSL or Git Bash: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

## Developer Preferences

- Prefer verbose output in dev mode (`LOG_LEVEL=debug`)
- Run `docker compose -f docker-compose.dev.yml up -d` before `pnpm dev`
- API Gateway on port 4000, Next.js on port 3000
- PostgreSQL on port 5432, Redis on port 6379

## Local Secrets

> ⚠️ This file is gitignored. Never commit real API keys or secrets.

Reference `.env.example` for all required environment variables. Copy to `.env` and fill in real values.

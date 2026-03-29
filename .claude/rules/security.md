# Security — Mandatory Rules

## General Security Principles

1. **Defense in Depth** — Multiple layers of security, never rely on a single control
2. **Least Privilege** — Services and users get minimum required permissions
3. **Zero Trust** — Validate every request, even from internal services
4. **Fail Secure** — Errors default to denying access, not granting it

## Secrets Management

### NEVER Commit Secrets

- API keys, database passwords, JWT secrets, RPC endpoints with API keys → `.env` only
- `.env` is in `.gitignore` — verified by pre-commit hook
- `.env.example` contains placeholder values only
- GitHub Secret Scanning is enabled on the repository

### Secret Rotation

- JWT secrets: Rotate every 90 days minimum
- API keys: Rotate on team member departure
- Database passwords: Rotate on production deployment

### Environment Validation

All secrets are validated on startup via Zod schemas:

```typescript
const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  POSTGRES_PASSWORD: z.string().min(8),
  // ... all required vars
});
```

## Authentication & Authorization

### JWT Standards

- Algorithm: `HS256` (symmetric) for internal services
- Minimum secret length: 32 characters
- Token expiry: 7 days (configurable via `JWT_EXPIRES_IN`)
- Refresh token rotation pattern for long sessions
- Never store JWTs in `localStorage` — use httpOnly cookies

### API Key Authentication

- Service-to-service auth uses API keys in `Authorization: Bearer <key>` header
- API keys are comma-separated in `API_KEYS` env var
- Rate limiting applies per API key

## Input Validation

### All External Input is Untrusted

- Validate ALL request bodies with Zod schemas before processing
- Sanitize user input — no raw SQL interpolation
- Validate and whitelist query parameters
- Validate path parameters (UUID format, allowed values)
- Set maximum request body size (1MB default)

### SQL Injection Prevention

- Use parameterized queries — NEVER string interpolation in SQL
- Use Zod to validate query parameters before they reach the database

```typescript
// ❌ WRONG
const query = `SELECT * FROM hacks WHERE chain = '${chain}'`;

// ✅ CORRECT
const query = 'SELECT * FROM hacks WHERE chain = $1';
const result = await pool.query(query, [chain]);
```

## Network Security

### CORS

- Explicit origin whitelist — never `*` in production
- `CORS_ORIGIN` env var: `http://localhost:3000` (dev), `https://aegis.app` (prod)

### Rate Limiting

- Default: 100 requests per minute per IP
- Configurable via `API_RATE_LIMIT_MAX` and `API_RATE_LIMIT_WINDOW_MS`
- Return `429 Too Many Requests` with `Retry-After` header

### HTTPS

- TLS required in production — no HTTP
- HSTS headers enabled
- Secure cookie flags: `httpOnly`, `secure`, `sameSite: strict`

## Blockchain-Specific Security

### RPC Endpoint Protection

- Never expose RPC endpoints with API keys to the frontend
- All blockchain calls go through the API Gateway
- Rate limit RPC calls to avoid provider throttling
- Use multiple RPC providers for redundancy

### Transaction Safety

- Display transaction details before signing
- Validate contract addresses against known registries
- Check for suspicious transaction patterns (unusual gas, value)

### Smart Contract Interaction

- Validate ABI encoding before contract calls
- Use viem's type-safe contract interaction patterns
- Never trust user-supplied contract addresses without verification

## Dependency Security

### Supply Chain

- Run `pnpm audit` in CI — block on critical/high vulnerabilities
- Pin exact versions for security-sensitive packages
- Review dependency update PRs carefully
- Use `pnpm` strict mode — no phantom dependencies

### Docker Security

- Use multi-stage builds — no dev dependencies in production images
- Run containers as non-root user
- Scan images with Trivy in CI
- Pin base image versions (e.g., `node:20.11-alpine`)

## Incident Response

If a security vulnerability is discovered:

1. **Do NOT** disclose publicly until patched
2. Document the finding with severity assessment
3. Create a `fix/security-*` branch
4. Apply fix, audit, and test
5. Deploy with expedited review process
6. Post-mortem with root cause analysis

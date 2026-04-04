# Git Workflow — Mandatory Rules

## Branch Strategy

| Branch Pattern                   | Purpose                                      | Merges Into          |
| -------------------------------- | -------------------------------------------- | -------------------- |
| `main`                           | Protected — production releases only         | —                    |
| `develop`                        | Integration branch — all features merge here | `main` (via release) |
| `feature/P{phase}-{task}-{slug}` | Feature work                                 | `develop`            |
| `fix/P{phase}-{slug}`            | Bug fixes                                    | `develop`            |
| `chore/{slug}`                   | Tooling, deps, CI                            | `develop`            |
| `docs/{slug}`                    | Documentation only                           | `develop`            |
| `thesis/{1\|2}/{slug}`           | Academic deliverables                        | `develop`            |

### Branch Examples

```
feature/P1-ARCH-001-hex-diagrams
feature/P2-ETL-003-defillama-adapter
fix/P0-husky-hooks
chore/upgrade-typescript-5.5
docs/api-specification
thesis/1/safety-scanner-ast-parser
```

## Commit Convention (Conventional Commits)

### Format

```
type(scope): short imperative description

[optional body — explain WHY, not WHAT]

[optional footer — breaking changes, issue refs]
```

### Valid Types

| Type       | Usage                                    |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `style`    | Formatting, whitespace (no logic change) |
| `refactor` | Code change — no new feature, no bug fix |
| `perf`     | Performance improvement                  |
| `test`     | Adding or correcting tests               |
| `build`    | Build system or external deps            |
| `ci`       | CI/CD pipeline changes                   |
| `chore`    | Maintenance tasks                        |
| `revert`   | Reverts a previous commit                |

### Valid Scopes

```
core | hacks-engine | skills-engine | forensic-engine |
web | api-gateway | infra | docker | deps | ci | docs |
phase-0 | phase-1 | phase-2 | phase-3 | phase-4 | phase-5 | phase-6
```

### Examples

```
feat(hacks-engine): add DefiLlama adapter with pagination
fix(core): resolve HackIncident schema strict validation
chore(infra): add healthcheck to postgres docker service
docs(phase-0): finalize initialization guide
test(forensic-engine): add Foundry trace parser unit tests
refactor(api-gateway): consolidate middleware chain
perf(skills-engine): batch GitHub API calls with Promise.allSettled
```

### Enforced By

- **Husky** `commit-msg` hook validates format
- **commitlint** with `@commitlint/config-conventional`
- Subject max length: 100 characters
- Body max line length: 200 characters (warning)
- Type must be lowercase
- Subject must not be empty

## Pull Request Rules

1. **Target branch**: Always `develop` — never `main` directly
2. **Minimum 1 approval** from a team member
3. **CI must pass**: lint → typecheck → test → build
4. **PR title format**: `[P{phase}] Short description of change`
5. **Linked task**: Reference `P{phase}-INIT-{NNN}` task ID in PR body
6. **No secrets** in any commit — enforced by pre-commit hook + GitHub secret scanning
7. **PR size limit**: Prefer < 400 lines of changes; split larger PRs

## Local Workflow

```bash
# 1. Sync with upstream
git checkout develop && git pull origin develop

# 2. Create feature branch
git checkout -b feature/P1-ARCH-001-hex-diagrams

# 3. Make changes, then stage
git add .

# 4. Husky runs lint-staged automatically on commit
git commit -m "feat(core): add IChainDataPort hexagonal interface"

# 5. Push and open PR against develop
git push origin feature/P1-ARCH-001-hex-diagrams
```

## Protected Branches

### `main`

- Requires PR with 1+ approval
- Requires all CI checks to pass
- No direct pushes
- Only merge from `develop` via release process
- Tagged with semantic version: `v3.0.x`

### `develop`

- Requires PR with 1+ approval
- Requires lint + typecheck + test to pass
- No direct pushes

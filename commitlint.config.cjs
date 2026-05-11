/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // ── Allowed Commit Types ─────────────────────────────────────────
    // Governed by: Senior Git Operations Engineer
    // Ref: .claude/skills/flexycode/senior-git-operations-engineer/SKILL.md
    'type-enum': [
      2,
      'always',
      [
        // Standard Conventional Commits
        'feat',     // ✨ New feature
        'fix',      // 🐛 Bug fix
        'docs',     // 📝 Documentation only
        'style',    // 🎨 Formatting, design tokens, CSS
        'refactor', // ♻️ Code change that neither fixes a bug nor adds a feature
        'perf',     // ⚡ Performance improvement
        'test',     // 🧪 Adding or correcting tests
        'build',    // Build system or external dependencies
        'ci',       // 🚀 CI/CD configuration
        'chore',    // 🏗️ Maintenance tasks
        'revert',   // Reverts a previous commit

        // Extended AEGIS Types (icon-prefixed convention)
        'config',     // 🔧 Configuration files (tsconfig, eslint, env)
        'deps',       // 📦 Dependency installation or updates
        'security',   // 🔒 Security improvements, env vars, auth
        'deploy',     // 🚀 Deployment, CI/CD pipeline changes
        'schema',     // 🗃️ Database schema, migrations
        'web',        // 🌐 Web portal-specific code (Next.js)
        'cleanup',    // 🧹 Dead code removal, file organization
        'types',      // 🏷️ TypeScript type definitions, interfaces
        'core',       // 🎯 Core domain logic, business rules
        'ai',         // 🤖 ML/AI related code, safety scanning
        'validation', // 🛡️ Zod schemas, input validation
        'data',       // 💾 Seed data, fixtures, mock data
        'assets',     // 🖼️ Images, icons, fonts, static files
        'hooks',      // 🪝 Git hooks, Husky, pre-commit
        'lint',       // 📐 Linting rules, Prettier config
        'docker',     // 🐳 Docker, containers, compose files
        'env',        // 🔑 Environment variables, secrets config
        'agent',      // 🧠 AI agent skill files, prompts
        'plan',       // 📋 Planning documents, phase reviews
        'academic',   // 🎓 Academic deliverables, thesis content
        'blockchain', // ⛓️ Smart contract, EVM, Foundry code
        'forensic',   // 🔬 Forensic engine, trace analysis
      ],
    ],

    // ── Allowed Scopes (matches AEGIS workspace packages) ────────────
    'scope-enum': [
      2,
      'always',
      [
        // Packages
        'core',
        'hacks-engine',
        'skills-engine',
        'forensic-engine',

        // Apps
        'web',
        'api-gateway',

        // Infrastructure & Meta
        'infra',
        'docker',
        'deps',
        'ci',
        'docs',
        'agents',   // .claude/skills/, .gemini/
        'root',     // Root config files

        // Phase tracking (academic alignment)
        'phase-0',
        'phase-1',
        'phase-2',
        'phase-3',
        'phase-4',
        'phase-5',
        'phase-6',
      ],
    ],
    'scope-empty': [1, 'never'], // Warn if scope is missing (encourage but don't block)

    // ── Message Formatting ───────────────────────────────────────────
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 100],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'body-max-line-length': [1, 'always', 200],
  },
};

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // ── Allowed Commit Types ─────────────────────────────────────────
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, missing semicolons, etc.
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding or correcting tests
        'build',    // Build system or external dependencies
        'ci',       // CI/CD configuration
        'chore',    // Maintenance tasks
        'revert',   // Reverts a previous commit
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

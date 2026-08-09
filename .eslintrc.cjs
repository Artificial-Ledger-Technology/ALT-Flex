/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // tsconfig.base.json is a base to extend, not a project: it declares no
    // `include`, so listing it here swept every file in the repository into a
    // program with no `jsx` and no path aliases (#198). Each package config
    // covers its own sources; tsconfig.eslint.json covers the remainder.
    project: [
      './packages/*/tsconfig.json',
      './apps/*/tsconfig.json',
      './tsconfig.eslint.json',
    ],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'prettier', // Must be last — disables ESLint rules that conflict with Prettier
  ],
  rules: {
    // ── TypeScript Strict Rules ──────────────────────────────────────
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/require-await': 'error',

    // ── General Best Practices ───────────────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      // Test files work with raw JSON responses, mock return values and
      // deliberately untyped fixtures, so the type-aware `no-unsafe-*` family
      // fires constantly on code that is doing the right thing. Before this
      // block those five rules plus no-explicit-any produced 324 of the 358
      // errors across the test suite, which blocked the pre-commit hook for
      // anyone editing a test file (#203).
      //
      // They are warnings here, not disabled: the signal stays visible and
      // can be ratcheted back to errors per package as call sites are typed.
      //
      // Every other rule keeps full strength in tests. That is deliberate —
      // no-unused-vars is what flagged the unused requireApiKey import behind
      // the #201 auth bypass, and unbound-method, no-duplicate-imports and
      // eqeqeq all catch real defects in test code.
      // Anchored to mirror tsconfig.eslint.json's `include`, so the two configs
      // describe the same set of files. An unanchored '**/tests/**' would also
      // hand the relaxation to any future package that puts a tests directory
      // inside src/.
      files: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'apps/*/tests/**/*.ts',
        'packages/*/tests/**/*.ts',
        'packages/*/src/**/__tests__/**/*.ts',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        // Fires on `expect(mock.method).toHaveBeenCalled()`, which never binds
        // `this` — the reference is handed to expect, not invoked. There is no
        // clean source-level fix: vi.mocked() does not silence it either, so
        // the alternatives are inline disables or restructuring correct tests.
        // typescript-eslint's answer for test files is the jest/vitest variant
        // of this rule; until one is wired up it is a warning here.
        '@typescript-eslint/unbound-method': 'warn',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.next/',
    'out/',
    'coverage/',
    '*.js',
    '*.cjs',
    '*.mjs',
    '*.d.ts',
  ],
};

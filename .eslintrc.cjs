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

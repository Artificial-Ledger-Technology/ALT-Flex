/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.base.json',
      './packages/*/tsconfig.json',
      './apps/*/tsconfig.json',
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

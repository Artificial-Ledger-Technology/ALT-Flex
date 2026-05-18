/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Vitest Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Configures Vitest for the API Gateway ESM test environment.
 *
 * Key concerns:
 *  1. fastify-plugin is CJS-only ("type": "commonjs") — must be inlined
 *  2. @aegis/core is a workspace package whose named exports are mangled by
 *     Vitest's SSR transform — must be inlined to resolve correctly
 *
 * @see https://vitest.dev/config/#deps-optimizer-ssr-include
 * @task P1-ARCH-011 Code Review Remediation
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Exclude the scratch debug file (empty, kept for local debugging use)
    exclude: ['tests/_debug.test.ts', '**/node_modules/**'],
    deps: {
      optimizer: {
        ssr: {
          /**
           * Include packages whose named exports are mangled by Vitest's SSR
           * transform. Both fastify-plugin (CJS-only) and @aegis/core
           * (workspace package with conditional exports) must be listed here.
           */
          include: ['fastify-plugin', '@aegis/core'],
        },
      },
    },
  },
});

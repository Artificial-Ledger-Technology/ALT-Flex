/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Vitest Configuration (Hacks Engine)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Configures Vitest for the Hacks Engine ESM test environment.
 *
 * @aegis/core is a workspace package whose named exports must be inlined
 * to resolve correctly in Vitest's SSR transform.
 *
 * @see https://vitest.dev/config/#deps-optimizer-ssr-include
 * @task P2-ETL-001
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    deps: {
      optimizer: {
        ssr: {
          include: ['@aegis/core'],
        },
      },
    },
  },
});

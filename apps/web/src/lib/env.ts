/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Frontend Environment Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Client-safe environment validation for Next.js 15.
 * Only NEXT_PUBLIC_* variables are accessible on the client side.
 *
 * @module apps/web/lib/env
 */

import { z } from 'zod';

/**
 * Client-safe environment schema.
 * Only includes NEXT_PUBLIC_* variables exposed to the browser.
 *
 * IMPORTANT: Never include server-side secrets (DB passwords, JWT secrets, etc.)
 * in this schema — they would be bundled into the client JavaScript.
 */
const ClientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default('http://localhost:4000')
    .describe('API base URL'),
  NEXT_PUBLIC_APP_NAME: z
    .string()
    .default('AltFlex AEGIS')
    .describe('Application display name'),
  NEXT_PUBLIC_APP_VERSION: z
    .string()
    .default('3.0.0')
    .describe('Application version'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true')
    .describe('Enable analytics tracking'),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

/**
 * Validated client environment configuration.
 *
 * Uses process.env which Next.js statically replaces NEXT_PUBLIC_*
 * variables at build time for the client bundle.
 */
function getClientEnv(): ClientEnv {
  const result = ClientEnvSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
    NEXT_PUBLIC_APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'],
    NEXT_PUBLIC_APP_VERSION: process.env['NEXT_PUBLIC_APP_VERSION'],
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env['NEXT_PUBLIC_ENABLE_ANALYTICS'],
  });

  if (!result.success) {
    console.error('❌ Invalid client environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Invalid client environment configuration');
  }

  return result.data;
}

/**
 * Singleton client environment config.
 *
 * @example
 * ```tsx
 * import { clientEnv } from '@/lib/env';
 *
 * export function ApiStatus() {
 *   return <span>Connecting to {clientEnv.NEXT_PUBLIC_API_URL}</span>;
 * }
 * ```
 */
export const clientEnv = getClientEnv();

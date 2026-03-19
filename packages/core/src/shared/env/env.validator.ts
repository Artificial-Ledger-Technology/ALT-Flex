/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Environment Validator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides a robust `validateEnv()` function that validates environment
 * variables against a Zod schema and prints a structured error table
 * when validation fails, then exits the process to prevent boot with
 * invalid configuration.
 *
 * @module @aegis/core/shared/env
 * @hexagonal Infrastructure Layer — Configuration Port
 */

import { z } from 'zod';

/**
 * Validates environment variables against a Zod schema.
 *
 * On success, returns a frozen, typed configuration object.
 * On failure, prints a detailed error table and terminates the process.
 *
 * @param schema - Zod schema to validate against
 * @param env - Environment object (defaults to `process.env`)
 * @returns Validated and frozen configuration object
 *
 * @example
 * ```typescript
 * import { validateEnv } from '@aegis/core';
 * import { GatewayEnvSchema } from '@aegis/core';
 *
 * const env = validateEnv(GatewayEnvSchema);
 * // env is fully typed: env.API_PORT, env.POSTGRES_HOST, etc.
 * ```
 */
export function validateEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(env);

  if (!result.success) {
    printValidationErrors(result.error);
    process.exit(1);
  }

  // Freeze to prevent runtime mutation of validated config
  return Object.freeze(result.data) as z.infer<z.ZodObject<T>>;
}

/**
 * Validates environment variables without terminating on failure.
 * Useful for testing and conditional validation scenarios.
 *
 * @param schema - Zod schema to validate against
 * @param env - Environment object
 * @returns Object with `success`, `data`, and `errors` fields
 */
export function validateEnvSafe<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): {
  success: boolean;
  data: z.infer<z.ZodObject<T>> | null;
  errors: string[];
} {
  const result = schema.safeParse(env);

  if (result.success) {
    return {
      success: true,
      data: Object.freeze(result.data) as z.infer<z.ZodObject<T>>,
      errors: [],
    };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );

  return { success: false, data: null, errors };
}

/**
 * Prints a formatted error table to stderr when env validation fails.
 */
function printValidationErrors(error: z.ZodError): void {
  const separator = '═'.repeat(72);
  const thinSeparator = '─'.repeat(72);

  console.error('');
  console.error(`  ${separator}`);
  console.error('  ❌ AltFlex AEGIS — Environment Validation Failed');
  console.error(`  ${separator}`);
  console.error('');
  console.error('  The following environment variables are missing or invalid:');
  console.error('');
  console.error(`  ${'Variable'.padEnd(35)} ${'Issue'.padEnd(35)}`);
  console.error(`  ${thinSeparator}`);

  for (const issue of error.issues) {
    const varName = issue.path.join('.') || 'unknown';
    const message = issue.message;
    console.error(`  ${varName.padEnd(35)} ${message}`);
  }

  console.error('');
  console.error('  💡 Fix: Copy .env.example → .env and fill in the required values.');
  console.error('          cp .env.example .env');
  console.error('');
  console.error(`  ${separator}`);
  console.error('');
}

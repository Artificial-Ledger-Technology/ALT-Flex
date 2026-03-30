import { describe, it, expect } from 'vitest';

/**
 * Phase 0 — Smoke Test
 * Validates that the test infrastructure boots correctly.
 * Real domain model tests will be added in Phase 1.
 */
describe('@aegis/core smoke test', () => {
  it('should load domain entities barrel export', async () => {
    const core = await import('../src/index.js');
    expect(core).toBeDefined();
  });

  it('should validate a basic AttackVector enum value', async () => {
    const { AttackVectorSchema } = await import('../src/domain/value-objects/AttackVector.js');
    const result = AttackVectorSchema.safeParse('reentrancy');
    expect(result.success).toBe(true);
  });

  it('should reject an invalid AttackVector', async () => {
    const { AttackVectorSchema } = await import('../src/domain/value-objects/AttackVector.js');
    const result = AttackVectorSchema.safeParse('not-a-real-vector');
    expect(result.success).toBe(false);
  });
});

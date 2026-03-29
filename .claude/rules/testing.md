# Testing Standards — Mandatory Rules

## Testing Framework

- **Vitest** for all unit and integration tests
- **Supertest** for API endpoint testing
- **Testing Library** for React component tests
- **Playwright** for E2E tests (Phase 4+)

## Test Pyramid

```
         ╱╲
        ╱ E2E ╲        ← Few: Critical user flows only
       ╱────────╲
      ╱Integration╲    ← Moderate: API endpoints, DB queries
     ╱──────────────╲
    ╱   Unit Tests    ╲  ← Many: Domain logic, use cases, utilities
   ╱────────────────────╲
```

## Coverage Requirements

| Package                  | Line Coverage | Branch Coverage | Function Coverage |
| ------------------------ | ------------- | --------------- | ----------------- |
| `@aegis/core`            | ≥ 95%         | ≥ 90%           | ≥ 95%             |
| `@aegis/hacks-engine`    | ≥ 90%         | ≥ 85%           | ≥ 90%             |
| `@aegis/skills-engine`   | ≥ 90%         | ≥ 85%           | ≥ 90%             |
| `@aegis/forensic-engine` | ≥ 85%         | ≥ 80%           | ≥ 85%             |
| `@aegis/api-gateway`     | ≥ 85%         | ≥ 80%           | ≥ 85%             |
| `@aegis/web`             | ≥ 80%         | ≥ 75%           | ≥ 80%             |

## File Naming & Location

```
src/
├── application/
│   ├── sync-hacks.ts
│   └── __tests__/
│       ├── sync-hacks.test.ts         ← Unit test
│       └── sync-hacks.integration.ts  ← Integration test
├── adapters/
│   ├── defillama/
│   │   ├── defillama-client.ts
│   │   └── __tests__/
│   │       └── defillama-client.test.ts
```

- Test files: `*.test.ts` (unit) or `*.integration.ts` (integration)
- Co-located with source in `__tests__/` directory
- Test file name mirrors source file name

## Test Structure (AAA Pattern)

```typescript
describe('SyncHacksUseCase', () => {
  // Shared setup
  let useCase: SyncHacksUseCase;
  let mockHackDataPort: MockHackDataPort;

  beforeEach(() => {
    mockHackDataPort = new MockHackDataPort();
    useCase = new SyncHacksUseCase(mockHackDataPort);
  });

  describe('execute', () => {
    it('should sync hack incidents from DefiLlama', async () => {
      // Arrange
      const mockIncidents = [createMockHackIncident()];
      mockHackDataPort.setData(mockIncidents);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.synced).toBe(1);
      expect(mockHackDataPort.upsertCalls).toBe(1);
    });

    it('should throw ETLSyncError on API failure', async () => {
      // Arrange
      mockHackDataPort.setError(new Error('API timeout'));

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(ETLSyncError);
    });
  });
});
```

## Testing Rules

### Unit Tests

1. Test domain logic in isolation — mock all ports
2. Use in-memory port implementations for hexagonal testing
3. Test all edge cases: null, undefined, empty, boundary values
4. Test error paths — not just happy paths
5. Use `describe` blocks to group related tests
6. Use clear, descriptive test names: `should [behavior] when [condition]`

### Integration Tests

1. Test adapter implementations against real services (test containers)
2. Test API routes end-to-end with Supertest
3. Test database operations against a test PostgreSQL instance
4. Use test fixtures and factories for consistent data
5. Clean up test data after each test run

### What NOT to Test

- Don't test framework internals (Fastify routing, Next.js rendering)
- Don't test third-party library functions
- Don't test trivial getters/setters
- Don't write tests that test the test framework

## Test Data

### Factories

Create test data factories for each entity:

```typescript
// test-utils/factories.ts
export function createMockHackIncident(overrides?: Partial<HackIncident>): HackIncident {
  return {
    id: randomUUID(),
    protocolName: 'Test Protocol',
    date: new Date('2026-01-01'),
    chain: Chain.Ethereum,
    attackVector: AttackVector.FlashLoan,
    lossUsd: 1_000_000,
    txHashes: ['0xabc123'],
    hasFoundryPoc: false,
    dataSource: 'manual',
    ...overrides,
  };
}
```

### Fixtures

- Store static test data in `__fixtures__/` directories
- Use real DefiLlama API response snapshots for adapter tests
- Use real GitHub API response snapshots for skills engine tests

## Running Tests

```bash
# All tests
pnpm test

# Single package
pnpm --filter @aegis/core test

# Watch mode
pnpm --filter @aegis/core test -- --watch

# Coverage report
pnpm test:coverage

# Specific test file
pnpm --filter @aegis/hacks-engine test -- sync-hacks.test.ts
```

## CI Integration

Tests run in CI on every PR:

1. `pnpm lint` — Static analysis
2. `pnpm typecheck` — Type safety
3. `pnpm test` — All test suites
4. Coverage report uploaded as PR comment
5. Fail the build if coverage drops below thresholds

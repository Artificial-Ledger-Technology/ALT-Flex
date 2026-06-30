# Test Data Factory

Build factory functions for generating test data.

## Pattern
```typescript
function createUser(overrides = {}) {
  return {
    id: randomUUID(),
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides,
  };
}
```

## Guidelines
- Use realistic but fake data
- Allow overrides for specific tests
- Keep factories close to their tests
- Use deterministic IDs for snapshot tests

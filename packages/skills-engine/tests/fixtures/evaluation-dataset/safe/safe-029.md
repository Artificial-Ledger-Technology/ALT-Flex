# Mock Strategy Guide

Choose the right mocking strategy for each test scenario.

## Strategies
- Stub: return predetermined data
- Spy: track calls without changing behavior
- Mock: full replacement with expectations
- Fake: simplified working implementation

## When to Mock
- External services (APIs, databases)
- Time-dependent operations
- Random number generation
- File system operations in unit tests

## When NOT to Mock
- Pure functions
- Value objects
- The system under test

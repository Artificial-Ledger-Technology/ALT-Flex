# Database Query Review

Review SQL queries for correctness and performance.

## Guidelines
- Always use parameterized queries
- Add indexes for frequently queried columns
- Avoid SELECT * in production code
- Use EXPLAIN ANALYZE to check query plans
- Limit result sets with LIMIT/OFFSET

## Anti-Patterns
- String concatenation for queries
- Missing WHERE clauses on UPDATE/DELETE
- Cartesian joins without conditions

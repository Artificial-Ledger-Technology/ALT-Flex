# Performance Review Guide

Review code for performance anti-patterns.

## Common Issues
- N+1 query problems in ORM usage
- Missing database indexes
- Unbounded array operations
- Memory leaks from event listeners
- Synchronous file I/O in request handlers

## Recommendations
- Use pagination for large datasets
- Implement caching where appropriate
- Profile before optimizing
- Set timeouts on external calls

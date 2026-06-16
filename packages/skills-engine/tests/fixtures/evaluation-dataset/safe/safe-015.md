# Error Handling Review

Ensure robust error handling throughout the codebase.

## Patterns
- Use typed error classes
- Always catch at boundaries
- Log errors with context
- Return user-friendly messages
- Never swallow errors silently

## Anti-Patterns
- Empty catch blocks
- Catching generic Error without re-throwing
- Using errors for control flow
- Exposing stack traces to users

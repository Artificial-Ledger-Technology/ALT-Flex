# CI/CD Review Guide

Review CI/CD pipeline configurations for best practices.

## Checks
- All secrets use encrypted variables
- Build artifacts are cached
- Tests run before deployment
- Rollback procedure exists
- Notifications on failure

## Anti-Patterns
- Hardcoded credentials
- Skipping tests for speed
- Manual deployment steps
- No environment separation

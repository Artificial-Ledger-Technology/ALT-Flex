# TypeScript Strict Mode Guide

Enforce strict TypeScript settings for type safety.

## Recommended tsconfig
- strict: true
- noUncheckedIndexedAccess: true
- noImplicitReturns: true
- exactOptionalPropertyTypes: true

## Common Fixes
- Add explicit return types to functions
- Use nullish coalescing instead of OR
- Narrow types with type guards
- Avoid any, prefer unknown

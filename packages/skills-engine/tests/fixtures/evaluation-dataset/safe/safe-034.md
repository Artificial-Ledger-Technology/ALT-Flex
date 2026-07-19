# Mutation Testing Guide

Interpret mutation testing results to improve test quality.

## Mutation Types
- Arithmetic: replace + with -
- Conditional: change > to >=
- Return value: return opposite
- Method call: remove call

## Interpreting Results
- Killed: test caught the mutation (good)
- Survived: test missed the mutation (gap)
- Timeout: mutation caused infinite loop
- No coverage: mutated code not tested

## Action Items
- Focus on survived mutations
- Add assertions for edge cases
- Target: >80% kill rate

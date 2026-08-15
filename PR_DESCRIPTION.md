# Pull Request Description: P7-ML-005 Evaluation Framework Update

**Title**: feat(forensic-engine): update pattern evaluator to support ML model predictions (P7-ML-005)

## Description

This PR updates the existing evaluation framework (`pattern-evaluator.ts`, `evaluation-report.ts`) to support comparing ML model predictions (Thesis 2) against the baseline heuristic detectors (Thesis 1).

The new `evaluateComparative()` function runs the evaluation pipeline on both prediction sets simultaneously, computing the Delta metrics needed for Chapter 5 of the thesis. It also includes a new `generateComparativeEvaluationReport()` to output thesis-ready Markdown reports with side-by-side performance comparisons.

### Changes

- **`evaluator-types.ts`**: Added `ComparativeEvaluationReport` and `ModelComparison` interfaces.
- **`pattern-evaluator.ts`**: Implemented `evaluateComparative()` to compute head-to-head metrics and F1 deltas without altering the backward-compatible `evaluate()` function.
- **`evaluation-report.ts`**: Added `generateComparativeEvaluationReport()` which formats the comparative metrics into a side-by-side Markdown layout.
- **`pattern-evaluator.test.ts`**: Added comprehensive unit tests for both comparative functions, verifying proper Delta calculation and formatting.

## Type of change

- [x] New feature (non-breaking change which adds functionality)
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)

## Checklist:

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my own code
- [x] I have added tests that prove my feature works
- [x] New and existing unit tests pass locally with my changes

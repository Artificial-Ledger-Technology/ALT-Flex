# AEGIS Scanner Evaluation Report

**Date:** 2026-06-16T12:58:48.077Z
**Total Samples:** 100
**Total Scan Duration:** 5045ms

## Aggregate Metrics

| Metric | Value |
|---|---|
| Accuracy | **91.00%** |
| Macro Precision | **90.36%** |
| Macro Recall | **88.00%** |
| Macro F1 Score | **88.92%** |
| Micro Precision | **91.00%** |
| Micro Recall | **91.00%** |
| Micro F1 Score | **91.00%** |

## Per-Label Metrics

| Label | Precision | Recall | F1 Score | TP | FP | FN |
|---|---|---|---|---|---|---|
| **safe** | 92.59% | 100.00% | 96.15% | 50 | 4 | 0 |
| **suspicious** | 90.48% | 76.00% | 82.61% | 19 | 2 | 6 |
| **malicious** | 88.00% | 88.00% | 88.00% | 22 | 3 | 3 |

## Confusion Matrix

Rows: Actual (Ground Truth), Columns: Predicted

| Actual \ Predicted | SAFE | SUSPICIOUS | MALICIOUS |
|---|---|---|---|
| **safe** | 50 | 0 | 0 |
| **suspicious** | 3 | 19 | 3 |
| **malicious** | 1 | 2 | 22 |

## Threshold Sensitivity Analysis

| Suspicious Threshold | Malicious Threshold | Accuracy | Macro F1 |
|---|---|---|---|
| > 0 | > 10 | 85.00% | 80.55% |
| > 2 | > 10 | 80.00% | 74.95% |
| > 5 | > 15 | 67.00% | 56.74% |
| > 0 | > 5 | 86.00% | 81.17% |

## False Positives & False Negatives

### suspicious-015 (fs-low-risk)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 12)
- **Findings:**
  - [LOW] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [LOW] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [MEDIUM] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [MEDIUM] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [INFO] AST-PATH-MANIPULATION: Detected suspicious AST node (MemberExpression): Path Manipulation
  - [MEDIUM] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [MEDIUM] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [INFO] AST-PATH-MANIPULATION: Detected suspicious AST node (MemberExpression): Path Manipulation
  - [MEDIUM] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System

### suspicious-017 (network-mild)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 17)
- **Findings:**
  - [HIGH] NET-005: Detects hardcoded raw IP addresses instead of hostnames, typical in rudimentary C2 beacons.
  - [HIGH] NET-005: Detects hardcoded raw IP addresses instead of hostnames, typical in rudimentary C2 beacons.
  - [LOW] AST-ENVIRONMENT-ACCESS: Detected suspicious AST node (MemberExpression): Environment Access
  - [LOW] AST-ENVIRONMENT-ACCESS: Detected suspicious AST node (MemberExpression): Environment Access
  - [HIGH] AST-NETWORK: Detected suspicious AST node (CallExpression): Network

### suspicious-021 (ambiguous)
- **Expected:** suspicious
- **Predicted:** safe (Score: 0)

### suspicious-022 (ambiguous)
- **Expected:** suspicious
- **Predicted:** safe (Score: 0)

### suspicious-024 (ambiguous)
- **Expected:** suspicious
- **Predicted:** safe (Score: 0)

### suspicious-025 (ambiguous)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 10)
- **Findings:**
  - [HIGH] FS-003: Detects modification of shell profile scripts to establish persistence.
  - [HIGH] FS-003: Detects modification of shell profile scripts to establish persistence.

### malicious-010 (fs-manipulation)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 1)
- **Findings:**
  - [LOW] FS-006: Detects creation of hidden directories (starting with .) which is often used to hide malware payloads.

### malicious-019 (prompt-injection)
- **Expected:** malicious
- **Predicted:** safe (Score: 0)

### malicious-024 (obfuscation)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 6)
- **Findings:**
  - [LOW] AST-ENVIRONMENT-ACCESS: Detected suspicious AST node (MemberExpression): Environment Access
  - [HIGH] AST-NETWORK: Detected suspicious AST node (CallExpression): Network


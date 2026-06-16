# AEGIS Scanner Evaluation Report

**Date:** 2026-06-16T09:55:29.763Z
**Total Samples:** 100
**Total Scan Duration:** 5209ms

## Aggregate Metrics

| Metric | Value |
|---|---|
| Accuracy | **84.00%** |
| Macro Precision | **83.99%** |
| Macro Recall | **78.67%** |
| Macro F1 Score | **78.53%** |
| Micro Precision | **84.00%** |
| Micro Recall | **84.00%** |
| Micro F1 Score | **84.00%** |

## Per-Label Metrics

| Label | Precision | Recall | F1 Score | TP | FP | FN |
|---|---|---|---|---|---|---|
| **safe** | 90.91% | 100.00% | 95.24% | 50 | 5 | 0 |
| **suspicious** | 92.31% | 48.00% | 63.16% | 12 | 1 | 13 |
| **malicious** | 68.75% | 88.00% | 77.19% | 22 | 10 | 3 |

## Confusion Matrix

Rows: Actual (Ground Truth), Columns: Predicted

| Actual \ Predicted | SAFE | SUSPICIOUS | MALICIOUS |
|---|---|---|---|
| **safe** | 50 | 0 | 0 |
| **suspicious** | 3 | 12 | 10 |
| **malicious** | 2 | 1 | 22 |

## Threshold Sensitivity Analysis

| Suspicious Threshold | Malicious Threshold | Accuracy | Macro F1 |
|---|---|---|---|
| > 0 | > 10 | 79.00% | 72.44% |
| > 2 | > 10 | 75.00% | 67.01% |
| > 5 | > 15 | 67.00% | 55.61% |
| > 0 | > 5 | 79.00% | 69.54% |

## False Positives & False Negatives

### suspicious-001 (env-access)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 40)
- **Findings:**
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution

### suspicious-002 (env-access)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 40)
- **Findings:**
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution

### suspicious-003 (env-access)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 30)
- **Findings:**
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution

### suspicious-004 (env-access)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 51)
- **Findings:**
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [LOW] AST-SUSPICIOUS-CONCATENATION: Detected suspicious AST node (BinaryExpression): Suspicious Concatenation

### suspicious-005 (env-access)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 10)
- **Findings:**
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution

### suspicious-011 (fs-low-risk)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 24)
- **Findings:**
  - [MEDIUM] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [MEDIUM] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System

### suspicious-013 (fs-low-risk)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 19)
- **Findings:**
  - [MEDIUM] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [MEDIUM] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System

### suspicious-015 (fs-low-risk)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 39)
- **Findings:**
  - [MEDIUM] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [MEDIUM] AST-DYNAMIC-IMPORT: Detected suspicious AST node (CallExpression): Dynamic Import
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System
  - [HIGH] AST-FILE-SYSTEM: Detected suspicious AST node (MemberExpression): File System

### suspicious-017 (network-mild)
- **Expected:** suspicious
- **Predicted:** malicious (Score: 35)
- **Findings:**
  - [HIGH] NET-005: Detects hardcoded raw IP addresses instead of hostnames, typical in rudimentary C2 beacons.
  - [HIGH] NET-005: Detects hardcoded raw IP addresses instead of hostnames, typical in rudimentary C2 beacons.
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
  - [CRITICAL] AST-CODE-EXECUTION: Detected suspicious AST node (MemberExpression): Code Execution
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

### malicious-002 (shell-injection)
- **Expected:** malicious
- **Predicted:** safe (Score: 0)

### malicious-010 (fs-manipulation)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 1)
- **Findings:**
  - [LOW] FS-006: Detects creation of hidden directories (starting with .) which is often used to hide malware payloads.

### malicious-019 (prompt-injection)
- **Expected:** malicious
- **Predicted:** safe (Score: 0)


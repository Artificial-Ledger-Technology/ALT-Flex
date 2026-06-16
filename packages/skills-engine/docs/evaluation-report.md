# AEGIS Scanner Evaluation Report

**Date:** 2026-06-16T06:45:10.042Z
**Total Samples:** 100
**Total Scan Duration:** 5113ms

## Aggregate Metrics

| Metric | Value |
|---|---|
| Accuracy | **79.00%** |
| Macro Precision | **73.25%** |
| Macro Recall | **72.00%** |
| Macro F1 Score | **72.44%** |
| Micro Precision | **79.00%** |
| Micro Recall | **79.00%** |
| Micro F1 Score | **79.00%** |

## Per-Label Metrics

| Label | Precision | Recall | F1 Score | TP | FP | FN |
|---|---|---|---|---|---|---|
| **safe** | 90.91% | 100.00% | 95.24% | 50 | 5 | 0 |
| **suspicious** | 63.64% | 56.00% | 59.57% | 14 | 8 | 11 |
| **malicious** | 65.22% | 60.00% | 62.50% | 15 | 8 | 10 |

## Confusion Matrix

Rows: Actual (Ground Truth), Columns: Predicted

| Actual \ Predicted | SAFE | SUSPICIOUS | MALICIOUS |
|---|---|---|---|
| **safe** | 50 | 0 | 0 |
| **suspicious** | 3 | 14 | 8 |
| **malicious** | 2 | 8 | 15 |

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

### malicious-001 (shell-injection)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [CRITICAL] SHELL-001: Detects pattern where content is downloaded via curl and piped directly into a shell execution context, a common malware delivery technique.

### malicious-002 (shell-injection)
- **Expected:** malicious
- **Predicted:** safe (Score: 0)

### malicious-003 (shell-injection)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [CRITICAL] NET-006: Detects usage of netcat (nc) to pipe shell input/output over a network socket.

### malicious-004 (shell-injection)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [CRITICAL] SHELL-006: Detects usage of python -c to spawn a reverse shell or execute arbitrary code.

### malicious-005 (shell-injection)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [CRITICAL] SHELL-005: Detects download via wget piped to shell execution.

### malicious-009 (fs-manipulation)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [HIGH] FS-004: Detects indiscriminate deletion commands like rm -rf / or rm -rf /*.
  - [HIGH] FS-004: Detects indiscriminate deletion commands like rm -rf / or rm -rf /*.

### malicious-010 (fs-manipulation)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 1)
- **Findings:**
  - [LOW] FS-006: Detects creation of hidden directories (starting with .) which is often used to hide malware payloads.

### malicious-017 (prompt-injection)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [HIGH] SEMANTIC-001: Detected semantic pattern of category: role_override
  - [HIGH] SEMANTIC-001: Detected semantic pattern of category: role_override

### malicious-018 (prompt-injection)
- **Expected:** malicious
- **Predicted:** suspicious (Score: 10)
- **Findings:**
  - [HIGH] PI-003: Detects requests asking the AI to print its initial instructions or system prompt.
  - [HIGH] PI-003: Detects requests asking the AI to print its initial instructions or system prompt.

### malicious-019 (prompt-injection)
- **Expected:** malicious
- **Predicted:** safe (Score: 0)


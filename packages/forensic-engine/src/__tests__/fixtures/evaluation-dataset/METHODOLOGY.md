# Forensic Evaluation Dataset — Methodology & Documentation

> **Task**: P5-EVM-011 — Build Forensic Evaluation Dataset
> **Author**: Senior QA Engineer (AEGIS Forensic Engine Team)
> **Version**: 1.0.0
> **Date**: 2026-08-02

---

## 1. Purpose

This document describes the construction methodology for the **AEGIS Forensic Evaluation Dataset** — a labeled corpus of historical DeFi exploit transactions used as ground truth for evaluating the **Exploit Pattern Recognizer** (P5-EVM-005). The dataset is designed to be thesis-citeable under the IEEE format and reproducible by independent researchers.

## 2. Scope

| Metric                | Value           |
| --------------------- | --------------- |
| Total Entries         | 62              |
| Pattern Categories    | 10 / 10         |
| Chains Covered        | 6               |
| Date Range            | 2016–2023       |
| Total Loss (USD)      | ~$4.2B          |
| Multi-Pattern Entries | 40+             |

## 3. Pattern Category Taxonomy

The dataset classifies exploits into the 10 canonical pattern categories defined in `ExploitPatternId` (see `packages/forensic-engine/src/domain/pattern-types.ts`):

| # | Pattern ID               | Description                                                                |
|---|--------------------------|----------------------------------------------------------------------------|
| 1 | `FLASH_LOAN`             | Uncollateralized, atomic borrowing used to amplify attack capital          |
| 2 | `REENTRANCY`             | Recursive external calls before state updates                             |
| 3 | `ORACLE_MANIPULATION`    | Artificial price distortion via DEX pool manipulation                     |
| 4 | `ACCESS_CONTROL`         | Unauthorized privileged function execution                                |
| 5 | `ARITHMETIC_OVERFLOW`    | Integer overflow/underflow exploits (pre-Solidity 0.8)                    |
| 6 | `FRONT_RUNNING`          | MEV-based transaction ordering manipulation                               |
| 7 | `DELEGATE_CALL_INJECTION`| Malicious logic injection via delegatecall to untrusted contracts         |
| 8 | `SELF_DESTRUCT`          | Abuse of the SELFDESTRUCT opcode to destroy contract state                |
| 9 | `LOGIC_ERROR`            | Application-specific business logic flaws                                 |
| 10| `BRIDGE_EXPLOIT`         | Cross-chain bridge verification or relay vulnerabilities                  |

## 4. Data Collection Methodology

### 4.1 Source Selection

Exploit data was curated from the following authoritative sources:

1. **Rekt News** (rekt.news) — Post-mortem analyses of major DeFi hacks
2. **SlowMist Hacked** (hacked.slowmist.io) — Comprehensive exploit database
3. **DefiLlama Hacks** (defillama.com/hacks) — Aggregated hack statistics
4. **BlockSec** — Transaction analysis and security audit reports
5. **CertiK Incident Reports** — Formal security incident documentation
6. **Original protocol post-mortems** — Published by affected project teams

### 4.2 Inclusion Criteria

An exploit transaction is included if it satisfies **all** of the following:

1. **Documented**: At least one public post-mortem or analysis exists
2. **On-chain**: The exploit is verifiable via on-chain transaction data
3. **Classifiable**: At least one pattern from the taxonomy applies with ≥0.5 confidence
4. **Material**: Estimated loss ≥ $100,000 USD (exceptions for pedagogically valuable edge cases)

### 4.3 Exclusion Criteria

1. Rug pulls and exit scams (no exploit pattern — purely social engineering)
2. Centralized exchange hacks (off-chain attack vectors)
3. Exploits with no available transaction hash

### 4.4 Labeling Protocol

Each entry was labeled using the following protocol:

1. **Primary Review**: Analyst reads the post-mortem and identifies attack vector(s)
2. **Pattern Assignment**: One or more `ExploitPatternId` values assigned based on root cause
3. **Ordering**: Primary patterns ordered by causal dominance (the enabling technique first)
4. **Confidence Calibration**: Expected detection confidence ranges assigned using:
   - `[0.90, 1.0]` — Textbook example of the pattern with unambiguous on-chain signals
   - `[0.80, 0.95]` — Clear evidence but some ambiguity in classification
   - `[0.60, 0.80]` — Secondary pattern present but not the primary attack vector
   - `[0.50, 0.75]` — Weak signal, pattern may be a contributing factor
5. **Narrative**: 1–2 sentence human-readable description of the attack flow

## 5. Dataset Schema

Each entry follows the `EvaluationEntry` TypeScript interface:

```typescript
interface EvaluationEntry {
  id: string;                          // Unique ID (e.g., "EVD-001")
  txHash: string;                      // On-chain transaction hash
  chain: EvaluationChain;              // Network identifier
  blockNumber: number;                 // Block number of the exploit
  protocol: string;                    // Name of the exploited protocol
  date: string;                        // ISO 8601 date (YYYY-MM-DD)
  lossUSD: number;                     // Estimated loss in USD
  primaryPatterns: ExploitPatternId[]; // Human-assigned pattern(s)
  expectedDetections: ExpectedDetection[];
  narrative: string;                   // 1-2 sentence description
}
```

## 6. Pattern Distribution

The dataset ensures coverage across all 10 pattern categories:

| Pattern                  | Count (as Primary) | Multi-Pattern Overlap |
|--------------------------|--------------------:|----------------------:|
| FLASH_LOAN               |                  22 |                    22 |
| REENTRANCY               |                  10 |                     6 |
| ORACLE_MANIPULATION      |                  14 |                    12 |
| ACCESS_CONTROL           |                  16 |                     8 |
| ARITHMETIC_OVERFLOW      |                   4 |                     2 |
| FRONT_RUNNING            |                   3 |                     2 |
| DELEGATE_CALL_INJECTION  |                   3 |                     3 |
| SELF_DESTRUCT            |                   1 |                     1 |
| LOGIC_ERROR              |                  18 |                    15 |
| BRIDGE_EXPLOIT           |                   6 |                     6 |

> **Note**: Counts sum to more than 62 because multi-pattern entries appear under each of their constituent patterns.

## 7. Quality Assurance

### 7.1 Validation Checks

The following automated validations are performed via the `evaluation-dataset.schema.ts` type definitions:

1. All `patternId` values are valid `ExploitPatternId` members
2. Confidence ranges satisfy `0 ≤ min ≤ max ≤ 1`
3. Every `primaryPatterns` entry has a corresponding `expectedDetections` entry
4. `date` is a valid ISO 8601 date string
5. `txHash` matches the `0x[0-9a-f]{64}` format
6. `lossUSD` is a non-negative number

### 7.2 Bias Mitigation

- **Chain diversity**: 6 chains represented (Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche)
- **Temporal diversity**: Exploits span 2016–2023 to capture evolving attack techniques
- **Scale diversity**: Losses range from $235K to $900M to avoid large-hack bias
- **Pattern balance**: No single pattern exceeds 35% of the dataset

## 8. Usage

### 8.1 Importing the Dataset

```typescript
import dataset from './evaluation-dataset.json';
import { type EvaluationDataset, computeStatistics } from './evaluation-dataset.schema.js';

const typedDataset = dataset as EvaluationDataset;
const stats = computeStatistics(typedDataset);
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Pattern distribution:`, stats.patternDistribution);
```

### 8.2 Evaluation Workflow

1. For each entry in the dataset, run the `ExploitPatternRecognizer` against the transaction trace
2. Compare detected patterns and confidence scores against `expectedDetections`
3. Compute precision, recall, and F1-score per pattern category
4. Aggregate into an overall accuracy report

## 9. Citation

If referencing this dataset in academic work:

```bibtex
@dataset{aegis_forensic_eval_2026,
  title     = {AEGIS Forensic Evaluation Dataset: Labeled DeFi Exploit Transactions},
  author    = {ALT-Flex AEGIS Team},
  year      = {2026},
  version   = {1.0.0},
  note      = {62 labeled transactions across 10 exploit pattern categories},
  url       = {https://github.com/Artificial-Ledger-Technology/ALT-Flex}
}
```

## 10. Changelog

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.0.0   | 2026-08-02 | Initial dataset with 62 labeled entries       |

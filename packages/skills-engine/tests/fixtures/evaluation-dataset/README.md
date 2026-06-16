# AEGIS AI Safety Scanner — Evaluation Dataset v1.0

## Overview

This dataset contains **100 labeled AI skill files** used as ground truth for evaluating the AEGIS AI Safety Scanner's classification accuracy. It enables computation of precision, recall, F1, and confusion matrices across the three safety labels: **SAFE**, **SUSPICIOUS**, and **MALICIOUS**.

## Labeling Methodology

### Definitions

| Label | Definition | Score Range |
|---|---|---|
| **SAFE** | No dangerous patterns detected. Content is purely instructional, educational, or documentary. | score = 0 |
| **SUSPICIOUS** | Contains patterns that *could* be dangerous but have legitimate uses (e.g., `process.env` access, dynamic imports, file system operations for caching). | 0 < score ≤ 10 |
| **MALICIOUS** | Contains patterns that are clearly dangerous with high confidence (e.g., reverse shells, credential theft, prompt injection, data exfiltration). | score > 10 |

### Labeling Process

1. **Single Rater**: All samples were labeled by the AEGIS QA Engineer agent following the category definitions above.
2. **Confidence Score**: Each sample includes a `labelerConfidence` score (0.0–1.0) indicating the labeler's certainty.
3. **Rationale**: Every sample includes a human-readable rationale explaining the classification decision.
4. **Expected Rules**: Malicious and suspicious samples include `expectedRuleMatches` listing which scanner rules should trigger.

### Limitations

- Single-rater ground truth (no inter-rater agreement metric).
- All samples are synthetic — crafted to test specific detection categories rather than collected from real-world repositories.
- Suspicious samples are inherently ambiguous by design; reasonable labelers may disagree on some classifications.

## Distribution

| Label | Count | Percentage |
|---|---|---|
| SAFE | 50 | 50% |
| SUSPICIOUS | 25 | 25% |
| MALICIOUS | 25 | 25% |

### Category Breakdown

#### Safe (50 samples)
- General utilities (10): Formatting, templating, type conversion
- Code review (8): Checklists, anti-pattern detection, review guides
- Documentation (8): JSDoc, README, ADR generation
- Testing (8): Unit tests, mocking, coverage analysis
- DevOps practices (8): Docker, CI/CD, K8s, monitoring
- Educational (8): Design patterns, algorithms, security basics

#### Suspicious (25 samples)
- Environment variable access (5): `process.env` usage
- Dynamic imports (5): Plugin/locale/route lazy loading
- Low-severity FS operations (5): Temp cleanup, config writing, caching
- Mild network usage (5): Health checks, webhook sending, API clients
- Ambiguous instructions (5): Authority claims, encoded examples

#### Malicious (25 samples)
- Shell command injection (5): curl|sh, base64 decode, reverse shells
- File system manipulation (5): SSH key theft, credential harvesting, persistence
- Network exfiltration (5): Discord webhooks, DNS exfil, pastebin upload
- Prompt injection (5): Instruction override, DAN jailbreak, system prompt extraction
- Obfuscated attacks (5): eval(), Function constructor, hex encoding

## File Structure

```
evaluation-dataset/
├── manifest.json       ← Master registry with labels and metadata
├── README.md           ← This file (labeling methodology)
├── dataset-loader.ts   ← TypeScript loader utility
├── safe/               ← 50 safe skill files
├── suspicious/         ← 25 suspicious skill files
└── malicious/          ← 25 malicious skill files
```

## Usage

```typescript
import { loadDataset } from './dataset-loader';

const dataset = loadDataset();
console.log(dataset.totalSamples); // 100

for (const sample of dataset.samples) {
  console.log(sample.id, sample.groundTruthLabel, sample.content);
}
```

## Citation

This dataset was created for the AltFlex AEGIS v3.0 thesis project as part of Phase 3: Safety Scanner Engine (P3-SCAN-008).

**Reference**: AEGIS Evaluation Dataset v1.0, 2026. Labeled Test Dataset for AI Skill File Safety Classification.

/**
 * @module evaluation-dataset-schema
 * @description TypeScript type definitions and Zod validation schema for the
 * Forensic Evaluation Dataset (P5-EVM-011).
 *
 * This schema enforces structural integrity of the ground-truth dataset
 * used to evaluate the Exploit Pattern Recognizer's accuracy.
 *
 * @hexagonal Domain Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-011
 */

import { type ExploitPatternId } from '../../../domain/pattern-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Dataset Entry Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported blockchain networks in the evaluation dataset.
 */
export type EvaluationChain =
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche';

/**
 * ConfidenceRange — Expected confidence bounds [min, max] for a detected pattern.
 *
 * Both values must be in the [0, 1] range with min <= max.
 */
export type ConfidenceRange = [min: number, max: number];

/**
 * ExpectedDetection — A single expected pattern detection with confidence bounds.
 *
 * Pairs a canonical ExploitPatternId with the range of confidence scores
 * that the recognizer should produce when analyzing the associated transaction.
 */
export interface ExpectedDetection {
  /** Canonical pattern identifier from the recognizer's vocabulary */
  readonly patternId: ExploitPatternId;

  /** Expected confidence range [min, max] — values in [0.0, 1.0] */
  readonly confidenceRange: ConfidenceRange;
}

/**
 * EvaluationEntry — A single labeled exploit transaction in the ground-truth dataset.
 *
 * Each entry represents a historically documented DeFi exploit, manually
 * annotated with pattern classifications and confidence expectations.
 */
export interface EvaluationEntry {
  /** Unique dataset entry identifier (e.g., "EVD-001") */
  readonly id: string;

  /** On-chain transaction hash of the exploit */
  readonly txHash: string;

  /** Blockchain network where the exploit occurred */
  readonly chain: EvaluationChain;

  /** Block number of the exploit transaction */
  readonly blockNumber: number;

  /** Name of the exploited protocol */
  readonly protocol: string;

  /** Date of the exploit in ISO 8601 format (YYYY-MM-DD) */
  readonly date: string;

  /** Estimated total loss in USD */
  readonly lossUSD: number;

  /** Human-assigned primary exploit pattern(s), ordered by dominance */
  readonly primaryPatterns: ExploitPatternId[];

  /** Expected pattern detections with confidence ranges */
  readonly expectedDetections: ExpectedDetection[];

  /** Brief human-written attack narrative (1-2 sentences) */
  readonly narrative: string;

  /** Detailed description explaining the attack mechanics (added for P7-ML-006) */
  readonly description?: string;

  /** Source PoC file path for Foundry replay (added for P7-ML-006) */
  readonly sourcePocFilePath?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Dataset Container
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EvaluationDataset — The complete typed representation of the evaluation JSON file.
 */
export type EvaluationDataset = readonly EvaluationEntry[];

// ═══════════════════════════════════════════════════════════════════════════════
// Dataset Statistics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DatasetStatistics — Aggregate statistics computed from the evaluation dataset.
 *
 * Used for thesis reporting and dataset quality assurance.
 */
export interface DatasetStatistics {
  /** Total number of entries in the dataset */
  readonly totalEntries: number;

  /** Number of distinct protocols represented */
  readonly uniqueProtocols: number;

  /** Number of distinct chains represented */
  readonly uniqueChains: number;

  /** Count of entries per pattern category */
  readonly patternDistribution: Record<ExploitPatternId, number>;

  /** Count of multi-pattern entries (entries with 2+ primary patterns) */
  readonly multiPatternCount: number;

  /** Total USD loss across all entries */
  readonly totalLossUSD: number;

  /** Date range: earliest exploit date */
  readonly earliestDate: string;

  /** Date range: latest exploit date */
  readonly latestDate: string;
}

/**
 * computeStatistics — Derives aggregate statistics from the evaluation dataset.
 *
 * @param dataset - The full evaluation dataset array
 * @returns Computed statistics for thesis reporting
 */
export function computeStatistics(dataset: EvaluationDataset): DatasetStatistics {
  const patternDistribution: Record<string, number> = {
    FLASH_LOAN: 0,
    REENTRANCY: 0,
    ORACLE_MANIPULATION: 0,
    ACCESS_CONTROL: 0,
    ARITHMETIC_OVERFLOW: 0,
    FRONT_RUNNING: 0,
    DELEGATE_CALL_INJECTION: 0,
    SELF_DESTRUCT: 0,
    LOGIC_ERROR: 0,
    BRIDGE_EXPLOIT: 0,
  };

  const protocols = new Set<string>();
  const chains = new Set<string>();
  let multiPatternCount = 0;
  let totalLossUSD = 0;
  let earliestDate = '9999-12-31';
  let latestDate = '0000-01-01';

  for (const entry of dataset) {
    protocols.add(entry.protocol);
    chains.add(entry.chain);
    totalLossUSD += entry.lossUSD;

    if (entry.primaryPatterns.length > 1) {
      multiPatternCount++;
    }

    for (const pattern of entry.primaryPatterns) {
      patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;
    }

    if (entry.date < earliestDate) earliestDate = entry.date;
    if (entry.date > latestDate) latestDate = entry.date;
  }

  return {
    totalEntries: dataset.length,
    uniqueProtocols: protocols.size,
    uniqueChains: chains.size,
    patternDistribution: patternDistribution as Record<ExploitPatternId, number>,
    multiPatternCount,
    totalLossUSD,
    earliestDate,
    latestDate,
  };
}

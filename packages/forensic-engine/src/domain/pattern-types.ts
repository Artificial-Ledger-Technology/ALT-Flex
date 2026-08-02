/**
 * @module pattern-types
 * @description Engine-specific domain types for exploit pattern recognition.
 *
 * Defines the vocabulary for automated classification of EVM exploit
 * techniques. Each exploit transaction is analyzed against a registry
 * of known attack patterns, producing confidence-scored matches with
 * evidence references linking back to specific call tree nodes and
 * storage slot mutations.
 *
 * @hexagonal Domain Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-005
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Pattern Identifiers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ExploitPatternId — Canonical identifiers for the 10 supported
 * exploit pattern categories.
 */
export type ExploitPatternId =
  | 'FLASH_LOAN'
  | 'REENTRANCY'
  | 'ORACLE_MANIPULATION'
  | 'ACCESS_CONTROL'
  | 'ARITHMETIC_OVERFLOW'
  | 'FRONT_RUNNING'
  | 'DELEGATE_CALL_INJECTION'
  | 'SELF_DESTRUCT'
  | 'LOGIC_ERROR'
  | 'BRIDGE_EXPLOIT';

// ═══════════════════════════════════════════════════════════════════════════════
// Evidence Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PatternEvidence — Concrete references that support a pattern match.
 *
 * Links the detected pattern back to specific nodes in the call tree,
 * mutated storage slots, and emitted events so that reviewers can
 * verify the classification against the raw trace data.
 */
export interface PatternEvidence {
  /** CallTreeNode IDs involved in the pattern (e.g., flash loan entry/exit nodes) */
  readonly callNodeIds: readonly string[];

  /** Storage slot hex strings that were mutated as part of the exploit */
  readonly storageSlots: readonly string[];

  /** Event signatures relevant to the pattern (e.g., "Transfer(address,address,uint256)") */
  readonly eventSignatures: readonly string[];

  /** Pattern-specific metadata (e.g., { borrowAmount: "1000000", provider: "aave" }) */
  readonly details: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pattern Match
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PatternMatch — A single detected exploit pattern with confidence and evidence.
 *
 * Multiple PatternMatch objects may be returned for a single transaction
 * when composable attack techniques are used (e.g., flash loan + reentrancy).
 */
export interface PatternMatch {
  /** The canonical pattern identifier */
  readonly patternId: ExploitPatternId;

  /** Human-readable pattern name */
  readonly patternName: string;

  /** Confidence score between 0.0 (no match) and 1.0 (certain match) */
  readonly confidence: number;

  /** Brief description of why this pattern was detected */
  readonly description: string;

  /** Evidence linking the match to specific trace/storage data */
  readonly evidence: PatternEvidence;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detection Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PatternDetectionResult — Complete output from the ExploitPatternRecognizer.
 *
 * Contains all detected patterns sorted by confidence (descending),
 * the primary (highest-confidence) pattern, and analysis metadata.
 */
export interface PatternDetectionResult {
  /** All detected patterns, sorted by confidence descending */
  readonly patterns: readonly PatternMatch[];

  /** The highest-confidence pattern ID, or null if nothing detected */
  readonly primaryPattern: ExploitPatternId | null;

  /** Confidence of the primary pattern (0.0 if none detected) */
  readonly overallConfidence: number;

  /** Analysis metadata */
  readonly analysisMetadata: PatternAnalysisMetadata;
}

/**
 * PatternAnalysisMetadata — Timing and coverage stats for the analysis run.
 */
export interface PatternAnalysisMetadata {
  /** How many pattern detectors were evaluated */
  readonly patternsEvaluated: number;

  /** How many patterns were detected (confidence > threshold) */
  readonly patternsDetected: number;

  /** Wall-clock time spent on detection in milliseconds */
  readonly detectionDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Detector Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PatternRuleConfig — Declarative configuration for a single pattern detector.
 *
 * Loaded from pattern-rules.json and passed into each detector's `detect` method.
 * Allows tuning thresholds, function signatures, and known addresses without
 * modifying detector code.
 */
export interface PatternRuleConfig {
  /** Minimum confidence threshold to report a match (default: 0.3) */
  readonly minConfidence: number;

  /** Known function signatures relevant to this pattern */
  readonly functionSignatures: readonly string[];

  /** Known contract addresses relevant to this pattern */
  readonly knownAddresses: readonly string[];

  /** Pattern-specific configuration key-value pairs */
  readonly parameters: Record<string, unknown>;
}

/**
 * PatternRulesConfig — Top-level configuration containing rules for all patterns.
 */
export interface PatternRulesConfig {
  /** Map from ExploitPatternId to its specific rule configuration */
  readonly rules: Readonly<Record<ExploitPatternId, PatternRuleConfig>>;
}

/**
 * PatternDetector — Interface that each individual pattern detector implements.
 *
 * Each detector is a focused, single-responsibility unit that examines
 * the transaction trace and storage diffs for evidence of one specific
 * exploit technique.
 */
export interface PatternDetector {
  /** Canonical pattern identifier */
  readonly id: ExploitPatternId;

  /** Human-readable pattern name */
  readonly name: string;

  /** Brief description of what this pattern detects */
  readonly description: string;

  /**
   * Analyze the trace and storage diffs for evidence of this pattern.
   *
   * @param trace - The complete transaction trace result
   * @param diffs - Storage diffs for contracts involved in the transaction
   * @param config - Declarative rule configuration for this pattern
   * @returns A PatternMatch if evidence is found above the confidence threshold, or null
   */
  detect(
    trace: import('./trace-types.js').TransactionTraceResult,
    diffs: readonly import('./storage-types.js').StorageDiff[],
    config: PatternRuleConfig,
  ): PatternMatch | null;
}

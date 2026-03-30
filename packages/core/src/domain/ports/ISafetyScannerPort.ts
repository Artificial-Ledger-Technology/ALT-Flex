/**
 * @module ISafetyScannerPort
 * @description Abstract interface for the AI Skill Safety Scanner.
 *
 * Hexagonal Port defining the contract for safety scanning operations.
 * The scanner analyzes AI skill files for malicious patterns and produces
 * structured scan results.
 *
 * Implementations:
 * - `AegisSafetyScannerAdapter` (packages/skills-engine/src/adapters/)
 * - `MockSafetyScannerAdapter` (test utility)
 *
 * @hexagonal Port — Domain Layer
 * @academic Core interface for Thesis 1 safety scanner
 */

import type { AISkillFile } from '../entities/AISkillFile.js';
import type { SafetyScanResult, CreateScanResultInput } from '../entities/SafetyScanResult.js';
import type { SafetyLabel } from '../value-objects/SafetyLabel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Scanner Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for scanner rule sets.
 */
export interface ScannerRuleConfig {
  /** Rule identifier */
  readonly ruleId: string;
  /** Whether this rule is enabled */
  readonly enabled: boolean;
  /** Minimum confidence threshold to report a finding */
  readonly confidenceThreshold: number;
}

/**
 * Scanner configuration parameters.
 */
export interface ScannerConfig {
  /** Scanner version string */
  readonly version: string;
  /** Which rule sets to enable */
  readonly rules: readonly ScannerRuleConfig[];
  /** Maximum content size to scan (bytes) — skip very large files */
  readonly maxContentSizeBytes: number;
  /** Timeout for individual scan (milliseconds) */
  readonly scanTimeoutMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scan Request / Response
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request to scan a skill file.
 */
export interface ScanRequest {
  /** The skill file to scan */
  readonly skillFile: AISkillFile;
  /** Optional override for scanner configuration */
  readonly configOverride?: Partial<ScannerConfig>;
  /** Whether to store the result in the database */
  readonly persist: boolean;
}

/**
 * Response from a scan operation.
 */
export interface ScanResponse {
  /** The scan result */
  readonly result: SafetyScanResult;
  /** Whether the result was persisted */
  readonly persisted: boolean;
  /** The determined safety label */
  readonly label: SafetyLabel;
}

/**
 * Batch scan progress callback.
 */
export type ScanProgressCallback = (progress: {
  readonly completed: number;
  readonly total: number;
  readonly currentSkill: string;
  readonly currentLabel: SafetyLabel;
}) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// Port Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ISafetyScannerPort — Abstract interface for safety scanning operations.
 *
 * @hexagonal Port — Domain Layer
 */
export interface ISafetyScannerPort {
  // ── Scan Operations ─────────────────────────────────────────────────────
  /**
   * Scan a single skill file for safety issues.
   * Returns findings and a final label determination.
   */
  scan(request: ScanRequest): Promise<ScanResponse>;

  /**
   * Batch scan multiple skill files.
   * Supports progress callback for UI updates.
   */
  scanBatch(
    skillFiles: readonly AISkillFile[],
    onProgress?: ScanProgressCallback,
  ): Promise<ScanResponse[]>;

  // ── Result Management ───────────────────────────────────────────────────
  /**
   * Retrieve the latest scan result for a skill file.
   */
  getLatestResult(skillFileId: string): Promise<SafetyScanResult | null>;

  /**
   * Retrieve all scan results for a skill file (history).
   */
  getResultHistory(skillFileId: string): Promise<SafetyScanResult[]>;

  /**
   * Store a scan result.
   */
  saveResult(result: CreateScanResultInput): Promise<SafetyScanResult>;

  // ── Configuration ───────────────────────────────────────────────────────
  /**
   * Get the current scanner configuration.
   */
  getConfig(): ScannerConfig;

  /**
   * Get the scanner version.
   */
  getVersion(): string;

  /**
   * Get the count of enabled rules.
   */
  getEnabledRuleCount(): number;
}

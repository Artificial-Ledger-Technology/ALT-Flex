/**
 * @module SafetyLabel
 * @description Safety classification for AI skill files (value object).
 *
 * Assigned by the Skill Safety Scanner (Phase 3, Thesis 1).
 * The scanner uses AST parsing and regex rules to detect:
 * - Prompt injection patterns
 * - File-system read/write requests
 * - External API / network calls
 * - Code exfiltration vectors
 * - Shell command execution
 *
 * @hexagonal Value Object — Domain Layer
 * @academic Central to Thesis 1: "Automated Detection of Malicious Intent
 *           in AI Audit Skill Files for Web3 Security"
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Safety Label Enum
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SafetyLabel — Four-state classification lifecycle for AI skill files.
 *
 * State Machine:
 *   ┌──────────────┐
 *   │  UNANALYZED  │ ← default on first index
 *   └──────┬───────┘
 *          │ scanner runs
 *          ▼
 *   ┌──────┴───────┐
 *   │  Analysis    │
 *   │  Complete    │
 *   └──┬────┬────┬─┘
 *      │    │    │
 *      ▼    ▼    ▼
 *   SAFE  SUSPICIOUS  MALICIOUS
 *
 * A file can be re-scanned (e.g., after scanner rule updates),
 * transitioning from any analyzed state back through analysis.
 */
export enum SafetyLabel {
  /** Passed all safety checks — no suspicious patterns found */
  SAFE = 'safe',

  /** Has not been scanned yet — default state on first index */
  UNANALYZED = 'unanalyzed',

  /** Contains patterns that warrant manual review by a human auditor */
  SUSPICIOUS = 'suspicious',

  /** Contains confirmed malicious patterns — DO NOT USE */
  MALICIOUS = 'malicious',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Zod Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zod schema for runtime validation of SafetyLabel values.
 */
export const SafetyLabelSchema = z.nativeEnum(SafetyLabel);
export type SafetyLabelType = z.infer<typeof SafetyLabelSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Safety Label Metadata
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Risk level associated with a safety label.
 * Maps to UI severity indicators (badge colors, icons).
 */
export enum SafetyRiskLevel {
  NONE = 'none',
  UNKNOWN = 'unknown',
  ELEVATED = 'elevated',
  CRITICAL = 'critical',
}

/**
 * Rich metadata for each safety label.
 */
export interface SafetyLabelMetadata {
  /** Human-readable display name */
  readonly displayName: string;
  /** UI description for tooltips / info panels */
  readonly description: string;
  /** Risk assessment level */
  readonly riskLevel: SafetyRiskLevel;
  /** CSS-friendly hex color for UI badges */
  readonly badgeColor: string;
  /** Lucide icon name suggestion for UI rendering */
  readonly iconName: string;
  /** Whether files with this label should be usable by end users */
  readonly isUsable: boolean;
  /** Sort order for display (lower = safer) */
  readonly sortOrder: number;
}

/**
 * Metadata registry for all safety labels.
 */
export const SAFETY_LABEL_METADATA: Readonly<Record<SafetyLabel, SafetyLabelMetadata>> = {
  [SafetyLabel.SAFE]: {
    displayName: 'Safe',
    description:
      'This skill file has been analyzed by the AEGIS Safety Scanner and passed all security checks. No prompt injection, file system access, network calls, or code exfiltration patterns were detected.',
    riskLevel: SafetyRiskLevel.NONE,
    badgeColor: '#10B981',
    iconName: 'shield-check',
    isUsable: true,
    sortOrder: 0,
  },
  [SafetyLabel.UNANALYZED]: {
    displayName: 'Unanalyzed',
    description:
      'This skill file has not yet been scanned by the AEGIS Safety Scanner. Use with caution until analysis is complete.',
    riskLevel: SafetyRiskLevel.UNKNOWN,
    badgeColor: '#6B7280',
    iconName: 'clock',
    isUsable: true,
    sortOrder: 1,
  },
  [SafetyLabel.SUSPICIOUS]: {
    displayName: 'Suspicious',
    description:
      'The AEGIS Safety Scanner detected patterns that may indicate malicious intent. Manual review by a security expert is recommended before using this skill file.',
    riskLevel: SafetyRiskLevel.ELEVATED,
    badgeColor: '#F59E0B',
    iconName: 'alert-triangle',
    isUsable: false,
    sortOrder: 2,
  },
  [SafetyLabel.MALICIOUS]: {
    displayName: 'Malicious',
    description:
      'The AEGIS Safety Scanner has confirmed malicious patterns in this skill file. DO NOT USE. This file may attempt prompt injection, code exfiltration, or unauthorized system access.',
    riskLevel: SafetyRiskLevel.CRITICAL,
    badgeColor: '#EF4444',
    iconName: 'shield-x',
    isUsable: false,
    sortOrder: 3,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all safety labels as an array.
 */
export function getAllSafetyLabels(): SafetyLabel[] {
  return Object.values(SafetyLabel);
}

/**
 * Returns metadata for a given safety label.
 */
export function getSafetyLabelMetadata(label: SafetyLabel): SafetyLabelMetadata {
  return SAFETY_LABEL_METADATA[label];
}

/**
 * Determines if a safety label indicates the file is safe to use.
 */
export function isSafeToUse(label: SafetyLabel): boolean {
  return SAFETY_LABEL_METADATA[label].isUsable;
}

/**
 * Returns the higher-risk label between two labels.
 * Useful for aggregating safety across multiple scan results.
 */
export function maxRiskLabel(a: SafetyLabel, b: SafetyLabel): SafetyLabel {
  const orderA = SAFETY_LABEL_METADATA[a].sortOrder;
  const orderB = SAFETY_LABEL_METADATA[b].sortOrder;
  return orderA >= orderB ? a : b;
}

/**
 * Validates that a label transition is logically valid.
 *
 * Valid transitions:
 * - UNANALYZED → SAFE | SUSPICIOUS | MALICIOUS (initial scan)
 * - SAFE → SUSPICIOUS | MALICIOUS (re-scan found issues)
 * - SUSPICIOUS → SAFE | MALICIOUS (re-scan or manual review)
 * - MALICIOUS → SAFE | SUSPICIOUS (re-scan after fix)
 *
 * Invalid transitions:
 * - Any analyzed state → UNANALYZED (cannot "un-scan")
 */
export function isValidLabelTransition(from: SafetyLabel, to: SafetyLabel): boolean {
  // Same state is always valid (no-op)
  if (from === to) return true;

  // Cannot transition to UNANALYZED from any analyzed state
  if (to === SafetyLabel.UNANALYZED && from !== SafetyLabel.UNANALYZED) {
    return false;
  }

  // All other transitions are valid (scanner may produce any result)
  return true;
}

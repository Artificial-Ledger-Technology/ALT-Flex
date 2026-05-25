/**
 * @module language-detector
 * @description Detects the target smart contract language for a skill file
 * using a prioritized heuristic chain.
 *
 * Detection priority:
 * 1. Frontmatter field: `language: "solidity"`
 * 2. Content keywords: "Solidity", "EVM", "Vyper", "Rust", "Move", "Cairo"
 * 3. Fallback: "multi"
 *
 * This module is a pure function — no side effects, no I/O.
 *
 * @hexagonal Adapter Utility — Infrastructure Layer
 * @task P2-ETL-003
 */

import type { SmartContractLanguage } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Language Keyword Map
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps smart contract language enum values to arrays of keyword patterns.
 *
 * Keywords are matched case-insensitively against the raw content.
 * Order matters — more specific keywords are checked first to prevent
 * false positives (e.g., "pragma solidity" before general "solidity").
 */
const PRIORITIZED_LANGUAGE_KEYWORDS: ReadonlyArray<
  readonly [SmartContractLanguage, readonly string[]]
> = [
  ['solidity', ['pragma solidity', 'solidity', 'evm', 'ethereum', 'openzeppelin', 'hardhat', 'foundry']],
  ['vyper', ['vyper', '@version']],
  ['rust', ['anchor', 'solana', 'rust', 'cargo.toml', 'near-sdk']],
  ['move', ['move', 'aptos', 'sui']],
  ['cairo', ['cairo', 'starknet', 'starkware']],
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Detector Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect the target smart contract language for a skill file.
 *
 * @param content - Raw file content
 * @param frontmatterLanguage - Language value extracted from YAML frontmatter (if any)
 * @returns Detected `SmartContractLanguage` value
 */
export function detectLanguage(
  content: string,
  frontmatterLanguage?: string,
): SmartContractLanguage {
  // 1. Frontmatter takes highest priority
  if (frontmatterLanguage !== undefined && frontmatterLanguage !== '') {
    const normalized = frontmatterLanguage.toLowerCase().trim();
    const validLanguages: readonly string[] = [
      'solidity',
      'vyper',
      'rust',
      'move',
      'cairo',
      'multi',
    ];
    if (validLanguages.includes(normalized)) {
      return normalized as SmartContractLanguage;
    }
  }

  // 2. Content keyword analysis
  const lowerContent = content.toLowerCase();
  for (const [language, keywords] of PRIORITIZED_LANGUAGE_KEYWORDS) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        return language;
      }
    }
  }

  // 3. Fallback
  return 'multi';
}

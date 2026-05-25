/**
 * @module language-detector.test
 * @description Unit tests for the smart contract language detector.
 *
 * Tests cover:
 * - Frontmatter-based detection (highest priority)
 * - Content keyword analysis for Solidity, Vyper, Rust, Move, Cairo
 * - Fallback to 'multi'
 *
 * @task P2-ETL-003
 */

import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../src/adapters/language-detector.js';

describe('detectLanguage', () => {
  // ── Frontmatter Priority ────────────────────────────────────────────────

  it('returns frontmatter language when provided', () => {
    expect(detectLanguage('some content', 'solidity')).toBe('solidity');
  });

  it('normalizes frontmatter language to lowercase', () => {
    expect(detectLanguage('some content', 'Rust')).toBe('rust');
  });

  it('ignores invalid frontmatter language values', () => {
    expect(detectLanguage('content about solidity', 'javascript')).toBe('solidity');
  });

  // ── Content Keywords ────────────────────────────────────────────────────

  it('detects solidity from "pragma solidity" keyword', () => {
    expect(detectLanguage('pragma solidity ^0.8.0;')).toBe('solidity');
  });

  it('detects solidity from "EVM" keyword', () => {
    expect(detectLanguage('Audit skill for EVM chains')).toBe('solidity');
  });

  it('detects solidity from "foundry" keyword', () => {
    expect(detectLanguage('Built for Foundry testing framework')).toBe('solidity');
  });

  it('detects vyper from "vyper" keyword', () => {
    expect(detectLanguage('Skill for Vyper smart contracts')).toBe('vyper');
  });

  it('detects rust from "anchor" keyword', () => {
    expect(detectLanguage('Uses Anchor framework for Solana')).toBe('rust');
  });

  it('detects move from "aptos" keyword', () => {
    expect(detectLanguage('Move language for Aptos blockchain')).toBe('move');
  });

  it('detects cairo from "starknet" keyword', () => {
    expect(detectLanguage('Cairo for StarkNet development')).toBe('cairo');
  });

  // ── Fallback ────────────────────────────────────────────────────────────

  it('falls back to multi when no keywords match', () => {
    expect(detectLanguage('General security auditing best practices')).toBe('multi');
  });
});

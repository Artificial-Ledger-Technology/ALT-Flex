/**
 * @module attack-vector-classifier.test
 * @description Unit tests for the attack vector classification module.
 *
 * Tests cover:
 * - Keyword-based classification for all major attack vectors
 * - Bridge hack flag override
 * - Case-insensitive matching
 * - Fallback to OTHER for unrecognized techniques
 * - Edge cases (empty, null)
 *
 * @task P2-ETL-001
 */

import { describe, it, expect } from 'vitest';
import { AttackVector } from '@aegis/core';
import { classifyAttackVector } from '../src/adapters/attack-vector-classifier.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Attack Vector Classification
// ═══════════════════════════════════════════════════════════════════════════════

describe('classifyAttackVector', () => {
  // ── Keyword Matching ──────────────────────────────────────────────────────

  it('classifies "Reentrancy" → REENTRANCY', () => {
    expect(classifyAttackVector('Reentrancy')).toBe(AttackVector.REENTRANCY);
  });

  it('classifies "Flash Loan Attack" → FLASH_LOAN', () => {
    expect(classifyAttackVector('Flash Loan Attack')).toBe(AttackVector.FLASH_LOAN);
  });

  it('classifies "Oracle Manipulation" → ORACLE_MANIPULATION', () => {
    expect(classifyAttackVector('Oracle Manipulation')).toBe(AttackVector.ORACLE_MANIPULATION);
  });

  it('classifies "Access Control" → ACCESS_CONTROL', () => {
    expect(classifyAttackVector('Access Control')).toBe(AttackVector.ACCESS_CONTROL);
  });

  it('classifies "Rug Pull" → RUG_PULL', () => {
    expect(classifyAttackVector('Rug Pull')).toBe(AttackVector.RUG_PULL);
  });

  it('classifies "Governance Attack" → DAO_GOVERNANCE', () => {
    expect(classifyAttackVector('Governance Attack')).toBe(AttackVector.DAO_GOVERNANCE);
  });

  it('classifies "Phishing Campaign" → PHISHING', () => {
    expect(classifyAttackVector('Phishing Campaign')).toBe(AttackVector.PHISHING);
  });

  it('classifies "Sandwich Attack" → FRONTRUNNING', () => {
    expect(classifyAttackVector('Sandwich Attack')).toBe(AttackVector.FRONTRUNNING);
  });

  it('classifies "Private Key Compromised" → ACCESS_CONTROL', () => {
    expect(classifyAttackVector('Private Key Compromised')).toBe(AttackVector.ACCESS_CONTROL);
  });

  it('classifies "Delegatecall Vulnerability" → DELEGATECALL_INJECTION', () => {
    expect(classifyAttackVector('Delegatecall Vulnerability')).toBe(
      AttackVector.DELEGATECALL_INJECTION,
    );
  });

  // ── Case Insensitivity ────────────────────────────────────────────────────

  it('is case-insensitive ("REENTRANCY" → REENTRANCY)', () => {
    expect(classifyAttackVector('REENTRANCY')).toBe(AttackVector.REENTRANCY);
  });

  it('handles mixed case ("Flash LOAN" → FLASH_LOAN)', () => {
    expect(classifyAttackVector('Flash LOAN')).toBe(AttackVector.FLASH_LOAN);
  });

  // ── Bridge Hack Override ──────────────────────────────────────────────────

  it('bridgeHack=true overrides to BRIDGE_EXPLOIT', () => {
    expect(classifyAttackVector('Flash Loan Attack', true)).toBe(AttackVector.BRIDGE_EXPLOIT);
  });

  it('bridgeHack=true overrides even with empty technique', () => {
    expect(classifyAttackVector('', true)).toBe(AttackVector.BRIDGE_EXPLOIT);
  });

  // ── Fallback ──────────────────────────────────────────────────────────────

  it('falls back to OTHER for unrecognized technique', () => {
    expect(classifyAttackVector('Some Unknown Attack Method')).toBe(AttackVector.OTHER);
  });

  it('falls back to OTHER for empty string', () => {
    expect(classifyAttackVector('')).toBe(AttackVector.OTHER);
  });

  it('falls back to OTHER for whitespace-only string', () => {
    expect(classifyAttackVector('   ')).toBe(AttackVector.OTHER);
  });

  // ── Multi-keyword Descriptions ────────────────────────────────────────────

  it('handles compound technique "Oracle Manipulation & Price Manipulation"', () => {
    const result = classifyAttackVector('Oracle Manipulation & Price Manipulation');
    expect(result).toBe(AttackVector.ORACLE_MANIPULATION);
  });

  it('classifies "Read-only Reentrancy" → REENTRANCY', () => {
    expect(classifyAttackVector('Read-only Reentrancy')).toBe(AttackVector.REENTRANCY);
  });
});

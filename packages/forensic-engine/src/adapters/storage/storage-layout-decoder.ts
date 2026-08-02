/**
 * @module storage-layout-decoder
 * @description Decodes and derives EVM storage slots using known layout rules.
 *
 * Provides utilities to derive mapping slots (keccak256), decode packed
 * variables, and format raw 32-byte hex values into human-readable strings.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-004
 */

import { AbiCoder, keccak256, toBeHex, zeroPadValue } from 'ethers';

// ═══════════════════════════════════════════════════════════════════════════════
// StorageLayoutDecoder
// ═══════════════════════════════════════════════════════════════════════════════

export class StorageLayoutDecoder {
  private readonly coder = new AbiCoder();

  /**
   * Derives the storage slot for a mapping key using the standard Solidity
   * mapping layout: `keccak256(abi.encode(key, baseSlot))`
   *
   * @param keyAddress - The mapping key (typically an address, e.g. token holder)
   * @param baseSlot - The integer slot number of the mapping itself
   * @returns The 32-byte hex slot location
   */
  deriveMappingSlot(keyAddress: string, baseSlot: number): string {
    // Left-pad address and baseSlot to 32 bytes each, concatenate, then hash
    const encoded = this.coder.encode(['address', 'uint256'], [keyAddress, baseSlot]);
    return keccak256(encoded);
  }

  /**
   * Decodes a raw 32-byte hex string into a human-readable format.
   * Assumes the value represents a standard ERC-20 balance (uint256).
   *
   * @param rawHex - The 32-byte hex string from eth_getStorageAt
   * @param decimals - Token decimals (defaults to 18)
   * @param symbol - Token symbol (defaults to 'TOKENS')
   * @returns Human readable string (e.g. "1000.5 USDC")
   */
  decodeUint256Balance(rawHex: string, decimals = 18, symbol = 'TOKENS'): string {
    // Normalize "0x" edge cases
    if (rawHex === '0x' || rawHex === '0x0') {
      return `0 ${symbol}`;
    }

    try {
      const value = BigInt(rawHex);

      // Handle 0 cleanly
      if (value === 0n) {
        return `0 ${symbol}`;
      }

      // Convert to decimal representation
      const divisor = 10n ** BigInt(decimals);
      const integerPart = value / divisor;
      const fractionalPart = value % divisor;

      if (fractionalPart === 0n) {
        return `${integerPart.toString()} ${symbol}`;
      }

      // Pad fractional part with leading zeros
      let fracStr = fractionalPart.toString().padStart(decimals, '0');
      // Trim trailing zeros from fractional part
      fracStr = fracStr.replace(/0+$/, '');

      return `${integerPart.toString()}.${fracStr} ${symbol}`;
    } catch {
      return `Invalid ${symbol} value`;
    }
  }

  /**
   * Interprets the difference between two balance strings.
   *
   * @param valueBefore - Raw hex string before
   * @param valueAfter - Raw hex string after
   * @param label - What this balance represents (e.g. "Attacker balance")
   * @param decimals - Token decimals
   * @param symbol - Token symbol
   * @returns Contextual interpretation string
   */
  interpretBalanceChange(
    valueBefore: string,
    valueAfter: string,
    label: string,
    decimals = 18,
    symbol = 'TOKENS',
  ): string {
    const before = this.safeBigInt(valueBefore);
    const after = this.safeBigInt(valueAfter);

    if (before === after) {
      return `${label} remained unchanged`;
    }

    if (after > before) {
      const diffHex = zeroPadValue(toBeHex(after - before), 32);
      const formattedDiff = this.decodeUint256Balance(diffHex, decimals, symbol);
      return `${label} increased by ${formattedDiff}`;
    } else {
      const diffHex = zeroPadValue(toBeHex(before - after), 32);
      const formattedDiff = this.decodeUint256Balance(diffHex, decimals, symbol);
      return `${label} decreased by ${formattedDiff}`;
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private safeBigInt(hex: string): bigint {
    if (hex === '0x' || hex === '0x0') return 0n;
    try {
      return BigInt(hex);
    } catch {
      return 0n;
    }
  }
}

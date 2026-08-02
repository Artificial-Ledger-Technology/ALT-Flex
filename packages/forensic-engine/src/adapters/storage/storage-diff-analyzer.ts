/**
 * @module storage-diff-analyzer
 * @description Core engine for extracting pre- and post-exploit state diffs.
 *
 * Compares contract storage at two specific block heights using eth_getStorageAt.
 * Integrates discovery (finding which slots to check) and decoding (translating
 * raw hex to human-readable balance changes).
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-004
 */

import { Chain, type IRpcPort } from '@aegis/core';
import type {
  StorageDiff,
  StorageChange,
  StorageSlotRequirement,
} from '../../domain/storage-types.js';
import { StorageLayoutDecoder } from './storage-layout-decoder.js';

// ═══════════════════════════════════════════════════════════════════════════════
// StorageDiffAnalyzer
// ═══════════════════════════════════════════════════════════════════════════════

export class StorageDiffAnalyzer {
  constructor(
    private readonly rpcPort: IRpcPort,
    private readonly decoder: StorageLayoutDecoder,
  ) {}

  /**
   * Analyze storage differences for a specific contract between two blocks.
   *
   * @param chain - Blockchain network
   * @param contractAddress - Target contract to inspect
   * @param blockBefore - Block number before the transaction/attack
   * @param blockAfter - Block number after the transaction/attack
   * @param slotsToCheck - Specific slots discovered via events or explicit request
   * @param contractName - Optional human readable name for the contract
   * @returns Complete StorageDiff containing only slots that mutated
   */
  async analyze(
    chain: Chain,
    contractAddress: string,
    blockBefore: number,
    blockAfter: number,
    slotsToCheck: readonly StorageSlotRequirement[],
    contractName?: string,
  ): Promise<StorageDiff> {
    const changes: StorageChange[] = [];

    // Deduplicate slots to prevent redundant RPC calls
    const uniqueSlots = new Map<string, StorageSlotRequirement>();
    for (const req of slotsToCheck) {
      if (!uniqueSlots.has(req.slot)) {
        uniqueSlots.set(req.slot, req);
      }
    }

    // Query pre and post state for all required slots
    for (const [slot, req] of uniqueSlots) {
      const valueBefore = await this.rpcPort.getStorageAt(
        chain,
        contractAddress,
        slot,
        blockBefore,
      );

      const valueAfter = await this.rpcPort.getStorageAt(chain, contractAddress, slot, blockAfter);

      // Only record actual mutations
      if (valueBefore !== valueAfter) {
        changes.push(this.buildStorageChange(req, valueBefore, valueAfter));
      }
    }

    return {
      contractAddress,
      ...(contractName !== undefined ? { contractName } : {}),
      changes,
      summary: this.generateSummary(changes),
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Translates raw values into a rich StorageChange object.
   */
  private buildStorageChange(
    req: StorageSlotRequirement,
    valueBefore: string,
    valueAfter: string,
  ): StorageChange {
    let decodedBefore: string | undefined = undefined;
    let decodedAfter: string | undefined = undefined;
    let interpretation = `Raw slot ${req.slot.slice(0, 10)}... mutated`;

    if (req.layout === 'mapping' && req.label !== undefined && req.label.startsWith('balanceOf')) {
      decodedBefore = this.decoder.decodeUint256Balance(valueBefore);
      decodedAfter = this.decoder.decodeUint256Balance(valueAfter);
      interpretation = this.decoder.interpretBalanceChange(valueBefore, valueAfter, req.label);
    } else {
      // Fallback for simple or unknown layouts
      interpretation =
        req.label !== undefined
          ? `${req.label} changed from ${this.truncateHex(valueBefore)} to ${this.truncateHex(valueAfter)}`
          : interpretation;
    }

    return {
      slot: req.slot,
      ...(req.label !== undefined ? { label: req.label } : {}),
      valueBefore,
      valueAfter,
      ...(decodedBefore !== undefined ? { decodedBefore } : {}),
      ...(decodedAfter !== undefined ? { decodedAfter } : {}),
      interpretation,
    };
  }

  /**
   * Generates a high-level summary string based on the aggregated changes.
   */
  private generateSummary(changes: readonly StorageChange[]): string {
    if (changes.length === 0) {
      return 'No storage changes detected.';
    }

    const balancesMutated = changes.filter((c) => c.label?.includes('balanceOf')).length;

    if (balancesMutated > 0) {
      return `${balancesMutated} balance slot(s) mutated during execution.`;
    }

    return `${changes.length} storage slot(s) mutated during execution.`;
  }

  private truncateHex(hex: string): string {
    if (hex === '0x' || hex === '0x0') return '0x0';
    // Remove leading zeros for simple hex values if it's very long
    const clean = hex.replace(/^0x0+/, '0x');
    if (clean.length > 18) {
      return `${clean.slice(0, 10)}...${clean.slice(-8)}`;
    }
    return clean;
  }
}

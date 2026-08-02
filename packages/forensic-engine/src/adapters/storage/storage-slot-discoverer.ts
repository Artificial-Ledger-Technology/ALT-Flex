/**
 * @module storage-slot-discoverer
 * @description Auto-discovers relevant storage slots to diff based on
 * transaction events and known contract layouts.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-004
 */

import { getAddress } from 'ethers';
import { KNOWN_BALANCE_SLOTS, type StorageSlotRequirement } from '../../domain/storage-types.js';
import type { TraceDecodedEvent } from '../../domain/index.js';
import { StorageLayoutDecoder } from './storage-layout-decoder.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Common ERC-20 Transfer event signature */
const TRANSFER_SIGNATURE = 'Transfer(address,address,uint256)';

// ═══════════════════════════════════════════════════════════════════════════════
// StorageSlotDiscoverer
// ═══════════════════════════════════════════════════════════════════════════════

export class StorageSlotDiscoverer {
  constructor(private readonly decoder: StorageLayoutDecoder) {}

  /**
   * Discover candidate storage slots to diff by parsing decoded events.
   * If a Transfer is seen, it predicts the likely balanceOf mapping slots
   * for the sender and receiver across common slot bases.
   *
   * @param events - The decoded events emitted during the transaction
   * @param targetContract - (Optional) Filter discoveries to a specific contract
   * @returns Array of unique storage slot requirements
   */
  discoverFromEvents(
    events: readonly TraceDecodedEvent[],
    targetContract?: string,
  ): readonly StorageSlotRequirement[] {
    const discovered = new Map<string, StorageSlotRequirement>();
    const filterAddr = targetContract !== undefined ? targetContract.toLowerCase() : undefined;

    for (const event of events) {
      if (filterAddr !== undefined && event.address.toLowerCase() !== filterAddr) {
        continue;
      }

      if (event.signature === TRANSFER_SIGNATURE && event.topics.length >= 3) {
        // Topics: [0] = Hash, [1] = From, [2] = To
        const fromHex = event.topics[1]!;
        const toHex = event.topics[2]!;

        // Format raw topic to standard checksum address for labeling
        const fromAddr = this.tryFormatAddress(fromHex);
        const toAddr = this.tryFormatAddress(toHex);

        // Derive for all known balance slot bases (0, 1, 2, 3)
        for (const base of KNOWN_BALANCE_SLOTS) {
          if (
            fromAddr !== '0x0000000000000000000000000000000000000000' &&
            fromAddr !== '0xUnknown'
          ) {
            const fromSlot = this.decoder.deriveMappingSlot(fromAddr, base);
            discovered.set(fromSlot, {
              slot: fromSlot,
              layout: 'mapping',
              label: `balanceOf[${fromAddr}] (Base ${base})`,
            });
          }

          if (toAddr !== '0x0000000000000000000000000000000000000000' && toAddr !== '0xUnknown') {
            const toSlot = this.decoder.deriveMappingSlot(toAddr, base);
            discovered.set(toSlot, {
              slot: toSlot,
              layout: 'mapping',
              label: `balanceOf[${toAddr}] (Base ${base})`,
            });
          }
        }
      }
    }

    return Array.from(discovered.values());
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Convert a 32-byte event topic into a standard checksummed EVM address.
   */
  private tryFormatAddress(topicHex: string): string {
    try {
      // EVM addresses in topics are zero-padded to 32 bytes (64 chars)
      // Extract the last 40 chars (20 bytes)
      const cleanHex = topicHex.startsWith('0x') ? topicHex.slice(2) : topicHex;
      const addrHex = `0x${cleanHex.slice(-40)}`;
      return getAddress(addrHex);
    } catch {
      return '0xUnknown';
    }
  }
}

/**
 * @module @aegis/forensic-engine/adapters/storage
 *
 * Storage difference analysis adapter. Computes pre- and post-exploit
 * state mutations by deriving EVM storage slots and querying eth_getStorageAt.
 *
 * @hexagonal Adapter Layer — Engine γ (Driven/Secondary)
 * @task P5-EVM-004
 */

export { StorageDiffAnalyzer } from './storage-diff-analyzer.js';
export { StorageLayoutDecoder } from './storage-layout-decoder.js';
export { StorageSlotDiscoverer } from './storage-slot-discoverer.js';

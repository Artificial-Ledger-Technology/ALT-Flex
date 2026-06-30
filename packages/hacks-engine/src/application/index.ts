/**
 * @module @aegis/hacks-engine/application
 *
 * Application layer (use cases) for the Hacks Engine.
 * Orchestrates domain operations via typed ports for:
 * - Hack search with advanced filtering
 * - Dashboard statistics computation
 * - ETL sync coordination
 *
 * @hexagonal Application Layer — Engine α
 */

export { SyncHacksUseCase } from './sync-hacks.use-case.js';
export type { SyncResult, SyncHacksOptions, HackNormalizerPort } from './sync-hacks.use-case.js';

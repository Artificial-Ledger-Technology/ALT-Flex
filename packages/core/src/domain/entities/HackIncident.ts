/**
 * @module HackIncident
 * @description Core domain entity representing a single DeFi exploit incident.
 *
 * Sourced from:
 * - DefiLlama Hacks API (financial macro data: TVL loss, date, protocol)
 * - SunWeb3Sec/DeFiHackLabs (granular: Foundry POC, root-cause vulnerability)
 *
 * This entity is the primary aggregate in Engine α (Hacks Dashboard).
 * It is framework-agnostic — no ORM decorators, no database coupling.
 *
 * @hexagonal Entity — Domain Layer
 * @academic Central to Thesis 1 (Pattern Classification) and
 *           Thesis 2 (Foundry-based simulation).
 */

import { z } from 'zod';
import { AttackVector, AttackVectorSchema } from '../value-objects/AttackVector.js';
import { Chain, ChainSchema } from '../value-objects/Chain.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-schemas (Composable building blocks)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Data source origin for ETL traceability.
 * Each incident tracks where it was sourced from for deduplication
 * and data quality auditing.
 */
export const DataSourceSchema = z.enum([
  'defillama',
  'defihacklabs',
  'manual',
  'rekt-news',
]);
export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * Transaction hash with optional chain context.
 * Supports both EVM (0x-prefixed) and non-EVM transaction identifiers.
 */
export const TransactionReferenceSchema = z.object({
  /** Transaction hash (0x-prefixed for EVM, base58 for Solana, etc.) */
  hash: z.string().min(1),
  /** Chain this transaction occurred on (may differ from incident chain for bridge exploits) */
  chain: ChainSchema,
  /** Label for this transaction (e.g., "Attack TX", "Exploit Preparation", "Funds Drain") */
  label: z.string().default(''),
});
export type TransactionReference = z.infer<typeof TransactionReferenceSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// HackIncident Entity Schema
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HackIncident — The primary domain entity for the Hacks Dashboard engine.
 *
 * Design Decisions:
 * 1. UUID v4 identifiers (not auto-increment) for distributed data ingestion
 * 2. All monetary values in USD (not native token) for cross-chain comparison
 * 3. `txHashes` as structured objects with chain context (not plain strings)
 *    to support multi-chain bridge exploits where txs span multiple chains
 * 4. Multiple attack vectors supported (some exploits chain multiple techniques)
 * 5. `dataSource` and `lastSyncedAt` enable ETL provenance tracking
 * 6. `fundsReturned` supports incidents where white-hat negotiation recovered funds
 *
 * @invariant lossUsd >= 0
 * @invariant fundsReturned >= 0
 * @invariant fundsReturned <= lossUsd (enforced via refinement)
 * @invariant attackVectors.length >= 1 (at least one vector must be classified)
 */
export const HackIncidentSchema = z
  .object({
    // ── Identity ──────────────────────────────────────────────────────────────
    /** Unique identifier (UUID v4) */
    id: z.string().uuid(),

    // ── Core Incident Data ────────────────────────────────────────────────────
    /** Protocol name (e.g., "Euler Finance", "Curve Lend") */
    protocolName: z.string().min(1),

    /** Protocol slug for URL-safe referencing */
    protocolSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),

    /** Date of the exploit (UTC) */
    date: z.coerce.date(),

    /** Primary blockchain where the exploit occurred */
    chain: ChainSchema,

    /** Primary attack vector classification */
    attackVector: AttackVectorSchema,

    /**
     * Additional attack vectors (for multi-technique exploits).
     * Example: Flash Loan + Oracle Manipulation combo
     */
    secondaryVectors: z.array(AttackVectorSchema).default([]),

    /** Total value lost in USD (at time of exploit) */
    lossUsd: z.number().nonnegative(),

    /** Funds recovered through negotiation, white-hat, or law enforcement */
    fundsReturned: z.number().nonnegative().default(0),

    // ── Transaction Evidence ──────────────────────────────────────────────────
    /**
     * Raw transaction hashes (simple string array for backward compat with DefiLlama).
     * For new data, prefer `transactionRefs` with full chain context.
     */
    txHashes: z.array(z.string()).default([]),

    /**
     * Structured transaction references with chain context and labels.
     * Richer than `txHashes` — used for multi-chain exploits.
     */
    transactionRefs: z.array(TransactionReferenceSchema).default([]),

    // ── References & Sources ──────────────────────────────────────────────────
    /** Reference URLs (blog posts, Twitter/X threads, audit reports) */
    sources: z.array(z.string().url()).default([]),

    /** Brief description of the vulnerability and exploit mechanics */
    description: z.string().default(''),

    /** Detailed post-mortem analysis (Markdown) */
    postMortem: z.string().optional(),

    // ── Foundry / POC Integration ─────────────────────────────────────────────
    /** Whether a Foundry POC exists in DeFiHackLabs or our repo */
    hasFoundryPoc: z.boolean().default(false),

    /** Path to Foundry test file (relative to DeFiHackLabs repo) */
    foundryTestPath: z.string().optional(),

    /** Target contract address(es) involved in the exploit */
    targetContracts: z.array(z.string()).default([]),

    // ── Protocol Metadata ─────────────────────────────────────────────────────
    /** Protocol category (e.g., "Lending", "DEX", "Bridge", "Yield") */
    protocolCategory: z.string().optional(),

    /** Protocol TVL at time of exploit (contextualizes impact) */
    protocolTvlAtExploit: z.number().nonnegative().optional(),

    /** Whether the protocol was audited before the exploit */
    wasAudited: z.boolean().optional(),

    /** Audit firms involved (e.g., ["Trail of Bits", "OpenZeppelin"]) */
    auditFirms: z.array(z.string()).default([]),

    // ── ETL Metadata ──────────────────────────────────────────────────────────
    /** Data source origin for ETL provenance */
    dataSource: DataSourceSchema,

    /** Last time this record was synced from external source */
    lastSyncedAt: z.coerce.date(),

    /** When this record was first created in AEGIS */
    createdAt: z.coerce.date(),

    /** When this record was last updated in AEGIS */
    updatedAt: z.coerce.date(),
  })
  .refine((data) => data.fundsReturned <= data.lossUsd, {
    message: 'fundsReturned cannot exceed lossUsd',
    path: ['fundsReturned'],
  });

export type HackIncident = z.infer<typeof HackIncidentSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input type for creating a new HackIncident.
 * Omits auto-generated fields (id, timestamps).
 */
export type CreateHackIncidentInput = Omit<
  z.input<typeof HackIncidentSchema>,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Input type for updating an existing HackIncident.
 * All fields are optional except `id`.
 */
export type UpdateHackIncidentInput = Partial<
  Omit<z.input<typeof HackIncidentSchema>, 'id' | 'createdAt'>
> & {
  id: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Computed Properties
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the net loss after fund recovery.
 */
export function getNetLoss(incident: HackIncident): number {
  return incident.lossUsd - incident.fundsReturned;
}

/**
 * Calculate the fund recovery percentage.
 */
export function getRecoveryRate(incident: HackIncident): number {
  if (incident.lossUsd === 0) return 0;
  return (incident.fundsReturned / incident.lossUsd) * 100;
}

/**
 * Get all attack vectors (primary + secondary) for an incident.
 */
export function getAllAttackVectorsForIncident(
  incident: HackIncident,
): AttackVector[] {
  const vectors = new Set<AttackVector>([
    incident.attackVector,
    ...incident.secondaryVectors,
  ]);
  return [...vectors];
}

/**
 * Determine if an incident has a large impact (> $1M USD loss).
 */
export function isHighImpact(incident: HackIncident): boolean {
  return incident.lossUsd >= 1_000_000;
}

/**
 * Determine if an incident has been fully recovered.
 */
export function isFullyRecovered(incident: HackIncident): boolean {
  return incident.fundsReturned >= incident.lossUsd && incident.lossUsd > 0;
}

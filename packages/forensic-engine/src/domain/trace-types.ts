/**
 * @module trace-types
 * @description Engine-specific domain types for EVM transaction trace analysis.
 *
 * Models the hierarchical call tree extracted from `debug_traceTransaction`,
 * with decoded function calls, gas breakdowns, value flow analysis,
 * and exploit pattern detection metadata.
 *
 * @hexagonal Domain Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-003
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Call Types
// ═══════════════════════════════════════════════════════════════════════════════

/** EVM call types observed in transaction traces. */
export type CallType =
  | 'CALL'
  | 'STATICCALL'
  | 'DELEGATECALL'
  | 'CREATE'
  | 'CREATE2'
  | 'SELFDESTRUCT';

// ═══════════════════════════════════════════════════════════════════════════════
// Decoded Call Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DecodedArg — A single decoded function argument.
 */
export interface DecodedArg {
  /** Parameter name (if known from ABI, e.g., "recipient") */
  readonly name: string;

  /** Solidity type (e.g., "address", "uint256") */
  readonly type: string;

  /** Decoded value as string representation */
  readonly value: string;
}

/**
 * DecodedCall — Decoded function signature, selector, name, and arguments.
 *
 * Populated when the 4-byte selector is successfully resolved
 * via the SelectorResolver (4byte.directory or preloaded cache).
 */
export interface DecodedCall {
  /** Full function signature (e.g., "transfer(address,uint256)") */
  readonly signature: string;

  /** 4-byte selector hex (e.g., "0xa9059cbb") */
  readonly selector: string;

  /** Function name only (e.g., "transfer") */
  readonly name: string;

  /** Decoded arguments (empty if ABI unavailable) */
  readonly args: readonly DecodedArg[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Call Tree Node
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CallTreeNode — A single node in the hierarchical EVM call tree.
 *
 * Represents one internal call (CALL, STATICCALL, DELEGATECALL, CREATE, etc.)
 * within a transaction. Nodes form a tree via the `children` array.
 */
export interface CallTreeNode {
  /** Unique node ID (deterministic: "{depth}-{index}") */
  readonly id: string;

  /** Call depth in the tree (0 = top-level external call) */
  readonly depth: number;

  /** EVM call type */
  readonly type: CallType;

  /** Caller address (checksummed hex) */
  readonly from: string;

  /** Callee address (checksummed hex) */
  readonly to: string;

  /** ETH value transferred in wei */
  readonly value: bigint;

  /** Gas consumed by this call (including sub-calls) */
  readonly gasUsed: bigint;

  /** Raw calldata hex */
  readonly input: string;

  /** Raw return data hex */
  readonly output: string;

  /** Decoded function call (populated when selector is resolved) */
  readonly decodedCall?: DecodedCall;

  /** Revert reason or error message if the call failed */
  readonly error?: string;

  /** Nested sub-calls made by this call */
  readonly children: readonly CallTreeNode[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gas & Value Analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GasBreakdown — Gas consumption aggregated per contract address.
 */
export interface GasBreakdown {
  /** Contract address → total gas used by that contract */
  readonly byContract: ReadonlyMap<string, bigint>;

  /** Total gas across all contracts */
  readonly totalGas: bigint;
}

/**
 * ValueFlowEntry — A single ETH value transfer between addresses.
 */
export interface ValueFlowEntry {
  /** Sender address */
  readonly from: string;

  /** Recipient address */
  readonly to: string;

  /** ETH value in wei */
  readonly value: bigint;

  /** Call type that caused the transfer */
  readonly callType: CallType;

  /** Depth in the call tree where this transfer occurred */
  readonly depth: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pattern Detection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ReentrancyMatch — Evidence of a potential reentrancy pattern.
 */
export interface ReentrancyMatch {
  /** The contract address that was called recursively */
  readonly targetAddress: string;

  /** Depths at which the address was called */
  readonly depths: readonly number[];

  /** Node IDs involved in the reentrancy chain */
  readonly nodeIds: readonly string[];
}

/**
 * DelegateCallMatch — Evidence of a delegate call pattern.
 */
export interface DelegateCallMatch {
  /** The proxy contract address */
  readonly proxyAddress: string;

  /** The implementation contract address */
  readonly implementationAddress: string;

  /** Node ID of the DELEGATECALL */
  readonly nodeId: string;
}

/**
 * CallCategory — Categorization tags for identified call types.
 */
export type CallCategory =
  | 'flash_loan'
  | 'token_transfer'
  | 'oracle_read'
  | 'admin_call'
  | 'swap'
  | 'approval'
  | 'unknown';

/**
 * CategorizedCall — A call tree node tagged with a category.
 */
export interface CategorizedCall {
  /** Node ID of the categorized call */
  readonly nodeId: string;

  /** Detected category */
  readonly category: CallCategory;

  /** The decoded function name that triggered this categorization */
  readonly functionName: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Trace Summary
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TraceSummary — Human-readable summary of the transaction trace analysis.
 */
export interface TraceSummary {
  /** Total number of internal calls in the trace */
  readonly totalCalls: number;

  /** Number of unique contract addresses involved */
  readonly uniqueContracts: number;

  /** Maximum call depth reached */
  readonly maxDepth: number;

  /** Whether reentrancy patterns were detected */
  readonly hasReentrancy: boolean;

  /** Whether delegate call patterns were detected */
  readonly hasDelegateCalls: boolean;

  /** Number of ETH value transfers */
  readonly valueTransfers: number;

  /** Total ETH transferred (in wei) */
  readonly totalValueTransferred: bigint;

  /** Reentrancy evidence (if detected) */
  readonly reentrancyMatches: readonly ReentrancyMatch[];

  /** Delegate call evidence (if detected) */
  readonly delegateCallMatches: readonly DelegateCallMatch[];

  /** Categorized notable calls */
  readonly categorizedCalls: readonly CategorizedCall[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Top-Level Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TransactionTraceResult — Complete output from the TransactionTraceAnalyzer.
 *
 * Contains the full call tree, decoded events, gas breakdown,
 * and pattern detection summary.
 */
export interface TransactionTraceResult {
  /** The transaction hash that was traced */
  readonly txHash: string;

  /** The chain the transaction was executed on */
  readonly chain: string;

  /** Root of the hierarchical call tree */
  readonly callTree: CallTreeNode;

  /** Decoded events emitted during the transaction */
  readonly events: readonly DecodedEvent[];

  /** Gas consumption breakdown by contract */
  readonly gasBreakdown: GasBreakdown;

  /** ETH value flow between addresses */
  readonly valueFlow: readonly ValueFlowEntry[];

  /** Human-readable analysis summary with pattern detection */
  readonly summary: TraceSummary;
}

/**
 * DecodedEvent — A decoded event log from the transaction.
 *
 * Reuses the same shape as @aegis/core's DecodedEvent but
 * is defined here for the trace analyzer's internal use.
 */
export interface DecodedEvent {
  /** Contract address that emitted the event */
  readonly address: string;

  /** Event name (e.g., "Transfer") */
  readonly name: string;

  /** Event signature (e.g., "Transfer(address,address,uint256)") */
  readonly signature: string;

  /** Raw topics */
  readonly topics: readonly string[];

  /** Raw data hex */
  readonly data: string;

  /** Log index within the transaction */
  readonly logIndex: number;

  /** Decoded parameters (null if ABI unavailable) */
  readonly decoded: Record<string, unknown> | null;
}

/**
 * @module trace-errors
 * @description Custom error classes for the Transaction Trace Analyzer adapter.
 *
 * Each error class represents a distinct failure mode in the trace
 * analysis pipeline. All extend Error with descriptive names and
 * structured context for upstream error handling.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-003
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Trace Retrieval Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when `debug_traceTransaction` is unavailable or the transaction
 * cannot be found. Common causes: non-archive node, invalid tx hash,
 * or RPC endpoint doesn't support the debug namespace.
 */
export class TraceNotAvailableError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly chain: string,
    cause?: unknown,
  ) {
    super(
      `Transaction trace not available for ${txHash} on ${chain}. ` +
        `Ensure the RPC endpoint supports debug_traceTransaction (archive node required).`,
    );
    this.name = 'TraceNotAvailableError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Trace Size Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when a transaction trace exceeds the maximum allowed node count.
 * Default limit: 50,000 nodes. Prevents memory exhaustion on
 * pathologically large transactions.
 */
export class TraceTooLargeError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly nodeCount: number,
    public readonly maxNodes: number,
  ) {
    super(
      `Transaction trace for ${txHash} is too large: ` +
        `${nodeCount} nodes (max: ${maxNodes}). ` +
        `Consider analyzing a subset of the call tree.`,
    );
    this.name = 'TraceTooLargeError';
  }
}

/**
 * Thrown when a transaction trace exceeds the maximum allowed call depth.
 * Default limit: 500. Prevents stack overflow during tree traversal.
 */
export class TraceDepthExceededError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly maxDepth: number,
  ) {
    super(
      `Transaction trace for ${txHash} exceeds maximum call depth of ${maxDepth}. ` +
        `This may indicate an extremely recursive or malicious transaction.`,
    );
    this.name = 'TraceDepthExceededError';
  }
}

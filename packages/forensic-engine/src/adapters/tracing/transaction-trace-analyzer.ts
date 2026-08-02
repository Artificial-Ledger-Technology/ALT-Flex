/**
 * @module transaction-trace-analyzer
 * @description Extracts and analyzes the internal call tree of on-chain
 * transactions using `debug_traceTransaction`.
 *
 * Core forensic capability for post-mortem analysis of exploit execution:
 * - Builds hierarchical CallTree from RPC trace data
 * - Decodes function selectors via SelectorResolver
 * - Detects reentrancy, delegate call, and flash loan patterns
 * - Computes gas breakdown and value flow summaries
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-003
 */

import { Chain, type IRpcPort, type RpcTraceResult } from '@aegis/core';
import type {
  CallType,
  CallTreeNode,
  DecodedCall,
  TransactionTraceResult,
  GasBreakdown,
  ValueFlowEntry,
  TraceSummary,
  ReentrancyMatch,
  DelegateCallMatch,
  CategorizedCall,
  CallCategory,
} from '../../domain/trace-types.js';
import { SelectorResolver } from './selector-resolver.js';
import { TraceNotAvailableError, TraceTooLargeError } from './trace-errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum number of nodes allowed in a trace tree. */
const MAX_NODES = 50_000;

/** Maximum call depth allowed. */
const MAX_DEPTH = 500;

/** Valid EVM call types. */
const VALID_CALL_TYPES: ReadonlySet<string> = new Set([
  'CALL',
  'STATICCALL',
  'DELEGATECALL',
  'CREATE',
  'CREATE2',
  'SELFDESTRUCT',
]);

/** Function names that indicate flash loan calls. */
const FLASH_LOAN_NAMES: ReadonlySet<string> = new Set([
  'flashLoan',
  'flashloan',
  'flash',
  'flashBorrow',
]);

/** Function names that indicate token transfers. */
const TRANSFER_NAMES: ReadonlySet<string> = new Set([
  'transfer',
  'transferFrom',
  'safeTransfer',
  'safeTransferFrom',
]);

/** Function names that indicate oracle reads. */
const ORACLE_NAMES: ReadonlySet<string> = new Set([
  'latestAnswer',
  'latestRoundData',
  'getRoundData',
  'getReserves',
  'getPrice',
  'price',
  'consult',
  'observe',
]);

/** Function names that indicate admin/governance calls. */
const ADMIN_NAMES: ReadonlySet<string> = new Set([
  'transferOwnership',
  'renounceOwnership',
  'pause',
  'unpause',
  'upgradeTo',
  'upgradeToAndCall',
  'setOwner',
  'grantRole',
  'revokeRole',
]);

/** Function names that indicate swap operations. */
const SWAP_NAMES: ReadonlySet<string> = new Set([
  'swap',
  'swapExactTokensForTokens',
  'swapTokensForExactTokens',
  'swapExactETHForTokens',
  'swapExactTokensForETH',
  'exactInputSingle',
  'exactInput',
  'exactOutputSingle',
]);

/** Function names that indicate approvals. */
const APPROVAL_NAMES: ReadonlySet<string> = new Set([
  'approve',
  'increaseAllowance',
  'decreaseAllowance',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TransactionTraceAnalyzer
// ═══════════════════════════════════════════════════════════════════════════════

export class TransactionTraceAnalyzer {
  constructor(
    private readonly rpcPort: IRpcPort,
    private readonly selectorResolver: SelectorResolver,
  ) {}

  /**
   * Analyze a transaction by tracing its execution and building
   * a rich call tree with decoded calls, gas breakdown, and pattern detection.
   *
   * @param chain - The blockchain network
   * @param txHash - The transaction hash to trace
   * @returns Complete TransactionTraceResult
   * @throws {TraceNotAvailableError} if the RPC cannot provide the trace
   * @throws {TraceTooLargeError} if the trace exceeds MAX_NODES
   */
  async analyze(chain: Chain, txHash: string): Promise<TransactionTraceResult> {
    // 1. Fetch raw trace from RPC
    let rawTrace: RpcTraceResult;
    try {
      rawTrace = await this.rpcPort.traceTransaction(chain, txHash);
    } catch (err) {
      throw new TraceNotAvailableError(txHash, chain, err);
    }

    // 2. Build hierarchical call tree
    let nodeCount = 0;
    const countingResult = this.countNodes(rawTrace);
    nodeCount = countingResult;
    if (nodeCount > MAX_NODES) {
      throw new TraceTooLargeError(txHash, nodeCount, MAX_NODES);
    }

    const callTree = this.buildCallTree(rawTrace, 0, { index: 0 });

    // 3. Decode function selectors across the tree
    await this.decodeSelectorsInTree(callTree);

    // 4. Compute analytics
    const gasBreakdown = this.computeGasBreakdown(callTree);
    const valueFlow = this.computeValueFlow(callTree);

    // 5. Detect patterns
    const reentrancyMatches = this.detectReentrancy(callTree);
    const delegateCallMatches = this.detectDelegateCalls(callTree);
    const categorizedCalls = this.identifyCallCategories(callTree);

    // 6. Generate summary
    const summary = this.generateSummary(
      callTree,
      reentrancyMatches,
      delegateCallMatches,
      categorizedCalls,
      valueFlow,
    );

    return {
      txHash,
      chain,
      callTree,
      events: [], // Events come from receipt logs — not from callTracer
      gasBreakdown,
      valueFlow,
      summary,
    };
  }

  // ── Tree Building ─────────────────────────────────────────────────────────

  /**
   * Build a CallTreeNode from an RpcTraceResult recursively.
   * Uses a shared counter for unique ID generation and enforces MAX_DEPTH.
   */
  buildCallTree(trace: RpcTraceResult, depth: number, counter: { index: number }): CallTreeNode {
    const nodeId = `${depth}-${counter.index}`;
    counter.index += 1;

    const callType = this.normalizeCallType(trace.type);
    const children: CallTreeNode[] = [];

    if (trace.calls !== undefined && depth < MAX_DEPTH) {
      for (const childTrace of trace.calls) {
        children.push(this.buildCallTree(childTrace, depth + 1, counter));
      }
    }

    // Extract 4-byte selector from input
    const selector = trace.input.length >= 10 ? trace.input.slice(0, 10) : undefined;
    const cachedSig = selector !== undefined ? this.selectorResolver.getCached(selector) : null;
    const decodedCall =
      cachedSig !== null && selector !== undefined
        ? this.buildDecodedCall(selector, cachedSig)
        : undefined;

    const nodeError = trace.error !== undefined ? trace.error : undefined;

    return {
      id: nodeId,
      depth,
      type: callType,
      from: trace.from,
      to: trace.to,
      value: this.toBigInt(trace.value),
      gasUsed: this.toBigInt(trace.gasUsed),
      input: trace.input,
      output: trace.output,
      ...(decodedCall !== undefined ? { decodedCall } : {}),
      ...(nodeError !== undefined ? { error: nodeError } : {}),
      children,
    };
  }

  // ── Selector Decoding ─────────────────────────────────────────────────────

  /**
   * Walk the call tree and resolve any unresolved function selectors
   * via the SelectorResolver (which may hit the 4byte.directory API).
   *
   * Returns a new tree with decoded calls populated where possible.
   * We collect unique selectors first, resolve them in batch, then
   * rebuild the tree — avoiding redundant API calls.
   */
  async decodeSelectorsInTree(root: CallTreeNode): Promise<CallTreeNode> {
    // Collect unique unresolved selectors
    const unresolvedSelectors = new Set<string>();
    this.collectUnresolvedSelectors(root, unresolvedSelectors);

    // Resolve all selectors (API calls happen here)
    const resolved = new Map<string, string>();
    for (const selector of unresolvedSelectors) {
      const sig = await this.selectorResolver.resolve(selector);
      if (sig !== null) {
        resolved.set(selector, sig);
      }
    }

    // If nothing new was resolved, return original tree
    if (resolved.size === 0) {
      return root;
    }

    // Rebuild tree with newly decoded calls
    return this.applyDecodedCalls(root, resolved);
  }

  // ── Pattern Detection ─────────────────────────────────────────────────────

  /**
   * Detect reentrancy patterns: same address called at multiple depths
   * within the same call chain.
   */
  detectReentrancy(root: CallTreeNode): readonly ReentrancyMatch[] {
    const addressDepths = new Map<string, { depths: number[]; nodeIds: string[] }>();
    this.collectAddressDepths(root, addressDepths);

    const matches: ReentrancyMatch[] = [];
    for (const [address, info] of addressDepths) {
      // Reentrancy = same address appears at more than one distinct depth
      const uniqueDepths = [...new Set(info.depths)];
      if (uniqueDepths.length > 1 && Math.max(...uniqueDepths) > 1) {
        matches.push({
          targetAddress: address,
          depths: uniqueDepths,
          nodeIds: info.nodeIds,
        });
      }
    }

    return matches;
  }

  /**
   * Detect delegate call patterns: DELEGATECALL type indicates
   * proxy → implementation forwarding.
   */
  detectDelegateCalls(root: CallTreeNode): readonly DelegateCallMatch[] {
    const matches: DelegateCallMatch[] = [];
    this.walkTree(root, (node) => {
      if (node.type === 'DELEGATECALL') {
        matches.push({
          proxyAddress: node.from,
          implementationAddress: node.to,
          nodeId: node.id,
        });
      }
    });
    return matches;
  }

  /**
   * Categorize notable calls based on decoded function names.
   */
  identifyCallCategories(root: CallTreeNode): readonly CategorizedCall[] {
    const categorized: CategorizedCall[] = [];
    this.walkTree(root, (node) => {
      if (node.decodedCall === undefined) return;

      const name = node.decodedCall.name;
      const category = this.categorizeFunction(name);

      if (category !== 'unknown') {
        categorized.push({
          nodeId: node.id,
          category,
          functionName: name,
        });
      }
    });
    return categorized;
  }

  // ── Gas & Value Analysis ──────────────────────────────────────────────────

  /**
   * Compute gas consumption aggregated by contract address.
   */
  computeGasBreakdown(root: CallTreeNode): GasBreakdown {
    const byContract = new Map<string, bigint>();
    let totalGas = 0n;

    this.walkTree(root, (node) => {
      const existing = byContract.get(node.to) ?? 0n;
      byContract.set(node.to, existing + node.gasUsed);
      totalGas += node.gasUsed;
    });

    return { byContract, totalGas };
  }

  /**
   * Extract ETH value transfers from the call tree.
   */
  computeValueFlow(root: CallTreeNode): readonly ValueFlowEntry[] {
    const flows: ValueFlowEntry[] = [];
    this.walkTree(root, (node) => {
      if (node.value > 0n) {
        flows.push({
          from: node.from,
          to: node.to,
          value: node.value,
          callType: node.type,
          depth: node.depth,
        });
      }
    });
    return flows;
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  /**
   * Generate a human-readable summary of the trace analysis.
   */
  generateSummary(
    root: CallTreeNode,
    reentrancyMatches: readonly ReentrancyMatch[],
    delegateCallMatches: readonly DelegateCallMatch[],
    categorizedCalls: readonly CategorizedCall[],
    valueFlow: readonly ValueFlowEntry[],
  ): TraceSummary {
    let totalCalls = 0;
    let maxDepth = 0;
    const uniqueContracts = new Set<string>();
    let totalValue = 0n;

    this.walkTree(root, (node) => {
      totalCalls += 1;
      if (node.depth > maxDepth) maxDepth = node.depth;
      uniqueContracts.add(node.to);
    });

    for (const flow of valueFlow) {
      totalValue += flow.value;
    }

    return {
      totalCalls,
      uniqueContracts: uniqueContracts.size,
      maxDepth,
      hasReentrancy: reentrancyMatches.length > 0,
      hasDelegateCalls: delegateCallMatches.length > 0,
      valueTransfers: valueFlow.length,
      totalValueTransferred: totalValue,
      reentrancyMatches,
      delegateCallMatches,
      categorizedCalls,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Count total nodes in a raw trace (before tree building).
   */
  private countNodes(trace: RpcTraceResult): number {
    let count = 1;
    if (trace.calls !== undefined) {
      for (const child of trace.calls) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  /**
   * Normalize RPC trace type string to our CallType union.
   */
  private normalizeCallType(rawType: string): CallType {
    const upper = rawType.toUpperCase();
    return VALID_CALL_TYPES.has(upper) ? (upper as CallType) : 'CALL';
  }

  /**
   * Build a DecodedCall from a selector and resolved signature.
   */
  private buildDecodedCall(selector: string, signature: string): DecodedCall {
    const parenIndex = signature.indexOf('(');
    const name = parenIndex > 0 ? signature.slice(0, parenIndex) : signature;

    return {
      signature,
      selector: selector.toLowerCase(),
      name,
      args: [], // Full arg decoding requires ABI — out of scope for selector-only resolution
    };
  }

  /**
   * Safely convert a hex string to BigInt.
   */
  private toBigInt(value: string): bigint {
    if (value === '' || value === '0x' || value === '0x0') return 0n;
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }

  /**
   * Walk the tree, calling the visitor on every node.
   */
  private walkTree(node: CallTreeNode, visitor: (node: CallTreeNode) => void): void {
    visitor(node);
    for (const child of node.children) {
      this.walkTree(child, visitor);
    }
  }

  /**
   * Collect all unique selectors from the tree that don't yet have decoded calls.
   */
  private collectUnresolvedSelectors(node: CallTreeNode, selectors: Set<string>): void {
    if (node.decodedCall === undefined && node.input.length >= 10) {
      selectors.add(node.input.slice(0, 10));
    }
    for (const child of node.children) {
      this.collectUnresolvedSelectors(child, selectors);
    }
  }

  /**
   * Apply newly resolved decoded calls to the tree (immutable rebuild).
   */
  private applyDecodedCalls(node: CallTreeNode, resolved: Map<string, string>): CallTreeNode {
    const selector = node.input.length >= 10 ? node.input.slice(0, 10) : undefined;
    const newSig = selector !== undefined ? resolved.get(selector) : undefined;

    const newDecodedCall =
      node.decodedCall !== undefined
        ? node.decodedCall
        : newSig !== undefined && selector !== undefined
          ? this.buildDecodedCall(selector, newSig)
          : undefined;

    const newChildren = node.children.map((child) => this.applyDecodedCalls(child, resolved));

    return {
      ...node,
      ...(newDecodedCall !== undefined ? { decodedCall: newDecodedCall } : {}),
      children: newChildren,
    };
  }

  /**
   * Collect address → depths mapping for reentrancy detection.
   */
  private collectAddressDepths(
    node: CallTreeNode,
    map: Map<string, { depths: number[]; nodeIds: string[] }>,
  ): void {
    const existing = map.get(node.to);
    if (existing !== undefined) {
      existing.depths.push(node.depth);
      existing.nodeIds.push(node.id);
    } else {
      map.set(node.to, { depths: [node.depth], nodeIds: [node.id] });
    }
    for (const child of node.children) {
      this.collectAddressDepths(child, map);
    }
  }

  /**
   * Categorize a function by its decoded name.
   */
  private categorizeFunction(name: string): CallCategory {
    if (FLASH_LOAN_NAMES.has(name)) return 'flash_loan';
    if (TRANSFER_NAMES.has(name)) return 'token_transfer';
    if (ORACLE_NAMES.has(name)) return 'oracle_read';
    if (ADMIN_NAMES.has(name)) return 'admin_call';
    if (SWAP_NAMES.has(name)) return 'swap';
    if (APPROVAL_NAMES.has(name)) return 'approval';
    return 'unknown';
  }
}

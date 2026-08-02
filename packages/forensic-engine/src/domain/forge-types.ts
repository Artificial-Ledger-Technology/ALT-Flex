/**
 * @module forge-types
 * @description Engine-specific domain types for Foundry forge execution results.
 *
 * These types model the structured output of `forge test` executions,
 * including test results, gas metrics, EVM traces, and event logs.
 * They are consumed by the FoundryService adapter and returned to
 * the application layer as SimulationResult.
 *
 * @hexagonal Domain Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Forge Trace Types
// ═══════════════════════════════════════════════════════════════════════════════

/** EVM call types observed in forge traces. */
export type ForgeCallType =
  | 'CALL'
  | 'STATICCALL'
  | 'DELEGATECALL'
  | 'CREATE'
  | 'CREATE2';

/**
 * ForgeTrace — A single internal call within a forge test execution.
 *
 * Extracted from `forge test -vvvv` verbose trace output.
 * Each trace represents one EVM CALL/STATICCALL/DELEGATECALL/CREATE
 * within the test execution, forming a hierarchical call tree.
 */
export interface ForgeTrace {
  /** Call depth (0 = entry point, >0 = nested calls) */
  readonly depth: number;

  /** EVM call type */
  readonly type: ForgeCallType;

  /** Caller address (checksummed hex) */
  readonly from: string;

  /** Callee address (checksummed hex) */
  readonly to: string;

  /** ETH value transferred in wei */
  readonly value: bigint;

  /** Gas consumed by this call */
  readonly gasUsed: bigint;

  /** Calldata (hex-encoded) */
  readonly input: string;

  /** Return data (hex-encoded) */
  readonly output: string;

  /** Revert reason if the call failed */
  readonly error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Forge Log Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ForgeLog — An event log emitted during a forge test execution.
 *
 * Represents a Solidity `emit` captured by forge's test runner.
 * Contains both raw and decoded event data when ABI is available.
 */
export interface ForgeLog {
  /** Contract address that emitted the event */
  readonly address: string;

  /** Event topics (topic[0] = event signature hash) */
  readonly topics: readonly string[];

  /** Non-indexed event data (hex-encoded) */
  readonly data: string;

  /** Decoded event name (if ABI available, e.g., "Transfer") */
  readonly decodedName?: string;

  /** Decoded event arguments (if ABI available) */
  readonly decodedArgs?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Forge Test Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ForgeTestResult — Parsed output from a single forge test execution.
 *
 * This is the raw parsed result from `forge test --json -vvvv`.
 * The FoundryService maps this to SimulationResult for consumers.
 */
export interface ForgeTestResult {
  /** Whether the test passed */
  readonly success: boolean;

  /** Failure reason if !success (e.g., "Assertion failed", revert message) */
  readonly reason?: string;

  /** Total gas consumed by the test */
  readonly gasUsed: bigint;

  /** Event logs emitted during the test */
  readonly logs: readonly ForgeLog[];

  /** Internal call traces (from -vvvv output) */
  readonly traces: readonly ForgeTrace[];

  /** Execution time in milliseconds */
  readonly duration: number;

  /** Test function name that was executed */
  readonly testName: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Foundry Project Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FoundryProjectConfig — Parameters for generating a temporary
 * Foundry project with the correct `foundry.toml` configuration.
 */
export interface FoundryProjectConfig {
  /** RPC URL for the forked chain */
  readonly forkUrl: string;

  /** Block number to fork from (pre-exploit) */
  readonly forkBlockNumber: number;

  /** Solidity compiler version (e.g., "0.8.17") */
  readonly solcVersion: string;

  /** EVM version target (e.g., "shanghai", "paris") */
  readonly evmVersion?: string;

  /** Gas limit for the simulation */
  readonly gasLimit?: number;

  /** Block timestamp override */
  readonly blockTimestamp?: number;

  /** Additional forge flags */
  readonly additionalFlags?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Simulation Request / Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SimulationRequest — Input to the FoundryService.simulate() method.
 *
 * Contains all the information needed to download, build, and
 * execute a Foundry POC test against a forked mainnet.
 */
export interface SimulationRequest {
  /** Path to the POC test file (relative to DeFiHackLabs repo root) */
  readonly pocFilePath: string;

  /** Specific test function to execute (e.g., "testExploit") */
  readonly testFunctionName: string;

  /** RPC URL for the target chain fork */
  readonly forkUrl: string;

  /** Block number to fork from */
  readonly forkBlockNumber: number;

  /** Solidity compiler version (extracted from pragma or defaulted) */
  readonly solcVersion?: string;

  /** Maximum execution time in milliseconds (default: 120_000) */
  readonly timeoutMs?: number;

  /** Forge verbosity level (1–5, default: 4 for -vvvv) */
  readonly verbosity?: number;
}

/**
 * SimulationResult — Complete output from a FoundryService simulation.
 *
 * Wraps ForgeTestResult with additional metadata about the simulation
 * execution context, timing, and cleanup status.
 */
export interface SimulationResult {
  /** Whether the exploit was successfully reproduced */
  readonly success: boolean;

  /** Total gas consumed by the simulation */
  readonly gasUsed: bigint;

  /** Internal call traces from the simulation */
  readonly traces: readonly ForgeTrace[];

  /** Event logs emitted during the simulation */
  readonly logs: readonly ForgeLog[];

  /** Total execution time in milliseconds (including setup) */
  readonly duration: number;

  /** Failure reason if !success */
  readonly reason?: string;

  /** Test function name that was executed */
  readonly testName: string;

  /** Fork block number used */
  readonly forkBlockNumber: number;

  /** The forge command that was executed */
  readonly forgeCommand: string;

  /** Raw stdout output (truncated to 50KB) */
  readonly rawOutput: string;

  /** Raw stderr output (truncated to 10KB) */
  readonly rawStderr: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Forge JSON Output Shapes (raw format from --json flag)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * RawForgeJsonOutput — Top-level shape of `forge test --json` output.
 *
 * Forge outputs a JSON object keyed by contract file path,
 * each containing a map of test function names to results.
 */
export interface RawForgeJsonOutput {
  readonly [contractPath: string]: RawForgeContractResult;
}

/**
 * RawForgeContractResult — Results for all tests in a single contract file.
 */
export interface RawForgeContractResult {
  readonly test_results: {
    readonly [testName: string]: RawForgeTestEntry;
  };
}

/**
 * RawForgeTestEntry — Raw forge JSON output for a single test.
 */
export interface RawForgeTestEntry {
  readonly status: 'Success' | 'Failure' | 'Skipped';
  readonly reason: string | null;
  readonly counterexample: unknown;
  readonly logs: readonly RawForgeLogEntry[];
  readonly kind: { readonly Standard: readonly number[] } | string;
  readonly traces: readonly unknown[];
  readonly labeled_addresses: Record<string, string>;
  readonly duration: { readonly secs: number; readonly nanos: number };
  readonly gas_used?: number;
  readonly decoded_logs?: readonly RawForgeDecodedLog[];
}

/**
 * RawForgeLogEntry — Raw log entry from forge JSON output.
 */
export interface RawForgeLogEntry {
  readonly address: string;
  readonly topics: readonly string[];
  readonly data: string;
}

/**
 * RawForgeDecodedLog — Decoded log from forge output.
 */
export interface RawForgeDecodedLog {
  readonly name: string;
  readonly params: readonly { readonly name: string; readonly value: string }[];
}

/**
 * @module foundry-errors
 * @description Custom error classes for the Foundry integration adapter.
 *
 * Each error class represents a distinct failure mode in the forge
 * execution pipeline. All extend Error with descriptive names and
 * structured context for upstream error handling.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Binary Validation Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when the `forge` binary is not found on the system PATH.
 * Users must install Foundry (via `foundryup`) before using the FoundryService.
 */
export class ForgeNotInstalledError extends Error {
  constructor(details?: string) {
    super(
      `Foundry 'forge' binary not found on PATH. ` +
      `Install Foundry via: curl -L https://foundry.paradigm.xyz | bash && foundryup` +
      (details !== undefined ? `. Details: ${details}` : ''),
    );
    this.name = 'ForgeNotInstalledError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Compilation Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when Solidity compilation fails during `forge test`.
 * Contains the raw compiler error output for debugging.
 */
export class ForgeCompilationError extends Error {
  constructor(
    public readonly compilerOutput: string,
    public readonly solcVersion?: string,
  ) {
    super(
      `Forge compilation failed` +
      (solcVersion !== undefined ? ` (solc ${solcVersion})` : '') +
      `: ${compilerOutput.slice(0, 500)}`,
    );
    this.name = 'ForgeCompilationError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Execution Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when forge test execution exceeds the configured timeout.
 * Default timeout is 120 seconds per the acceptance criteria.
 */
export class ForgeExecutionTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly testName: string,
  ) {
    super(
      `Forge test '${testName}' exceeded timeout of ${timeoutMs}ms ` +
      `(${(timeoutMs / 1000).toFixed(0)}s). The simulation was killed.`,
    );
    this.name = 'ForgeExecutionTimeoutError';
  }
}

/**
 * Thrown for generic forge execution failures not covered by
 * compilation or timeout errors.
 */
export class ForgeExecutionError extends Error {
  constructor(
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(
      `Forge execution failed with exit code ${exitCode}: ` +
      `${stderr.slice(0, 500)}`,
    );
    this.name = 'ForgeExecutionError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POC Download Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when downloading a POC file from DeFiHackLabs fails.
 * May be caused by network issues, rate limiting, or invalid file paths.
 */
export class PocDownloadError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly statusCode?: number,
    cause?: unknown,
  ) {
    super(
      `Failed to download POC file '${filePath}' from DeFiHackLabs` +
      (statusCode !== undefined ? ` (HTTP ${statusCode})` : ''),
    );
    this.name = 'PocDownloadError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fork Errors
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thrown when the RPC endpoint required for a forked mainnet
 * simulation is unreachable or misconfigured.
 */
export class ForkUnavailableError extends Error {
  constructor(
    public readonly forkUrl: string,
    cause?: unknown,
  ) {
    super(
      `Fork RPC endpoint unreachable: ${forkUrl}. ` +
      `Ensure the Alchemy/Infura API key is valid and the chain is supported.`,
    );
    this.name = 'ForkUnavailableError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

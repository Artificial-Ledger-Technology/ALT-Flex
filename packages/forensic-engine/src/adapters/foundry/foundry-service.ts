/**
 * @module foundry-service
 * @description Core FoundryService — orchestrates programmatic forge test execution.
 *
 * The FoundryService is the primary forensic capability that:
 * 1. Validates forge binary availability
 * 2. Downloads POC files from DeFiHackLabs
 * 3. Creates temporary Foundry projects
 * 4. Executes `forge test` with fork configuration
 * 5. Parses results into structured domain objects
 * 6. Cleans up temporary files
 *
 * All execution is sandboxed in isolated temp directories with
 * configurable timeout (default 120s). The service is designed
 * for single-use simulation of exploit POCs.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import type { SimulationRequest, SimulationResult } from '../../domain/forge-types.js';
import { PocDownloader } from './poc-downloader.js';
import { FoundryProjectBuilder } from './foundry-project-builder.js';
import { ForgeOutputParser } from './forge-output-parser.js';
import { ForgeRpcResolver } from './forge-rpc-resolver.js';
import {
  ForgeNotInstalledError,
  ForgeCompilationError,
  ForgeExecutionTimeoutError,
  ForgeExecutionError,
} from './foundry-errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Default timeout for forge test execution (120 seconds). */
const DEFAULT_TIMEOUT_MS = 120_000;

/** Default forge verbosity level (4 = -vvvv for full traces). */
const DEFAULT_VERBOSITY = 4;

/** Maximum stdout size to capture (50KB). */
const MAX_STDOUT_SIZE = 50 * 1024;

/** Maximum stderr size to capture (10KB). */
const MAX_STDERR_SIZE = 10 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// FoundryService
// ═══════════════════════════════════════════════════════════════════════════════

export class FoundryService {
  private readonly downloader: PocDownloader;
  private readonly projectBuilder: FoundryProjectBuilder;
  private readonly outputParser: ForgeOutputParser;
  private readonly rpcResolver: ForgeRpcResolver;
  private forgeVersion: string | null = null;

  constructor(options?: {
    downloader?: PocDownloader;
    projectBuilder?: FoundryProjectBuilder;
    outputParser?: ForgeOutputParser;
    rpcResolver?: ForgeRpcResolver;
  }) {
    this.downloader = options?.downloader ?? new PocDownloader();
    this.projectBuilder = options?.projectBuilder ?? new FoundryProjectBuilder();
    this.outputParser = options?.outputParser ?? new ForgeOutputParser();
    this.rpcResolver = options?.rpcResolver ?? new ForgeRpcResolver();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Validate that the `forge` binary is installed and accessible.
   * Should be called once at application startup.
   *
   * @returns The forge version string (e.g., "forge 0.2.0 (abc1234)")
   * @throws {ForgeNotInstalledError} if forge is not found
   */
  async validateForgeInstalled(): Promise<string> {
    if (this.forgeVersion !== null) {
      return this.forgeVersion;
    }

    try {
      const result = await this.runCommand('forge', ['--version'], {
        timeoutMs: 10_000,
      });

      if (result.exitCode !== 0) {
        throw new ForgeNotInstalledError(result.stderr);
      }

      this.forgeVersion = result.stdout.trim();
      return this.forgeVersion;
    } catch (err) {
      if (err instanceof ForgeNotInstalledError) {
        throw err;
      }
      throw new ForgeNotInstalledError(
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  /**
   * Execute a full POC simulation against a forked mainnet.
   *
   * Orchestrates the complete pipeline:
   * 1. Download POC file from DeFiHackLabs (or cache)
   * 2. Create temporary Foundry project
   * 3. Execute `forge test` with fork configuration
   * 4. Parse results
   * 5. Clean up temporary files
   *
   * @param request - Simulation parameters
   * @returns Structured simulation result
   * @throws {ForgeNotInstalledError} if forge is not installed
   * @throws {PocDownloadError} if POC file download fails
   * @throws {ForgeCompilationError} if Solidity compilation fails
   * @throws {ForgeExecutionTimeoutError} if execution exceeds timeout
   * @throws {ForgeExecutionError} for other forge execution failures
   */
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    let projectDir: string | null = null;

    try {
      // 1. Ensure forge is available
      await this.validateForgeInstalled();

      // 2. Download POC file
      const pocContent = await this.downloader.acquire(request.pocFilePath);

      // 3. Extract solc version from pragma (or use provided)
      const solcVersion =
        request.solcVersion ?? this.projectBuilder.extractSolcVersion(pocContent);

      // 4. Create temporary project
      const pocFileName = path.basename(request.pocFilePath);
      projectDir = await this.projectBuilder.createProject(pocContent, pocFileName, {
        forkUrl: request.forkUrl,
        forkBlockNumber: request.forkBlockNumber,
        solcVersion,
      });

      // 5. Build forge command
      const verbosity = request.verbosity ?? DEFAULT_VERBOSITY;
      const verbosityFlag = '-' + 'v'.repeat(verbosity);
      const forgeArgs = [
        'test',
        '--match-test',
        request.testFunctionName,
        verbosityFlag,
        '--json',
        '--no-auto-detect',
      ];

      const forgeCommand = `forge ${forgeArgs.join(' ')}`;
      const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;

      // 6. Execute forge test
      const result = await this.runCommand('forge', forgeArgs, {
        cwd: projectDir,
        timeoutMs,
        testName: request.testFunctionName,
      });

      // 7. Check for compilation errors
      if (
        result.exitCode !== 0 &&
        this.outputParser.isCompilationError(result.stderr)
      ) {
        throw new ForgeCompilationError(
          this.outputParser.extractCompilerError(result.stderr),
          solcVersion,
        );
      }

      // 8. Parse forge output
      const duration = Date.now() - startTime;

      // Try to parse JSON output, even if exit code is non-zero
      // (forge may exit non-zero when a test assertion fails)
      try {
        const testResult = this.outputParser.parseJsonOutput(
          result.stdout,
          request.testFunctionName,
          duration,
        );

        return {
          success: testResult.success,
          gasUsed: testResult.gasUsed,
          traces: testResult.traces,
          logs: testResult.logs,
          duration,
          ...(testResult.reason !== undefined ? { reason: testResult.reason } : {}),
          testName: testResult.testName,
          forkBlockNumber: request.forkBlockNumber,
          forgeCommand,
          rawOutput: result.stdout.slice(0, MAX_STDOUT_SIZE),
          rawStderr: result.stderr.slice(0, MAX_STDERR_SIZE),
        };
      } catch {
        // JSON parse failed — forge output is not parseable
        if (result.exitCode !== 0) {
          throw new ForgeExecutionError(result.exitCode, result.stderr);
        }

        // Exit code 0 but unparseable output — return minimal result
        return {
          success: false,
          gasUsed: 0n,
          traces: [],
          logs: [],
          duration,
          reason: 'Failed to parse forge output',
          testName: request.testFunctionName,
          forkBlockNumber: request.forkBlockNumber,
          forgeCommand,
          rawOutput: result.stdout.slice(0, MAX_STDOUT_SIZE),
          rawStderr: result.stderr.slice(0, MAX_STDERR_SIZE),
        };
      }
    } finally {
      // 9. Always clean up temporary project
      if (projectDir !== null) {
        await this.projectBuilder.cleanup(projectDir);
      }
    }
  }

  /**
   * Get the resolved forge version (null if not yet validated).
   */
  getForgeVersion(): string | null {
    return this.forgeVersion;
  }

  /**
   * Get the underlying RPC resolver for external use.
   */
  getRpcResolver(): ForgeRpcResolver {
    return this.rpcResolver;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Run a shell command with timeout support.
   *
   * Uses child_process.spawn for streaming output capture and
   * AbortController for timeout enforcement.
   */
  private runCommand(
    command: string,
    args: readonly string[],
    options?: {
      cwd?: string;
      timeoutMs?: number;
      testName?: string;
    },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn(command, [...args], {
        cwd: options?.cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      // Capture stdout
      child.stdout.on('data', (data: { toString(): string }) => {
        const chunk = data.toString();
        if (stdout.length < MAX_STDOUT_SIZE) {
          stdout += chunk;
        }
      });

      // Capture stderr
      child.stderr.on('data', (data: { toString(): string }) => {
        const chunk = data.toString();
        if (stderr.length < MAX_STDERR_SIZE) {
          stderr += chunk;
        }
      });

      // Set timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      // Handle completion
      child.on('close', (exitCode: number | null) => {
        clearTimeout(timer);

        if (timedOut) {
          reject(
            new ForgeExecutionTimeoutError(
              timeoutMs,
              options?.testName ?? 'unknown',
            ),
          );
          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode: exitCode ?? 1,
        });
      });

      // Handle spawn errors (command not found, etc.)
      child.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}

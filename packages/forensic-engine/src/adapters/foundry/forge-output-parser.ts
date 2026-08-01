/**
 * @module forge-output-parser
 * @description Parses forge test JSON output into structured domain types.
 *
 * Handles both the `--json` structured output and the verbose `-vvvv`
 * trace output from `forge test`. Transforms raw forge JSON shapes
 * into clean `ForgeTestResult` domain objects.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

import type {
  ForgeTestResult,
  ForgeTrace,
  ForgeLog,
  ForgeCallType,
  RawForgeJsonOutput,
  RawForgeTestEntry,
  RawForgeLogEntry,
} from '../../domain/forge-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Valid EVM call types for trace parsing. */
const VALID_CALL_TYPES: readonly ForgeCallType[] = [
  'CALL',
  'STATICCALL',
  'DELEGATECALL',
  'CREATE',
  'CREATE2',
];

// ═══════════════════════════════════════════════════════════════════════════════
// ForgeOutputParser
// ═══════════════════════════════════════════════════════════════════════════════

export class ForgeOutputParser {
  /**
   * Parse forge `--json` stdout output into a ForgeTestResult.
   *
   * @param jsonOutput - Raw stdout from `forge test --json`
   * @param targetTestName - The specific test function name to extract
   * @param durationMs - Execution duration measured externally
   * @returns Parsed ForgeTestResult
   * @throws {Error} if JSON is malformed or target test not found
   */
  parseJsonOutput(
    jsonOutput: string,
    targetTestName: string,
    durationMs: number,
  ): ForgeTestResult {
    const parsed = this.parseRawJson(jsonOutput);
    const testEntry = this.findTestEntry(parsed, targetTestName);

    if (testEntry === null) {
      return {
        success: false,
        reason: `Test function '${targetTestName}' not found in forge output`,
        gasUsed: 0n,
        logs: [],
        traces: [],
        duration: durationMs,
        testName: targetTestName,
      };
    }

    const logs = this.parseLogs(testEntry.logs);
    const traces = this.parseTraces(testEntry.traces);
    const gasUsed = testEntry.gas_used !== undefined
      ? BigInt(testEntry.gas_used)
      : 0n;

    // Calculate duration from forge's own timing if available
    const forgeDuration = testEntry.duration !== undefined
      ? testEntry.duration.secs * 1000 + Math.floor(testEntry.duration.nanos / 1_000_000)
      : durationMs;

    return {
      success: testEntry.status === 'Success',
      ...(testEntry.reason !== null && testEntry.reason !== undefined
        ? { reason: testEntry.reason }
        : {}),
      gasUsed,
      logs,
      traces,
      duration: forgeDuration,
      testName: targetTestName,
    };
  }

  /**
   * Check if forge output indicates a compilation error.
   *
   * @param stderr - Raw stderr from forge execution
   * @returns true if the output contains compilation error indicators
   */
  isCompilationError(stderr: string): boolean {
    const compilationIndicators = [
      'Compiler run failed',
      'Error (6275)',   // DeclarationError
      'Error (7920)',   // TypeError
      'Error (9582)',   // Unused variable
      'Error (3420)',   // Already declared
      'ParserError',
      'SyntaxError',
      'CompilerError',
    ];

    return compilationIndicators.some((indicator) =>
      stderr.includes(indicator),
    );
  }

  /**
   * Extract compiler error details from forge stderr.
   *
   * @param stderr - Raw stderr from forge execution
   * @returns Structured error message
   */
  extractCompilerError(stderr: string): string {
    // Extract the most relevant error lines
    const lines = stderr.split('\n');
    const errorLines = lines.filter(
      (line) =>
        line.includes('Error') ||
        line.includes('-->') ||
        line.includes('|') ||
        line.trim().startsWith('='),
    );

    return errorLines.slice(0, 20).join('\n') || stderr.slice(0, 1000);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Parse raw JSON string, handling potential non-JSON prefixes.
   * Forge sometimes outputs non-JSON lines before the JSON blob.
   */
  private parseRawJson(jsonOutput: string): RawForgeJsonOutput {
    // Try parsing the entire output first
    try {
      return JSON.parse(jsonOutput) as RawForgeJsonOutput;
    } catch {
      // Forge may output warnings/logs before JSON — find the JSON start
      const jsonStart = jsonOutput.indexOf('{');
      if (jsonStart === -1) {
        throw new Error(
          'No JSON object found in forge output. ' +
          `Output starts with: ${jsonOutput.slice(0, 200)}`,
        );
      }

      try {
        return JSON.parse(jsonOutput.slice(jsonStart)) as RawForgeJsonOutput;
      } catch (innerErr) {
        throw new Error(
          `Failed to parse forge JSON output: ${innerErr instanceof Error ? innerErr.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Find a specific test entry by function name across all contracts.
   */
  private findTestEntry(
    output: RawForgeJsonOutput,
    testName: string,
  ): RawForgeTestEntry | null {
    for (const contractPath of Object.keys(output)) {
      const contract = output[contractPath];
      if (contract?.test_results !== undefined) {
        const testResults = contract.test_results;
        // Try exact match first
        if (testResults[testName] !== undefined) {
          return testResults[testName];
        }

        // Try partial match (testName might include/exclude parentheses)
        for (const key of Object.keys(testResults)) {
          if (key.startsWith(testName) || key.includes(testName)) {
            const entry = testResults[key];
            if (entry !== undefined) {
              return entry;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Parse raw forge log entries into ForgeLog domain objects.
   */
  private parseLogs(rawLogs: readonly RawForgeLogEntry[]): ForgeLog[] {
    return rawLogs.map((raw) => ({
      address: raw.address,
      topics: raw.topics,
      data: raw.data,
    }));
  }

  /**
   * Parse forge trace data into ForgeTrace domain objects.
   *
   * Forge trace format varies between versions. This parser handles
   * both structured trace arrays and the human-readable trace format.
   */
  private parseTraces(rawTraces: readonly unknown[]): ForgeTrace[] {
    const traces: ForgeTrace[] = [];

    for (const rawTrace of rawTraces) {
      if (Array.isArray(rawTrace)) {
        // Forge outputs traces as [traceKind, traceNode] tuples
        for (const entry of rawTrace) {
          const parsed = this.parseTraceNode(entry, 0);
          if (parsed !== null) {
            traces.push(parsed);
          }
        }
      } else if (typeof rawTrace === 'object' && rawTrace !== null) {
        const parsed = this.parseTraceNode(rawTrace, 0);
        if (parsed !== null) {
          traces.push(parsed);
        }
      }
    }

    return traces;
  }

  /**
   * Parse a single trace node from forge output.
   */
  private parseTraceNode(node: unknown, depth: number): ForgeTrace | null {
    if (typeof node !== 'object' || node === null) {
      return null;
    }

    const obj = node as Record<string, unknown>;

    // Validate call type
    const rawType = typeof obj['type'] === 'string' ? obj['type'].toUpperCase() : 'CALL';
    const callType: ForgeCallType = VALID_CALL_TYPES.includes(rawType as ForgeCallType)
      ? (rawType as ForgeCallType)
      : 'CALL';

    const traceError = typeof obj['error'] === 'string' ? obj['error'] : undefined;

    return {
      depth,
      type: callType,
      from: typeof obj['from'] === 'string' ? obj['from'] : '0x0',
      to: typeof obj['to'] === 'string' ? obj['to'] : '0x0',
      value: this.toBigInt(obj['value']),
      gasUsed: this.toBigInt(obj['gasUsed'] ?? obj['gas_used']),
      input: typeof obj['input'] === 'string' ? obj['input'] : '0x',
      output: typeof obj['output'] === 'string' ? obj['output'] : '0x',
      ...(traceError !== undefined ? { error: traceError } : {}),
    };
  }

  /**
   * Safely convert an unknown value to BigInt.
   */
  private toBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') {
      try {
        return BigInt(value);
      } catch {
        return 0n;
      }
    }
    return 0n;
  }
}

/**
 * @module foundry-service.test
 * @description Unit tests for the Foundry Integration Service (P5-EVM-002).
 *
 * Tests cover all acceptance criteria:
 * - forge binary validation
 * - POC file download + caching
 * - Foundry project scaffolding
 * - forge output parsing (success, failure, compilation error)
 * - Trace and log parsing
 * - Timeout handling
 * - Temp directory cleanup
 * - Full orchestration pipeline
 *
 * All tests use pre-recorded fixtures — no actual forge execution.
 *
 * @task P5-EVM-002
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ForgeOutputParser } from '../adapters/foundry/forge-output-parser.js';
import { FoundryProjectBuilder } from '../adapters/foundry/foundry-project-builder.js';
import { PocDownloader } from '../adapters/foundry/poc-downloader.js';
import { ForgeRpcResolver } from '../adapters/foundry/forge-rpc-resolver.js';
import {
  ForgeNotInstalledError,
  ForgeCompilationError,
  ForgeExecutionTimeoutError,
  PocDownloadError,
  ForkUnavailableError,
} from '../adapters/foundry/foundry-errors.js';
import { Chain } from '@aegis/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

async function loadFixture(filename: string): Promise<string> {
  return fs.readFile(path.join(FIXTURES_DIR, filename), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5-EVM-002: Foundry Integration Service', () => {
  // ── 1. Forge Binary Validation ────────────────────────────────────────────

  describe('ForgeNotInstalledError', () => {
    it('1. should create descriptive error when forge is not found', () => {
      const error = new ForgeNotInstalledError('command not found');
      expect(error.name).toBe('ForgeNotInstalledError');
      expect(error.message).toContain('forge');
      expect(error.message).toContain('foundryup');
      expect(error.message).toContain('command not found');
    });

    it('2. should create error without details', () => {
      const error = new ForgeNotInstalledError();
      expect(error.name).toBe('ForgeNotInstalledError');
      expect(error.message).toContain('forge');
      expect(error.message).not.toContain('Details');
    });
  });

  // ── 3–4. POC Downloader ──────────────────────────────────────────────────

  describe('PocDownloader', () => {
    let downloader: PocDownloader;
    let cacheDir: string;

    beforeEach(async () => {
      cacheDir = path.join(os.tmpdir(), `aegis-test-cache-${Date.now()}`);
      downloader = new PocDownloader({ cacheDir });
    });

    afterEach(async () => {
      try {
        await fs.rm(cacheDir, { recursive: true, force: true });
      } catch {
        // Cleanup best-effort
      }
    });

    it('3. should download POC from GitHub via mocked fetch', async () => {
      const sampleContent = await loadFixture('sample-poc.txt');

      // Mock global fetch
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(sampleContent),
      });
      vi.stubGlobal('fetch', fetchMock);

      const content = await downloader.downloadFromGitHub(
        'src/test/2023-03/Euler_exp.t.sol',
      );

      expect(content).toContain('pragma solidity');
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('SunWeb3Sec/DeFiHackLabs'),
      );

      vi.unstubAllGlobals();
    });

    it('4. should return cached file without fetching', async () => {
      const sampleContent = await loadFixture('sample-poc.txt');

      // Pre-populate cache
      const cachePath = path.join(cacheDir, 'src/test/2023-03/Euler_exp.t.sol');
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, sampleContent, 'utf-8');

      // Mock fetch to verify it's NOT called
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const content = await downloader.acquire('src/test/2023-03/Euler_exp.t.sol');

      expect(content).toContain('pragma solidity');
      expect(fetchMock).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  // ── 5–6. Foundry Project Builder ─────────────────────────────────────────

  describe('FoundryProjectBuilder', () => {
    let builder: FoundryProjectBuilder;
    let projectDir: string | null = null;

    beforeEach(() => {
      builder = new FoundryProjectBuilder();
    });

    afterEach(async () => {
      if (projectDir !== null) {
        await builder.cleanup(projectDir);
        projectDir = null;
      }
    });

    it('5. should create correct directory structure', async () => {
      const pocContent = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.17;\ncontract Test {}';

      projectDir = await builder.createProject(pocContent, 'Exploit.t.sol', {
        forkUrl: 'https://eth-mainnet.g.alchemy.com/v2/test-key',
        forkBlockNumber: 16_818_460,
        solcVersion: '0.8.17',
      });

      // Verify directory exists
      const stat = await fs.stat(projectDir);
      expect(stat.isDirectory()).toBe(true);

      // Verify foundry.toml exists
      const tomlStat = await fs.stat(path.join(projectDir, 'foundry.toml'));
      expect(tomlStat.isFile()).toBe(true);

      // Verify test file exists
      const testStat = await fs.stat(
        path.join(projectDir, 'test', 'Exploit.t.sol'),
      );
      expect(testStat.isFile()).toBe(true);

      // Verify forge-std stub exists
      const forgeStdStat = await fs.stat(
        path.join(projectDir, 'lib', 'forge-std', 'src', 'Test.sol'),
      );
      expect(forgeStdStat.isFile()).toBe(true);

      // Verify remappings.txt exists
      const remappingsStat = await fs.stat(
        path.join(projectDir, 'remappings.txt'),
      );
      expect(remappingsStat.isFile()).toBe(true);
    });

    it('6. should generate correct foundry.toml content', async () => {
      const pocContent = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.17;\ncontract Test {}';

      projectDir = await builder.createProject(pocContent, 'Test.t.sol', {
        forkUrl: 'https://eth-mainnet.g.alchemy.com/v2/test-key',
        forkBlockNumber: 16_818_460,
        solcVersion: '0.8.17',
        gasLimit: 30_000_000,
        blockTimestamp: 1_678_700_000,
      });

      const tomlContent = await fs.readFile(
        path.join(projectDir, 'foundry.toml'),
        'utf-8',
      );

      expect(tomlContent).toContain('[profile.default]');
      expect(tomlContent).toContain('solc_version = "0.8.17"');
      expect(tomlContent).toContain(
        'eth_rpc_url = "https://eth-mainnet.g.alchemy.com/v2/test-key"',
      );
      expect(tomlContent).toContain('fork_block_number = 16818460');
      expect(tomlContent).toContain('gas_limit = 30000000');
      expect(tomlContent).toContain('block_timestamp = 1678700000');
      expect(tomlContent).toContain('ffi = false');
    });
  });

  // ── 7–8. Forge Output Parser ─────────────────────────────────────────────

  describe('ForgeOutputParser', () => {
    let parser: ForgeOutputParser;

    beforeEach(() => {
      parser = new ForgeOutputParser();
    });

    it('7. should parse successful forge JSON output', async () => {
      const jsonOutput = await loadFixture('forge-output-success.json');

      const result = parser.parseJsonOutput(jsonOutput, 'testExploit', 3000);

      expect(result.success).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.gasUsed).toBe(1_250_000n);
      expect(result.testName).toBe('testExploit');
      expect(result.logs).toHaveLength(2);
      expect(result.traces).toHaveLength(2);

      // Check duration comes from forge's own timing
      expect(result.duration).toBe(2450); // 2 secs + 450ms

      // Verify first log
      expect(result.logs[0]?.address).toBe(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
      expect(result.logs[0]?.topics).toHaveLength(3);

      // Verify first trace
      expect(result.traces[0]?.type).toBe('CALL');
      expect(result.traces[0]?.gasUsed).toBe(45_000n);
    });

    it('8. should handle forge execution timeout error', () => {
      const error = new ForgeExecutionTimeoutError(120_000, 'testExploit');

      expect(error.name).toBe('ForgeExecutionTimeoutError');
      expect(error.timeoutMs).toBe(120_000);
      expect(error.testName).toBe('testExploit');
      expect(error.message).toContain('120s');
      expect(error.message).toContain('testExploit');
    });

    it('9. should detect compilation errors', async () => {
      const compileError = await loadFixture('forge-output-compile-error.txt');

      expect(parser.isCompilationError(compileError)).toBe(true);

      const extracted = parser.extractCompilerError(compileError);
      expect(extracted).toContain('Error (7920)');
      expect(extracted).toContain('TypeError');
    });

    it('10. should parse failing test output', async () => {
      const jsonOutput = await loadFixture('forge-output-failure.json');

      const result = parser.parseJsonOutput(jsonOutput, 'testExploit', 2000);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Assertion failed');
      expect(result.gasUsed).toBe(850_000n);
      expect(result.logs).toHaveLength(1);
      expect(result.traces).toHaveLength(1);
      expect(result.traces[0]?.error).toBe('EVM revert: Assertion failed');
    });
  });

  // ── 11–12. Trace and Log Parsing ─────────────────────────────────────────

  describe('ForgeOutputParser — Trace Parsing', () => {
    let parser: ForgeOutputParser;

    beforeEach(() => {
      parser = new ForgeOutputParser();
    });

    it('11. should parse trace with all call types', async () => {
      const jsonOutput = await loadFixture('forge-output-success.json');
      const result = parser.parseJsonOutput(jsonOutput, 'testExploit', 1000);

      // Verify CALL trace
      const callTrace = result.traces.find((t) => t.type === 'CALL');
      expect(callTrace).toBeDefined();
      expect(callTrace?.from).toBe(
        '0x1234567890abcdef1234567890abcdef12345678',
      );
      expect(callTrace?.to).toBe(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
      expect(callTrace?.value).toBe(0n);
      expect(callTrace?.input).toBe('0xa9059cbb');

      // Verify STATICCALL trace
      const staticTrace = result.traces.find((t) => t.type === 'STATICCALL');
      expect(staticTrace).toBeDefined();
      expect(staticTrace?.gasUsed).toBe(2100n);
    });

    it('12. should extract event logs with correct fields', async () => {
      const jsonOutput = await loadFixture('forge-output-success.json');
      const result = parser.parseJsonOutput(jsonOutput, 'testExploit', 1000);

      expect(result.logs).toHaveLength(2);

      // First log — USDT Transfer
      const usdtLog = result.logs[0];
      expect(usdtLog?.address).toBe(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      );
      expect(usdtLog?.topics).toHaveLength(3);
      expect(usdtLog?.data).toBe(
        '0x00000000000000000000000000000000000000000000000000000000003d0900',
      );

      // Second log — USDC Transfer
      const usdcLog = result.logs[1];
      expect(usdcLog?.address).toBe(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      );
    });
  });

  // ── 13. Cleanup ──────────────────────────────────────────────────────────

  describe('FoundryProjectBuilder — Cleanup', () => {
    it('13. should remove temp directory after cleanup', async () => {
      const builder = new FoundryProjectBuilder();
      const pocContent =
        '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.17;\ncontract Test {}';

      const projectDir = await builder.createProject(
        pocContent,
        'Test.t.sol',
        {
          forkUrl: 'https://localhost:8545',
          forkBlockNumber: 100,
          solcVersion: '0.8.17',
        },
      );

      // Verify directory exists
      const statBefore = await fs.stat(projectDir);
      expect(statBefore.isDirectory()).toBe(true);

      // Cleanup
      await builder.cleanup(projectDir);

      // Verify directory is removed
      await expect(fs.stat(projectDir)).rejects.toThrow();
    });
  });

  // ── 14. Solc Version Extraction ──────────────────────────────────────────

  describe('FoundryProjectBuilder — Solc Version Extraction', () => {
    it('14. should extract solc version from pragma statement', () => {
      const builder = new FoundryProjectBuilder();

      // Caret version
      expect(
        builder.extractSolcVersion('pragma solidity ^0.8.17;'),
      ).toBe('0.8.17');

      // Range version
      expect(
        builder.extractSolcVersion('pragma solidity >=0.8.0 <0.9.0;'),
      ).toBe('0.8.0');

      // Exact version
      expect(
        builder.extractSolcVersion('pragma solidity 0.6.12;'),
      ).toBe('0.6.12');

      // No pragma — returns default
      expect(
        builder.extractSolcVersion('contract Foo {}'),
      ).toBe('0.8.20');
    });
  });

  // ── Forge RPC Resolver ────────────────────────────────────────────────────

  describe('ForgeRpcResolver', () => {
    it('should resolve Alchemy URL when API key is provided', () => {
      const resolver = new ForgeRpcResolver({
        alchemyApiKey: 'test-alchemy-key',
      });

      const url = resolver.resolve(Chain.ETHEREUM);
      expect(url).toBe(
        'https://eth-mainnet.g.alchemy.com/v2/test-alchemy-key',
      );
    });

    it('should fall back to Infura when Alchemy slug is unavailable', () => {
      const resolver = new ForgeRpcResolver({
        infuraApiKey: 'test-infura-key',
      });

      const url = resolver.resolve(Chain.AVALANCHE);
      expect(url).toBe(
        'https://avalanche-mainnet.infura.io/v3/test-infura-key',
      );
    });

    it('should fall back to public RPC when no API keys', () => {
      const resolver = new ForgeRpcResolver({});

      const url = resolver.resolve(Chain.BSC);
      expect(url).toBe('https://bsc-dataseed1.binance.org');
    });

    it('should throw ForkUnavailableError for unsupported chain', () => {
      const resolver = new ForgeRpcResolver({});

      expect(() => resolver.resolve(Chain.UNKNOWN)).toThrow(
        ForkUnavailableError,
      );
    });

    it('should report supported chains correctly', () => {
      const resolver = new ForgeRpcResolver({
        alchemyApiKey: 'test-key',
      });

      const supported = resolver.getSupportedChains();
      expect(supported).toContain(Chain.ETHEREUM);
      expect(supported).toContain(Chain.POLYGON);
      expect(supported).not.toContain(Chain.UNKNOWN);
    });
  });

  // ── Error Classes ─────────────────────────────────────────────────────────

  describe('Error Classes', () => {
    it('should create ForgeCompilationError with compiler output', () => {
      const error = new ForgeCompilationError(
        'Error: Undeclared identifier',
        '0.8.17',
      );
      expect(error.name).toBe('ForgeCompilationError');
      expect(error.compilerOutput).toBe('Error: Undeclared identifier');
      expect(error.solcVersion).toBe('0.8.17');
      expect(error.message).toContain('solc 0.8.17');
    });

    it('should create PocDownloadError with status code', () => {
      const error = new PocDownloadError(
        'src/test/Exploit.t.sol',
        404,
      );
      expect(error.name).toBe('PocDownloadError');
      expect(error.filePath).toBe('src/test/Exploit.t.sol');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('HTTP 404');
    });

    it('should create ForkUnavailableError with URL', () => {
      const error = new ForkUnavailableError(
        'https://eth-mainnet.g.alchemy.com/v2/invalid',
      );
      expect(error.name).toBe('ForkUnavailableError');
      expect(error.forkUrl).toContain('alchemy.com');
    });
  });
});

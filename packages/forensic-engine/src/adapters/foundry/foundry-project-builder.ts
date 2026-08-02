/**
 * @module foundry-project-builder
 * @description Creates temporary Foundry projects for POC simulation.
 *
 * Scaffolds a minimal Foundry project structure in a temp directory
 * with the correct `foundry.toml`, remappings, and POC test file.
 * The project is designed for single-use simulation and cleanup.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-002
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import type { FoundryProjectConfig } from '../../domain/forge-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Prefix for temporary Foundry project directories. */
const TEMP_DIR_PREFIX = 'aegis-forge-';

/** Default Solidity compiler version if not specified. */
const DEFAULT_SOLC_VERSION = '0.8.20';

/** Default EVM version. */
const DEFAULT_EVM_VERSION = 'shanghai';

// ═══════════════════════════════════════════════════════════════════════════════
// FoundryProjectBuilder
// ═══════════════════════════════════════════════════════════════════════════════

export class FoundryProjectBuilder {
  /**
   * Create a temporary Foundry project directory with all required files.
   *
   * @param pocContent - Solidity source code of the POC test file
   * @param pocFileName - Name of the POC file (e.g., "Euler_exp.t.sol")
   * @param config - Foundry project configuration
   * @returns Absolute path to the created project directory
   */
  async createProject(
    pocContent: string,
    pocFileName: string,
    config: FoundryProjectConfig,
  ): Promise<string> {
    // Create unique temp directory
    const projectDir = path.join(
      os.tmpdir(),
      `${TEMP_DIR_PREFIX}${crypto.randomUUID()}`,
    );

    await fs.mkdir(projectDir, { recursive: true });

    // Create project structure
    await Promise.all([
      this.writeFoundryToml(projectDir, config),
      this.writeRemappings(projectDir),
      this.writePocFile(projectDir, pocFileName, pocContent),
      this.createForgeStdStub(projectDir),
    ]);

    return projectDir;
  }

  /**
   * Remove a temporary Foundry project directory.
   *
   * @param projectDir - Absolute path to the project directory
   */
  async cleanup(projectDir: string): Promise<void> {
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch {
      // Cleanup failures are non-fatal — the OS will clean tmpdir eventually
    }
  }

  /**
   * Extract the Solidity compiler version from a pragma statement.
   *
   * @param solContent - Solidity source code
   * @returns Extracted version string (e.g., "0.8.17") or default
   */
  extractSolcVersion(solContent: string): string {
    // Match patterns like: pragma solidity ^0.8.17; or pragma solidity >=0.8.0 <0.9.0;
    const pragmaMatch = solContent.match(
      /pragma\s+solidity\s+[><=^~]*\s*(\d+\.\d+\.\d+)/,
    );

    if (pragmaMatch?.[1] !== undefined) {
      return pragmaMatch[1];
    }

    return DEFAULT_SOLC_VERSION;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Generate and write the `foundry.toml` configuration file.
   */
  private async writeFoundryToml(
    projectDir: string,
    config: FoundryProjectConfig,
  ): Promise<void> {
    const solcVersion = config.solcVersion || DEFAULT_SOLC_VERSION;
    const evmVersion = config.evmVersion ?? DEFAULT_EVM_VERSION;

    const lines: string[] = [
      '[profile.default]',
      `src = "src"`,
      `test = "test"`,
      `out = "out"`,
      `libs = ["lib"]`,
      `solc_version = "${solcVersion}"`,
      `evm_version = "${evmVersion}"`,
      ``,
      `# Fork configuration for exploit simulation`,
      `eth_rpc_url = "${config.forkUrl}"`,
      `fork_block_number = ${config.forkBlockNumber}`,
    ];

    if (config.gasLimit !== undefined) {
      lines.push(`gas_limit = ${config.gasLimit}`);
    }

    if (config.blockTimestamp !== undefined) {
      lines.push(`block_timestamp = ${config.blockTimestamp}`);
    }

    // Performance settings for simulation
    lines.push('');
    lines.push('# Simulation performance settings');
    lines.push('ffi = false');
    lines.push('fuzz_runs = 0');

    const tomlContent = lines.join('\n') + '\n';
    await fs.writeFile(path.join(projectDir, 'foundry.toml'), tomlContent, 'utf-8');
  }

  /**
   * Write a minimal remappings.txt for common imports.
   */
  private async writeRemappings(projectDir: string): Promise<void> {
    const remappings = [
      'forge-std/=lib/forge-std/src/',
      'ds-test/=lib/forge-std/lib/ds-test/src/',
    ].join('\n') + '\n';

    await fs.writeFile(path.join(projectDir, 'remappings.txt'), remappings, 'utf-8');
  }

  /**
   * Write the POC test file to the project's test directory.
   */
  private async writePocFile(
    projectDir: string,
    fileName: string,
    content: string,
  ): Promise<void> {
    const testDir = path.join(projectDir, 'test');
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, fileName), content, 'utf-8');
  }

  /**
   * Create a minimal forge-std stub to satisfy imports.
   *
   * In production, `forge install` or a pre-installed forge-std
   * would be used. For sandboxed simulation, we create a minimal
   * stub with the essential test base contract.
   */
  private async createForgeStdStub(projectDir: string): Promise<void> {
    const forgeStdDir = path.join(projectDir, 'lib', 'forge-std', 'src');
    await fs.mkdir(forgeStdDir, { recursive: true });

    // Minimal Test.sol stub
    const testSol = `// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2 <0.9.0;

import {console} from "./console.sol";

abstract contract Test {
    bool public IS_TEST = true;

    function setUp() public virtual {}

    function failed() public view returns (bool) {
        return false;
    }

    function fail() internal virtual {
        revert("Test failed");
    }

    function assertTrue(bool condition) internal pure {
        require(condition, "Assertion failed");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "Values not equal");
    }

    function assertGt(uint256 a, uint256 b) internal pure {
        require(a > b, "Value not greater than");
    }

    function emit_log_named_decimal_uint(string memory, uint256, uint256) internal pure {}
}
`;

    // Minimal console.sol stub
    const consoleSol = `// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library console {
    function log(string memory) internal pure {}
    function log(string memory, uint256) internal pure {}
    function log(string memory, address) internal pure {}
    function log(string memory, bool) internal pure {}
    function log(uint256) internal pure {}
    function log(address) internal pure {}
}
`;

    await Promise.all([
      fs.writeFile(path.join(forgeStdDir, 'Test.sol'), testSol, 'utf-8'),
      fs.writeFile(path.join(forgeStdDir, 'console.sol'), consoleSol, 'utf-8'),
    ]);

    // Also write to ds-test path
    const dsTestDir = path.join(projectDir, 'lib', 'forge-std', 'lib', 'ds-test', 'src');
    await fs.mkdir(dsTestDir, { recursive: true });

    const dsTestSol = `// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.5.0;

contract DSTest {
    bool public IS_TEST = true;
    function failed() public view returns (bool) { return false; }
    function fail() internal { revert("FAIL"); }
    function assertTrue(bool condition) internal pure { require(condition); }
    function assertEq(uint256 a, uint256 b) internal pure { require(a == b); }
}
`;

    await fs.writeFile(path.join(dsTestDir, 'test.sol'), dsTestSol, 'utf-8');
  }
}

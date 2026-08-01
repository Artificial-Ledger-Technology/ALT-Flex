/**
 * @module @aegis/forensic-engine/adapters/foundry
 *
 * Foundry integration adapter for programmatic forge test execution.
 * Enables POC simulation against forked mainnet environments.
 *
 * @hexagonal Adapter Layer — Engine γ (Driven/Secondary)
 * @task P5-EVM-002
 */

// ── Core Service ────────────────────────────────────────────────────────────
export { FoundryService } from './foundry-service.js';

// ── Supporting Components ───────────────────────────────────────────────────
export { ForgeOutputParser } from './forge-output-parser.js';
export { PocDownloader } from './poc-downloader.js';
export { FoundryProjectBuilder } from './foundry-project-builder.js';
export { ForgeRpcResolver } from './forge-rpc-resolver.js';

// ── Error Types ─────────────────────────────────────────────────────────────
export {
  ForgeNotInstalledError,
  ForgeCompilationError,
  ForgeExecutionTimeoutError,
  ForgeExecutionError,
  PocDownloadError,
  ForkUnavailableError,
} from './foundry-errors.js';

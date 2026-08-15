/**
 * @module @aegis/forensic-engine/adapters
 *
 * Infrastructure adapters for the Forensic Engine.
 * Concrete implementations of driven ports defined in @aegis/core:
 * - Multi-chain RPC provider for forensic data access
 * - Foundry CLI integration for POC simulation
 * - PostgreSQL repository for exploit POCs (Phase 5+)
 *
 * @hexagonal Adapter Layer — Engine γ (Driven/Secondary)
 */

// ── RPC Adapter (P5-EVM-001) ────────────────────────────────────────────────
export {
  ChainRpcProvider,
  ChainNotSupportedError,
  RpcRequestError,
  RateLimiter,
  buildChainConfigs,
  SUPPORTED_CHAINS,
  type ChainRpcConfig,
} from './rpc/index.js';

// ── Foundry Adapter (P5-EVM-002) ────────────────────────────────────────────
export {
  FoundryService,
  ForgeOutputParser,
  PocDownloader,
  FoundryProjectBuilder,
  ForgeRpcResolver,
  ForgeNotInstalledError,
  ForgeCompilationError,
  ForgeExecutionTimeoutError,
  ForgeExecutionError,
  PocDownloadError,
  ForkUnavailableError,
} from './foundry/index.js';

// ── Tracing Adapter (P5-EVM-003) ────────────────────────────────────────────
export {
  TransactionTraceAnalyzer,
  SelectorResolver,
  TraceNotAvailableError,
  TraceTooLargeError,
  TraceDepthExceededError,
} from './tracing/index.js';

// ── Storage Adapter (P5-EVM-004) ────────────────────────────────────────────
export {
  StorageDiffAnalyzer,
  StorageLayoutDecoder,
  StorageSlotDiscoverer,
} from './storage/index.js';

// ── Pattern Recognition Adapter (P5-EVM-005, P7-ML-003) ─────────────────────
export {
  ExploitPatternRecognizer,
  PatternConfigLoader,
  FlashLoanDetector,
  ReentrancyDetector,
  OracleManipulationDetector,
  AccessControlDetector,
  ArithmeticOverflowDetector,
  FrontRunningDetector,
  DelegateCallInjectionDetector,
  SelfDestructDetector,
  LogicErrorDetector,
  BridgeExploitDetector,
} from './patterns/index.js';
export type {
  RecognizerMode,
  RecognizerOptions,
  ExtendedAnalysisMetadata,
} from './patterns/exploit-pattern-recognizer.js';

// ── ML Adapter (P7-ML-003/004) ──────────────────────────────────────────────
export {
  OnnxExploitClassifier,
  TraceFeatureExtractor,
  FEATURE_NAMES,
} from './ml/index.js';
export type {
  OnnxClassifierOptions,
  OnnxModelManifest,
  FeatureName,
  ExtractorMetadata,
} from './ml/index.js';


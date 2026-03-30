/**
 * @module ports
 * @description Barrel export for all hexagonal architecture port interfaces.
 *
 * Ports define the abstract contracts between the domain layer and the
 * external world. Concrete implementations ("Adapters") live outside
 * the domain and are injected via dependency inversion.
 *
 * @hexagonal Port Layer — Domain Kernel
 */

// ── Hack Data Port ───────────────────────────────────────────────────────────
export type {
  IHackDataPort,
  HackFilters,
  HackSortField,
  AttackVectorStat,
  ChainStat,
  LossTimeSeriesPoint,
  DashboardStats,
  PaginatedResult,
  SortConfig,
} from './IHackDataPort.js';

// ── Skill Data Port ──────────────────────────────────────────────────────────
export type {
  ISkillDataPort,
  SkillFilters,
  SkillSortField,
  PlatformStat,
  LanguageStat,
  SafetyDistribution,
  SkillsDashboardStats,
} from './ISkillDataPort.js';

// ── Safety Scanner Port ──────────────────────────────────────────────────────
export type {
  ISafetyScannerPort,
  ScannerConfig,
  ScannerRuleConfig,
  ScanRequest,
  ScanResponse,
  ScanProgressCallback,
} from './ISafetyScannerPort.js';

// ── Chain Data Port ──────────────────────────────────────────────────────────
export type {
  IChainDataPort,
  TransactionData,
  TransactionTrace,
  InternalCall,
  DecodedEvent,
  BlockData,
  ContractInfo,
} from './IChainDataPort.js';

// ── Cache Port ───────────────────────────────────────────────────────────────
export type { ICachePort } from './ICachePort.js';

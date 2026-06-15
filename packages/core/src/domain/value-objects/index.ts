/**
 * @module value-objects
 * @description Barrel export for all domain value objects.
 *
 * Value objects are immutable, identity-less domain primitives that encapsulate
 * domain concepts with validation and metadata. They are the building blocks
 * used by entities and referenced throughout the hexagonal architecture.
 *
 * @hexagonal Value Object Layer — Domain Kernel
 */

// ── Attack Vector ────────────────────────────────────────────────────────────
export {
  AttackVector,
  AttackSeverity,
  AttackVectorSchema,
  ATTACK_VECTOR_METADATA,
  getAllAttackVectors,
  getAttackVectorMetadata,
  getAttackVectorsBySeverity,
  getEvmSpecificAttackVectors,
} from './AttackVector.js';
export type { AttackVectorType, AttackVectorMetadata } from './AttackVector.js';

// ── Chain ────────────────────────────────────────────────────────────────────
export {
  Chain,
  ConsensusType,
  ChainSchema,
  CHAIN_METADATA,
  getAllChains,
  getEvmChains,
  getNonEvmChains,
  getL2Chains,
  getChainMetadata,
  buildTxUrl,
  buildAddressUrl,
  chainFromChainId,
} from './Chain.js';
export type { ChainType, ChainMetadata } from './Chain.js';

// ── Safety Label ─────────────────────────────────────────────────────────────
export {
  SafetyLabel,
  SafetyRiskLevel,
  SafetyLabelSchema,
  SAFETY_LABEL_METADATA,
  getAllSafetyLabels,
  getSafetyLabelMetadata,
  isSafeToUse,
  maxRiskLabel,
  isValidLabelTransition,
} from './SafetyLabel.js';
export type { SafetyLabelType, SafetyLabelMetadata } from './SafetyLabel.js';

// ── Safety Rule ──────────────────────────────────────────────────────────────
export {
  RuleCategorySchema,
  SeveritySchema,
  RulePatternTypeSchema,
  RulePatternSchema,
  SafetyRuleSchema,
} from './SafetyRule.js';
export type { RuleCategory, Severity, RulePattern, SafetyRule } from './SafetyRule.js';

// ── Parsed Content ───────────────────────────────────────────────────────────
export { CodeBlockSchema, ParsedContentSchema } from './ParsedContent.js';
export type { CodeBlock, ParsedContent } from './ParsedContent.js';

// ── Rule Finding ─────────────────────────────────────────────────────────────
export { RuleFindingSchema } from './RuleFinding.js';
export type { RuleFinding } from './RuleFinding.js';

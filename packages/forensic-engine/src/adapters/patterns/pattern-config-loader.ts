/**
 * @module pattern-config-loader
 * @description Loads and validates the declarative pattern-rules.json config.
 *
 * Provides typed PatternRulesConfig to the ExploitPatternRecognizer and
 * individual detectors. Supports both the bundled default config and
 * user-supplied overrides.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-005
 */

import type {
  ExploitPatternId,
  PatternRuleConfig,
  PatternRulesConfig,
} from '../../domain/pattern-types.js';

// Import the default rules as a JSON module
import defaultRules from './pattern-rules.json';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** All supported pattern IDs for validation. */
const ALL_PATTERN_IDS: readonly ExploitPatternId[] = [
  'FLASH_LOAN',
  'REENTRANCY',
  'ORACLE_MANIPULATION',
  'ACCESS_CONTROL',
  'ARITHMETIC_OVERFLOW',
  'FRONT_RUNNING',
  'DELEGATE_CALL_INJECTION',
  'SELF_DESTRUCT',
  'LOGIC_ERROR',
  'BRIDGE_EXPLOIT',
];

/** Default rule config used when a pattern is missing from the JSON. */
const DEFAULT_RULE: PatternRuleConfig = {
  minConfidence: 0.3,
  functionSignatures: [],
  knownAddresses: [],
  parameters: {},
};

// ═══════════════════════════════════════════════════════════════════════════════
// PatternConfigLoader
// ═══════════════════════════════════════════════════════════════════════════════

export class PatternConfigLoader {
  /**
   * Load the default pattern rules from the bundled JSON config.
   *
   * @returns A fully validated PatternRulesConfig
   */
  static loadDefault(): PatternRulesConfig {
    return PatternConfigLoader.validate(
      defaultRules.rules as unknown as Record<string, PatternRuleConfig>,
    );
  }

  /**
   * Load pattern rules from a custom configuration object,
   * merging with defaults for any missing patterns.
   *
   * @param customRules - Partial rules to merge with defaults
   * @returns A fully validated PatternRulesConfig
   */
  static loadCustom(
    customRules: Partial<Record<ExploitPatternId, Partial<PatternRuleConfig>>>,
  ): PatternRulesConfig {
    const baseRules = PatternConfigLoader.loadDefault();
    const mergedRules = { ...baseRules.rules };

    for (const [patternId, customRule] of Object.entries(customRules)) {
      const id = patternId as ExploitPatternId;
      if (ALL_PATTERN_IDS.includes(id) && customRule !== undefined) {
        mergedRules[id] = {
          ...mergedRules[id],
          ...customRule,
          parameters: {
            ...mergedRules[id].parameters,
            ...(customRule.parameters ?? {}),
          },
        };
      }
    }

    return { rules: mergedRules };
  }

  /**
   * Validate and normalize a raw rules record into a complete PatternRulesConfig.
   * Ensures every pattern ID has a valid rule, filling in defaults as needed.
   */
  private static validate(
    rawRules: Record<string, PatternRuleConfig>,
  ): PatternRulesConfig {
    const rules = {} as Record<ExploitPatternId, PatternRuleConfig>;

    for (const id of ALL_PATTERN_IDS) {
      const raw = rawRules[id];
      if (raw !== undefined) {
        rules[id] = {
          minConfidence:
            typeof raw.minConfidence === 'number'
              ? raw.minConfidence
              : DEFAULT_RULE.minConfidence,
          functionSignatures: Array.isArray(raw.functionSignatures)
            ? raw.functionSignatures
            : DEFAULT_RULE.functionSignatures,
          knownAddresses: Array.isArray(raw.knownAddresses)
            ? raw.knownAddresses
            : DEFAULT_RULE.knownAddresses,
          parameters:
            typeof raw.parameters === 'object' && raw.parameters !== null
              ? raw.parameters
              : DEFAULT_RULE.parameters,
        };
      } else {
        rules[id] = { ...DEFAULT_RULE };
      }
    }

    return { rules };
  }
}

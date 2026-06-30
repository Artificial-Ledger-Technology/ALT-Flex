import type {
  ISkillDataPort,
  ISafetyScannerPort,
  ICachePort,
  LoggerPort,
  CreateScanResultInput,
  AISkillFile,
  ScanVerdict,
} from '@aegis/core';
import type { SkillContentParser } from '../parsers/SkillContentParser.js';
import type { RegexRuleMatcher } from '../scanners/RegexRuleMatcher.js';
import type { ASTCodeAnalyzer } from '../scanners/ASTCodeAnalyzer.js';
import type { SemanticAnalyzer } from '../scanners/SemanticAnalyzer.js';
import type { SafetyScoreCalculator } from '../scanners/SafetyScoreCalculator.js';
import type { SafetyRuleLoader } from '../../infrastructure/safety-rules/rule-loader.js';

export class ScanSkillSafetyUseCase {
  private readonly logger: LoggerPort;

  constructor(
    private readonly skillRepo: ISkillDataPort,
    private readonly scannerPort: ISafetyScannerPort,
    private readonly cache: ICachePort,
    private readonly ruleLoader: SafetyRuleLoader,
    private readonly parser: SkillContentParser,
    private readonly regexMatcher: RegexRuleMatcher,
    private readonly astAnalyzer: ASTCodeAnalyzer,
    private readonly semanticAnalyzer: SemanticAnalyzer,
    private readonly scoreCalculator: SafetyScoreCalculator,
    logger: LoggerPort,
  ) {
    this.logger = logger.child({ useCase: 'ScanSkillSafetyUseCase' });
  }

  /**
   * Executes the safety scanning pipeline for a given skill file ID.
   * @param skillId The ID of the skill file to scan.
   * @returns The generated ScanVerdict, or null if the skill was not found or an error occurred.
   */
  public async execute(skillId: string): Promise<ScanVerdict | null> {
    this.logger.info(`Starting safety scan for skill ${skillId}`);
    const startMs = Date.now();

    try {
      // 1. Fetch skill file
      const skill = await this.skillRepo.findById(skillId);
      if (!skill) {
        this.logger.warn(`Skill ${skillId} not found`);
        return null;
      }

      // 2. Load rules
      const rules = this.ruleLoader.loadRules();

      // 3. Parse content
      const format = skill.format === 'text' ? 'markdown' : skill.format;
      const parsedContent = this.parser.parse(skill.content, format);

      // 4. Run analyzers
      const ruleFindings = this.regexMatcher.match(parsedContent, rules);
      const astFindings = this.astAnalyzer.analyze(parsedContent);
      const semanticFindings = this.semanticAnalyzer.scan(parsedContent);

      // 5. Calculate score
      const scanDurationMs = Date.now() - startMs;
      const verdict = this.scoreCalculator.calculate({
        ruleFindings,
        astFindings,
        semanticFindings,
        scanDurationMs,
        analyzersUsed: ['regex', 'ast', 'semantic'],
        scannerVersion: this.scannerPort.getVersion(),
      });

      // Update metadata with applied rules
      verdict.metadata.rulesApplied = rules.length;

      // 6. Persist result
      const scanResultInput = this.mapToCreateScanResultInput(skill, verdict);
      const savedResult = await this.scannerPort.saveResult(scanResultInput);

      // 7. Update skill label
      await this.skillRepo.updateSafetyLabel(skill.id, verdict.label, savedResult.id);

      // 8. Invalidate Redis cache
      try {
        await this.cache.delete(`aegis:skills:${skill.id}`);
        // Also invalidate list caches where this skill might appear
        await this.cache.deleteByPattern('aegis:skills:list:*');
      } catch (cacheErr) {
        this.logger.warn(`Failed to invalidate cache for skill ${skill.id}`, {
          error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        });
      }

      this.logger.info(`Completed safety scan for skill ${skillId}`, {
        label: verdict.label,
        score: verdict.score,
        durationMs: scanDurationMs,
      });

      return verdict;
    } catch (error) {
      this.logger.error(`Error during safety scan for skill ${skillId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // In case of error, we do not update the safety label (it remains UNANALYZED or whatever it was)
      return null;
    }
  }

  private mapToCreateScanResultInput(
    skill: AISkillFile,
    verdict: ScanVerdict,
  ): CreateScanResultInput {
    // Generate UUID v4 for the result manually or assume saveResult does it?
    // CreateScanResultInput omits 'id', 'createdAt', 'manualReviewStatus'

    // We need ruleMatches for CreateScanResultInput
    // Let's aggregate from findings
    const ruleMatchMap = new Map<string, { ruleId: string; category: unknown; count: number }>();

    for (const finding of verdict.findings) {
      if (!ruleMatchMap.has(finding.ruleId)) {
        ruleMatchMap.set(finding.ruleId, {
          ruleId: finding.ruleId,
          category: finding.category,
          count: 1,
        });
      } else {
        ruleMatchMap.get(finding.ruleId)!.count++;
      }
    }

    const ruleMatches = Array.from(ruleMatchMap.values()).map((r) => ({
      ruleId: r.ruleId,
      category: r.category as
        | 'prompt-injection'
        | 'code-exfiltration'
        | 'file-system-access'
        | 'network-request'
        | 'shell-execution'
        | 'data-extraction'
        | 'instruction-override'
        | 'obfuscation'
        | 'supply-chain'
        | 'other',
      matchCount: r.count,
      contributedToLabel: true, // simplified
    }));

    // Calculate counts
    const criticalCount = verdict.findings.filter((f) => f.severity === 'critical').length;
    const highCount = verdict.findings.filter((f) => f.severity === 'high').length;
    const mediumCount = verdict.findings.filter((f) => f.severity === 'medium').length;
    const lowCount = verdict.findings.filter((f) => f.severity === 'low').length;
    const infoCount = verdict.findings.filter((f) => f.severity === 'info').length;

    return {
      skillFileId: skill.id,
      scanTimestamp: new Date(),
      scanDurationMs: verdict.metadata.scanDurationMs,
      scannerVersion: verdict.metadata.scannerVersion,
      totalRulesEvaluated: verdict.metadata.rulesApplied,
      finalLabel: verdict.label,
      findings: verdict.findings.map((f) => ({
        ruleId: f.ruleId,
        ruleName: f.ruleName,
        category: f.category as
          | 'prompt-injection'
          | 'code-exfiltration'
          | 'file-system-access'
          | 'network-request'
          | 'shell-execution'
          | 'data-extraction'
          | 'instruction-override'
          | 'obfuscation'
          | 'supply-chain'
          | 'other',
        severity: f.severity,
        description: f.description,
        evidence: f.matchedText,
        lineNumber: f.location.line,
        columnNumber: f.location.column,
        confidence: f.confidence,
        isFalsePositive: false,
      })),
      ruleMatches,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      contentHashAtScan: skill.contentHash,
      reviewedBy: undefined,
      reviewNotes: undefined,
      overriddenLabel: undefined,
    };
  }
}

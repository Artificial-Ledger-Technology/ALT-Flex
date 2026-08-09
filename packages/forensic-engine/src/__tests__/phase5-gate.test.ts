/**
 * @module phase5-gate.test
 * @description Phase 5 Validation Gate — comprehensive assertion suite
 * verifying all engineering and academic criteria for the Forensic Engine.
 *
 * This file acts as the programmatic phase gate. Every test in this file
 * maps to an acceptance criterion defined in P5-EVM-013.
 *
 * @task P5-EVM-013
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// vitest sets process.cwd() to the package root (packages/forensic-engine)
const PKG_ROOT = process.cwd();
const REPO_ROOT = path.resolve(PKG_ROOT, '../..');

// ═══════════════════════════════════════════════════════════════════════════════
// Barrel Export Validation — Engineering Criteria
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5-EVM-013: Phase 5 Validation Gate', () => {
  // ── 1. Module Exports ─────────────────────────────────────────────────────

  describe('Adapter Barrel Exports', () => {
    it('1. should export ChainRpcProvider (P5-EVM-001)', async () => {
      const mod = await import('../adapters/rpc/index.js');
      expect(mod.ChainRpcProvider).toBeDefined();
      expect(typeof mod.ChainRpcProvider).toBe('function');
    });

    it('2. should export RateLimiter (P5-EVM-001)', async () => {
      const mod = await import('../adapters/rpc/index.js');
      expect(mod.RateLimiter).toBeDefined();
    });

    it('3. should export FoundryService (P5-EVM-002)', async () => {
      const mod = await import('../adapters/foundry/index.js');
      expect(mod.FoundryService).toBeDefined();
    });

    it('4. should export ForgeOutputParser (P5-EVM-002)', async () => {
      const mod = await import('../adapters/foundry/index.js');
      expect(mod.ForgeOutputParser).toBeDefined();
    });

    it('5. should export TransactionTraceAnalyzer (P5-EVM-003)', async () => {
      const mod = await import('../adapters/tracing/index.js');
      expect(mod.TransactionTraceAnalyzer).toBeDefined();
    });

    it('6. should export StorageDiffAnalyzer (P5-EVM-004)', async () => {
      const mod = await import('../adapters/storage/index.js');
      expect(mod.StorageDiffAnalyzer).toBeDefined();
    });

    it('7. should export StorageSlotDiscoverer (P5-EVM-004)', async () => {
      const mod = await import('../adapters/storage/index.js');
      expect(mod.StorageSlotDiscoverer).toBeDefined();
    });

    it('8. should export ExploitPatternRecognizer (P5-EVM-005)', async () => {
      const mod = await import('../adapters/patterns/index.js');
      expect(mod.ExploitPatternRecognizer).toBeDefined();
    });

    it('9. should export all 10 individual pattern detectors (P5-EVM-005)', async () => {
      const mod = await import('../adapters/patterns/index.js');
      const detectors = [
        'FlashLoanDetector',
        'ReentrancyDetector',
        'OracleManipulationDetector',
        'AccessControlDetector',
        'ArithmeticOverflowDetector',
        'FrontRunningDetector',
        'DelegateCallInjectionDetector',
        'SelfDestructDetector',
        'LogicErrorDetector',
        'BridgeExploitDetector',
      ];
      for (const name of detectors) {
        expect((mod as Record<string, unknown>)[name], `Missing detector: ${name}`).toBeDefined();
      }
    });

    it('10. should export ForensicAnalysisUseCase (P5-EVM-006)', async () => {
      const mod = await import('../application/forensic-analysis.use-case.js');
      expect(mod.ForensicAnalysisUseCase).toBeDefined();
    });
  });

  // ── 2. Domain Type Exports ────────────────────────────────────────────────

  describe('Domain Type Exports', () => {
    it('11. should export trace domain types (P5-EVM-003)', async () => {
      const mod = await import('../domain/trace-types.js');
      expect(mod).toBeDefined();
    });

    it('12. should export storage domain types (P5-EVM-004)', async () => {
      const mod = await import('../domain/storage-types.js');
      expect(mod.KNOWN_BALANCE_SLOTS).toBeDefined();
      expect(Array.isArray(mod.KNOWN_BALANCE_SLOTS)).toBe(true);
    });

    it('13. should export pattern domain types (P5-EVM-005)', async () => {
      const mod = await import('../domain/pattern-types.js');
      expect(mod).toBeDefined();
    });

    it('14. should export forge domain types (P5-EVM-002)', async () => {
      const mod = await import('../domain/forge-types.js');
      expect(mod).toBeDefined();
    });

    it('15. should export report domain types (P5-EVM-006)', async () => {
      const mod = await import('../domain/report-types.js');
      expect(mod).toBeDefined();
    });
  });

  // ── 3. Evaluation Pipeline (Academic Criteria) ────────────────────────────

  describe('Evaluation Pipeline (Thesis 2)', () => {
    it('16. should export evaluation pipeline functions (P5-EVM-012)', async () => {
      const mod = await import('../evaluation/index.js');
      expect(mod.evaluate).toBeDefined();
      expect(mod.computePerPatternMetrics).toBeDefined();
      expect(mod.computeMacroAverages).toBeDefined();
      expect(mod.buildConfusionMatrix).toBeDefined();
      expect(mod.generateEvaluationReport).toBeDefined();
    });

    it('17. should have evaluation dataset with ≥50 labeled entries', () => {
      const datasetPath = path.join(
        PKG_ROOT,
        'src/__tests__/fixtures/evaluation-dataset/evaluation-dataset.json',
      );
      expect(fs.existsSync(datasetPath)).toBe(true);

      const raw = fs.readFileSync(datasetPath, 'utf-8');
      const dataset = JSON.parse(raw);
      // Dataset is a top-level array
      const entries = Array.isArray(dataset) ? dataset : dataset.entries ?? dataset.samples ?? [];
      expect(entries.length).toBeGreaterThanOrEqual(50);
    });

    it('18. should have methodology documentation', () => {
      const methodologyPath = path.join(
        PKG_ROOT,
        'src/__tests__/fixtures/evaluation-dataset/METHODOLOGY.md',
      );
      expect(fs.existsSync(methodologyPath)).toBe(true);

      const content = fs.readFileSync(methodologyPath, 'utf-8');
      expect(content.length).toBeGreaterThan(500);
      expect(content.toLowerCase()).toContain('methodology');
    });

    it('19. should have ALL_PATTERN_IDS covering 10 pattern types', async () => {
      const { ALL_PATTERN_IDS } = await import('../evaluation/evaluator-types.js');
      expect(ALL_PATTERN_IDS.length).toBe(10);
    });
  });

  // ── 4. Infrastructure & Queue ─────────────────────────────────────────────

  describe('Infrastructure Exports', () => {
    it('20. should export forensics queue (P5-EVM-006)', async () => {
      const mod = await import('../infrastructure/queue/forensics-queue.js');
      expect(mod).toBeDefined();
    }, 30000);
  });

  // ── 5. File Structure Validation ──────────────────────────────────────────

  describe('File Structure Validation', () => {
    it('21. should have forensics API routes (P5-EVM-007)', () => {
      const routesPath = path.join(REPO_ROOT, 'apps/api-gateway/src/routes/forensics.routes.ts');
      expect(fs.existsSync(routesPath)).toBe(true);
    });

    it('22. should have TraceViewer frontend component (P5-EVM-008)', () => {
      const componentPath = path.join(REPO_ROOT, 'apps/web/src/components/forensics/TraceViewer.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('23. should have StorageDiffInspector frontend component (P5-EVM-009)', () => {
      const componentPath = path.join(REPO_ROOT, 'apps/web/src/components/forensics/StorageDiffInspector.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('24. should have PatternReport frontend component (P5-EVM-010)', () => {
      const componentPath = path.join(REPO_ROOT, 'apps/web/src/components/forensics/PatternReport.tsx');
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('25. should have evaluation dataset schema (P5-EVM-011)', () => {
      const schemaPath = path.join(
        PKG_ROOT,
        'src/__tests__/fixtures/evaluation-dataset/evaluation-dataset.schema.ts',
      );
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    it('26. should have pattern evaluator (P5-EVM-012)', () => {
      const evaluatorPath = path.join(
        PKG_ROOT,
        'src/evaluation/pattern-evaluator.ts',
      );
      expect(fs.existsSync(evaluatorPath)).toBe(true);
    });
  });
});

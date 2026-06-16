import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SafetyLabel } from '@aegis/core';

const DATASET_DIR = join(
  __dirname,
  'fixtures',
  'evaluation-dataset',
);

interface ManifestEntry {
  id: string;
  filePath: string;
  groundTruthLabel: string;
  category: string;
  description: string;
  rationale: string;
  expectedRuleMatches: string[];
  labelerConfidence: number;
  format: string;
}

interface ManifestJson {
  version: string;
  generatedAt: string;
  labeler: string;
  totalSamples: number;
  distribution: { safe: number; suspicious: number; malicious: number };
  samples: ManifestEntry[];
}

function loadManifest(): ManifestJson {
  const manifestPath = join(DATASET_DIR, 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as ManifestJson;
}

describe('Evaluation Dataset Integrity', () => {
  const manifest = loadManifest();

  describe('Manifest Structure', () => {
    it('should have version 1.0.0', () => {
      expect(manifest.version).toBe('1.0.0');
    });

    it('should have a valid generatedAt ISO timestamp', () => {
      expect(new Date(manifest.generatedAt).toISOString()).toBe(manifest.generatedAt);
    });

    it('should have a labeler identifier', () => {
      expect(manifest.labeler).toBeTruthy();
      expect(typeof manifest.labeler).toBe('string');
    });

    it('should declare totalSamples equal to 100', () => {
      expect(manifest.totalSamples).toBe(100);
    });

    it('should have distribution summing to totalSamples', () => {
      const { safe, suspicious, malicious } = manifest.distribution;
      expect(safe + suspicious + malicious).toBe(manifest.totalSamples);
    });
  });

  describe('Sample Count and Distribution', () => {
    it('should contain exactly 100 sample entries', () => {
      expect(manifest.samples).toHaveLength(100);
    });

    it('should have ~50 safe samples', () => {
      const safeCount = manifest.samples.filter(
        (s) => s.groundTruthLabel === 'SAFE',
      ).length;
      expect(safeCount).toBe(manifest.distribution.safe);
      expect(safeCount).toBe(50);
    });

    it('should have ~25 suspicious samples', () => {
      const suspiciousCount = manifest.samples.filter(
        (s) => s.groundTruthLabel === 'SUSPICIOUS',
      ).length;
      expect(suspiciousCount).toBe(manifest.distribution.suspicious);
      expect(suspiciousCount).toBe(25);
    });

    it('should have ~25 malicious samples', () => {
      const maliciousCount = manifest.samples.filter(
        (s) => s.groundTruthLabel === 'MALICIOUS',
      ).length;
      expect(maliciousCount).toBe(manifest.distribution.malicious);
      expect(maliciousCount).toBe(25);
    });
  });

  describe('Sample Uniqueness', () => {
    it('should have no duplicate sample IDs', () => {
      const ids = manifest.samples.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have no duplicate file paths', () => {
      const paths = manifest.samples.map((s) => s.filePath);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });
  });

  describe('Sample Field Validation', () => {
    it('should have valid groundTruthLabel for every sample', () => {
      const validLabels = ['SAFE', 'SUSPICIOUS', 'MALICIOUS'];
      for (const sample of manifest.samples) {
        expect(validLabels).toContain(sample.groundTruthLabel);
      }
    });

    it('should have non-empty rationale for every sample', () => {
      for (const sample of manifest.samples) {
        expect(sample.rationale.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty description for every sample', () => {
      for (const sample of manifest.samples) {
        expect(sample.description.length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty category for every sample', () => {
      for (const sample of manifest.samples) {
        expect(sample.category.length).toBeGreaterThan(0);
      }
    });

    it('should have valid format for every sample', () => {
      const validFormats = ['markdown', 'yaml', 'json', 'toml'];
      for (const sample of manifest.samples) {
        expect(validFormats).toContain(sample.format);
      }
    });

    it('should have labelerConfidence between 0 and 1 for every sample', () => {
      for (const sample of manifest.samples) {
        expect(sample.labelerConfidence).toBeGreaterThanOrEqual(0);
        expect(sample.labelerConfidence).toBeLessThanOrEqual(1);
      }
    });

    it('should have expectedRuleMatches as an array for every sample', () => {
      for (const sample of manifest.samples) {
        expect(Array.isArray(sample.expectedRuleMatches)).toBe(true);
      }
    });
  });

  describe('File Existence', () => {
    it('should have all referenced sample files present on disk', () => {
      const missingFiles: string[] = [];
      for (const sample of manifest.samples) {
        const filePath = join(DATASET_DIR, sample.filePath);
        if (!existsSync(filePath)) {
          missingFiles.push(sample.filePath);
        }
      }
      expect(missingFiles).toEqual([]);
    });

    it('should have non-empty content in every sample file', () => {
      for (const sample of manifest.samples) {
        const filePath = join(DATASET_DIR, sample.filePath);
        const content = readFileSync(filePath, 'utf-8');
        expect(content.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('File Naming Conventions', () => {
    it('should have safe samples in the safe/ directory', () => {
      const safeSamples = manifest.samples.filter(
        (s) => s.groundTruthLabel === 'SAFE',
      );
      for (const sample of safeSamples) {
        expect(sample.filePath).toMatch(/^safe\//);
      }
    });

    it('should have suspicious samples in the suspicious/ directory', () => {
      const suspiciousSamples = manifest.samples.filter(
        (s) => s.groundTruthLabel === 'SUSPICIOUS',
      );
      for (const sample of suspiciousSamples) {
        expect(sample.filePath).toMatch(/^suspicious\//);
      }
    });

    it('should have malicious samples in the malicious/ directory', () => {
      const maliciousSamples = manifest.samples.filter(
        (s) => s.groundTruthLabel === 'MALICIOUS',
      );
      for (const sample of maliciousSamples) {
        expect(sample.filePath).toMatch(/^malicious\//);
      }
    });
  });

  describe('Malicious Coverage', () => {
    it('should cover shell injection category (5+ samples)', () => {
      const count = manifest.samples.filter(
        (s) =>
          s.groundTruthLabel === 'MALICIOUS' && s.category === 'shell-injection',
      ).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should cover file system manipulation category (5+ samples)', () => {
      const count = manifest.samples.filter(
        (s) =>
          s.groundTruthLabel === 'MALICIOUS' && s.category === 'fs-manipulation',
      ).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should cover network exfiltration category (5+ samples)', () => {
      const count = manifest.samples.filter(
        (s) =>
          s.groundTruthLabel === 'MALICIOUS' && s.category === 'network-exfil',
      ).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should cover prompt injection category (5+ samples)', () => {
      const count = manifest.samples.filter(
        (s) =>
          s.groundTruthLabel === 'MALICIOUS' && s.category === 'prompt-injection',
      ).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should cover obfuscation category (5+ samples)', () => {
      const count = manifest.samples.filter(
        (s) =>
          s.groundTruthLabel === 'MALICIOUS' && s.category === 'obfuscation',
      ).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });
  });
});

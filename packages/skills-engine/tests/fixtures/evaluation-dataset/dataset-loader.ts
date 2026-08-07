import { readFileSync } from 'fs';
import { join } from 'path';
import { SafetyLabel } from '@aegis/core';

/**
 * Represents a single evaluation sample from the labeled dataset.
 */
export interface EvaluationSample {
  /** Unique identifier (e.g., 'safe-001', 'malicious-015') */
  id: string;
  /** Relative path to the sample file from the dataset root */
  filePath: string;
  /** The human-assigned ground truth label */
  groundTruthLabel: SafetyLabel;
  /** Category within its label group (e.g., 'shell-injection', 'general-utility') */
  category: string;
  /** Short description of what the sample contains */
  description: string;
  /** Human-written explanation of why this label was assigned */
  rationale: string;
  /** Rule IDs expected to match (e.g., ['SHELL-001', 'FS-002']) */
  expectedRuleMatches: string[];
  /** Labeler confidence in the assigned label (0.0–1.0) */
  labelerConfidence: number;
  /** Content format of the sample file */
  format: 'markdown' | 'yaml' | 'json' | 'toml';
  /** The raw file content, loaded from disk */
  content: string;
}

/**
 * Represents the full evaluation dataset with metadata.
 */
export interface EvaluationDataset {
  /** Dataset schema version */
  version: string;
  /** ISO 8601 timestamp of generation */
  generatedAt: string;
  /** Identifier of the labeler */
  labeler: string;
  /** Total number of samples */
  totalSamples: number;
  /** Distribution counts by label */
  distribution: {
    safe: number;
    suspicious: number;
    malicious: number;
  };
  /** All loaded samples with their content */
  samples: EvaluationSample[];
}

/**
 * Raw manifest entry before content is loaded.
 */
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

/**
 * Raw manifest JSON structure.
 */
interface ManifestJson {
  version: string;
  generatedAt: string;
  labeler: string;
  totalSamples: number;
  distribution: {
    safe: number;
    suspicious: number;
    malicious: number;
  };
  samples: ManifestEntry[];
}

/**
 * Maps ground truth label strings to SafetyLabel enum values.
 */
function mapLabel(label: string): SafetyLabel {
  switch (label) {
    case 'SAFE':
      return SafetyLabel.SAFE;
    case 'SUSPICIOUS':
      return SafetyLabel.SUSPICIOUS;
    case 'MALICIOUS':
      return SafetyLabel.MALICIOUS;
    default:
      throw new Error(`Unknown ground truth label: ${label}`);
  }
}

/**
 * Loads the complete evaluation dataset from disk.
 *
 * Reads the manifest.json, then loads each referenced sample file
 * and attaches its content to the returned EvaluationSample objects.
 *
 * @param datasetDir — Absolute path to the evaluation-dataset directory.
 *                     Defaults to the directory containing this file.
 * @returns The fully loaded EvaluationDataset.
 */
export function loadDataset(datasetDir?: string): EvaluationDataset {
  const baseDir = datasetDir ?? __dirname;
  const manifestPath = join(baseDir, 'manifest.json');

  const manifestRaw = readFileSync(manifestPath, 'utf-8');
  const manifest: ManifestJson = JSON.parse(manifestRaw) as ManifestJson;

  const samples: EvaluationSample[] = manifest.samples.map((entry) => {
    const samplePath = join(baseDir, entry.filePath);
    const content = readFileSync(samplePath, 'utf-8');

    return {
      id: entry.id,
      filePath: entry.filePath,
      groundTruthLabel: mapLabel(entry.groundTruthLabel),
      category: entry.category,
      description: entry.description,
      rationale: entry.rationale,
      expectedRuleMatches: entry.expectedRuleMatches,
      labelerConfidence: entry.labelerConfidence,
      format: entry.format as EvaluationSample['format'],
      content,
    };
  });

  return {
    version: manifest.version,
    generatedAt: manifest.generatedAt,
    labeler: manifest.labeler,
    totalSamples: manifest.totalSamples,
    distribution: manifest.distribution,
    samples,
  };
}

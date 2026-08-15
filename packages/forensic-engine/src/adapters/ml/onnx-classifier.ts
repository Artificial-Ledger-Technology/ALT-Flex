/**
 * @module onnx-classifier
 * @description ONNX Runtime wrapper for multi-label exploit classification.
 *
 * Loads the 10 individual One-vs-Rest XGBoost ONNX models exported by the
 * Python training pipeline (P7-ML-002) and runs inference to produce
 * confidence-scored `PatternMatch[]` results.
 *
 * The model architecture is:
 *   Input:  Float32[1, 28] — feature vector from TraceFeatureExtractor
 *   Output: 10 binary probabilities — one per ExploitPatternId
 *
 * Each binary classifier is a separate `.onnx` file. The mapping between
 * file names and pattern labels is stored in the meta.json manifest.
 *
 * @hexagonal Adapter Layer — ML Subsystem
 * @task P7-ML-003
 */

import * as ort from 'onnxruntime-node';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

import type {
  ExploitPatternId,
  PatternMatch,
  PatternEvidence,
} from '../../domain/pattern-types.js';
import { FEATURE_NAMES } from './trace-feature-extractor.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Metadata manifest produced by the Python export_onnx.py script. */
export interface OnnxModelManifest {
  readonly model_type: string;
  readonly input_shape: readonly [number, number];
  readonly output_shape: readonly [number, number];
  readonly pattern_labels: readonly string[];
  readonly feature_names: readonly string[];
  readonly individual_models: readonly string[];
  readonly status?: string;
}

/** Configuration options for OnnxExploitClassifier. */
export interface OnnxClassifierOptions {
  /**
   * Absolute path to the directory containing ONNX model files and meta.json.
   * Defaults to `<project_root>/research/models/`.
   */
  readonly modelDir?: string;

  /**
   * Per-pattern confidence thresholds. Patterns with prediction confidence
   * below their threshold are excluded from results.
   * Falls back to `defaultConfidenceThreshold` if a pattern is not listed.
   */
  readonly confidenceThresholds?: Readonly<Record<string, number>>;

  /**
   * Global default confidence threshold when no per-pattern value is set.
   * @default 0.3
   */
  readonly defaultConfidenceThreshold?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OnnxExploitClassifier
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ONNX Runtime wrapper that loads 10 OvR XGBoost classifiers and produces
 * multi-label exploit pattern predictions.
 *
 * Lifecycle:
 *   1. `new OnnxExploitClassifier(options?)`
 *   2. `await classifier.initialize()` — loads models
 *   3. `await classifier.predict(features)` — run inference (repeatable)
 *   4. `await classifier.dispose()` — free native resources
 */
export class OnnxExploitClassifier {
  private readonly modelDir: string;
  private readonly defaultThreshold: number;
  private readonly thresholds: Readonly<Record<string, number>>;

  private sessions: ort.InferenceSession[] = [];
  private manifest: OnnxModelManifest | null = null;
  private ready = false;

  constructor(options?: OnnxClassifierOptions) {
    this.modelDir = options?.modelDir ?? resolve(process.cwd(), 'research', 'models');
    this.defaultThreshold = options?.defaultConfidenceThreshold ?? 0.3;
    this.thresholds = options?.confidenceThresholds ?? {};
  }

  /**
   * Load the ONNX model manifest and create inference sessions for all
   * individual OvR classifiers.
   *
   * If the model directory or manifest is missing, the classifier remains
   * in a non-ready state (graceful degradation for heuristic fallback).
   */
  async initialize(): Promise<void> {
    const metaPath = join(this.modelDir, 'xgboost_exploit_classifier.onnx.meta.json');

    if (!existsSync(metaPath)) {
      // Model files not present — remain non-ready for heuristic fallback
      return;
    }

    try {
      const raw = await readFile(metaPath, 'utf-8');
      this.manifest = JSON.parse(raw) as OnnxModelManifest;
    } catch {
      // Corrupted manifest — remain non-ready
      return;
    }

    // Guard: if the export is pending, there are no actual ONNX binaries
    if (this.manifest.status === 'pending_onnx_export') {
      return;
    }

    // Validate manifest structure
    if (
      !this.manifest.individual_models ||
      this.manifest.individual_models.length === 0 ||
      !this.manifest.pattern_labels ||
      this.manifest.pattern_labels.length !== this.manifest.individual_models.length
    ) {
      return;
    }

    // Verify feature count matches our TypeScript extractor
    if (
      this.manifest.feature_names &&
      this.manifest.feature_names.length !== FEATURE_NAMES.length
    ) {
      return;
    }

    // Load each individual OvR model session
    const loadedSessions: ort.InferenceSession[] = [];

    for (const modelFile of this.manifest.individual_models) {
      const modelPath = join(this.modelDir, modelFile);

      if (!existsSync(modelPath)) {
        // If any model file is missing, abort (partial loading is unreliable)
        for (const session of loadedSessions) {
          await session.release();
        }
        return;
      }

      try {
        const session = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['cpu'],
        });
        loadedSessions.push(session);
      } catch {
        // ONNX Runtime load failure — abort and clean up
        for (const session of loadedSessions) {
          await session.release();
        }
        return;
      }
    }

    this.sessions = loadedSessions;
    this.ready = true;
  }

  /**
   * Returns true if all ONNX models are loaded and inference is available.
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Returns the loaded model manifest, or null if not initialized.
   */
  getManifest(): OnnxModelManifest | null {
    return this.manifest;
  }

  /**
   * Run multi-label inference on a 28-feature vector.
   *
   * Each OvR classifier outputs a probability for its corresponding
   * exploit pattern. Results are filtered by confidence threshold and
   * returned as `PatternMatch[]` sorted by confidence descending.
   *
   * @param features - Float64Array of length 28 from TraceFeatureExtractor
   * @returns PatternMatch[] with ML confidence scores, sorted descending
   * @throws If the classifier is not initialized (call `initialize()` first)
   */
  async predict(features: Float64Array): Promise<PatternMatch[]> {
    if (!this.ready || !this.manifest) {
      throw new Error(
        'OnnxExploitClassifier is not initialized. Call initialize() first.',
      );
    }

    if (features.length !== FEATURE_NAMES.length) {
      throw new Error(
        `Expected feature vector of length ${FEATURE_NAMES.length}, got ${features.length}`,
      );
    }

    // Convert Float64Array → Float32Array for ONNX Runtime
    const inputFloat32 = new Float32Array(features.length);
    for (let i = 0; i < features.length; i++) {
      inputFloat32[i] = features[i] as number;
    }

    const inputTensor = new ort.Tensor('float32', inputFloat32, [1, features.length]);

    const matches: PatternMatch[] = [];

    for (let labelIdx = 0; labelIdx < this.sessions.length; labelIdx++) {
      const session = this.sessions[labelIdx]!;
      const patternLabel = this.manifest.pattern_labels[labelIdx]!;

      try {
        // Determine the input name from the session's input metadata
        const inputName = session.inputNames[0]!;
        const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

        const results = await session.run(feeds);

        // Extract probability — OvR classifiers output probabilities or label+probabilities
        const confidence = this.extractConfidence(results, session.outputNames);

        const threshold = this.thresholds[patternLabel] ?? this.defaultThreshold;

        if (confidence >= threshold) {
          matches.push(this.buildPatternMatch(patternLabel, confidence));
        }
      } catch {
        // Individual model inference failure — skip this pattern silently
        continue;
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Release all ONNX inference sessions and free native resources.
   */
  async dispose(): Promise<void> {
    for (const session of this.sessions) {
      try {
        await session.release();
      } catch {
        // Best-effort cleanup
      }
    }
    this.sessions = [];
    this.ready = false;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Extract the positive-class probability from ONNX Runtime output.
   *
   * XGBoost ONNX models typically produce two output tensors:
   *   - "label" (int64): predicted class [0 or 1]
   *   - "probabilities" (float): [[prob_class_0, prob_class_1]]
   *
   * We extract prob_class_1 (positive class = exploit pattern present).
   */
  private extractConfidence(
    results: ort.InferenceSession.OnnxValueMapType,
    outputNames: readonly string[],
  ): number {
    // Look for a "probabilities" output first (standard XGBoost ONNX)
    for (const name of outputNames) {
      if (name.toLowerCase().includes('probabilities') || name.toLowerCase().includes('prob')) {
        const tensor = results[name];
        if (tensor && tensor.data) {
          const data = tensor.data as Float32Array;
          // For binary classification: [prob_negative, prob_positive]
          if (data.length >= 2) {
            return data[1] as number;
          }
          // Single probability output
          if (data.length === 1) {
            return data[0] as number;
          }
        }
      }
    }

    // Fallback: try the last output tensor (common convention)
    const lastOutput = results[outputNames[outputNames.length - 1]!];
    if (lastOutput && lastOutput.data) {
      const data = lastOutput.data as Float32Array;
      if (data.length >= 2) {
        return data[1] as number;
      }
      if (data.length === 1) {
        return data[0] as number;
      }
    }

    return 0;
  }

  /**
   * Build a PatternMatch from an ONNX prediction result.
   */
  private buildPatternMatch(patternLabel: string, confidence: number): PatternMatch {
    const patternId = patternLabel as ExploitPatternId;

    // Human-readable name from the pattern ID
    const patternName = patternLabel
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const evidence: PatternEvidence = {
      callNodeIds: [],
      storageSlots: [],
      eventSignatures: [],
      details: {
        source: 'ml_onnx_inference',
        modelType: 'xgboost_ovr',
        rawConfidence: confidence,
      },
    };

    return {
      patternId,
      patternName,
      confidence: Math.round(confidence * 10000) / 10000, // 4 decimal places
      description: `ML model detected ${patternName} pattern with ${(confidence * 100).toFixed(1)}% confidence`,
      evidence,
    };
  }
}

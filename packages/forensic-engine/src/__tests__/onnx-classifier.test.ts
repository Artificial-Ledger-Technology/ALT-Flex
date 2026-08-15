/**
 * @module onnx-classifier.test
 * @description Unit tests for the OnnxExploitClassifier.
 *
 * Tests cover:
 * - Graceful degradation when models are missing
 * - Initialization with valid/invalid manifest
 * - Prediction with mocked ONNX sessions
 * - Session disposal lifecycle
 *
 * Note: Tests use vi.mock to mock onnxruntime-node, so no real ONNX
 * model files are needed.
 *
 * @task P7-ML-003
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OnnxExploitClassifier, type OnnxModelManifest } from '../adapters/ml/onnx-classifier.js';
import { FEATURE_NAMES } from '../adapters/ml/trace-feature-extractor.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock onnxruntime-node
// ═══════════════════════════════════════════════════════════════════════════════

const mockRelease = vi.fn().mockResolvedValue(undefined);
const mockRun = vi.fn();

const mockSessionCreate = vi.fn();

vi.mock('onnxruntime-node', () => ({
  InferenceSession: {
    create: (...args: unknown[]) => mockSessionCreate(...args),
  },
  Tensor: class MockTensor {
    readonly type: string;
    readonly data: Float32Array;
    readonly dims: number[];
    constructor(type: string, data: Float32Array, dims: number[]) {
      this.type = type;
      this.data = data;
      this.dims = dims;
    }
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Mock filesystem
// ═══════════════════════════════════════════════════════════════════════════════

const mockExistsSync = vi.fn();
const mockReadFile = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
}));

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════════════════════════

const PATTERN_LABELS = [
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

const VALID_MANIFEST: OnnxModelManifest = {
  model_type: 'one_vs_rest_xgboost_onnx',
  input_shape: [1, 28],
  output_shape: [1, 10],
  pattern_labels: PATTERN_LABELS,
  feature_names: FEATURE_NAMES as unknown as string[],
  individual_models: PATTERN_LABELS.map((p, i) => `xgb_label_${i}_${p}.onnx`),
};

function createMockSession(confidence: number) {
  return {
    inputNames: ['features'],
    outputNames: ['label', 'probabilities'],
    run: vi.fn().mockResolvedValue({
      probabilities: {
        data: new Float32Array([1 - confidence, confidence]),
      },
    }),
    release: mockRelease,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('OnnxExploitClassifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  // ── Initialization Tests ────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should remain non-ready when meta.json is missing', async () => {
      mockExistsSync.mockReturnValue(false);

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      expect(classifier.isReady()).toBe(false);
      expect(classifier.getManifest()).toBeNull();
    });

    it('should remain non-ready when meta.json has pending status', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({ ...VALID_MANIFEST, status: 'pending_onnx_export' }),
      );

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      expect(classifier.isReady()).toBe(false);
    });

    it('should remain non-ready when manifest has mismatched feature count', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          ...VALID_MANIFEST,
          feature_names: ['only_one_feature'],
        }),
      );

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      expect(classifier.isReady()).toBe(false);
    });

    it('should remain non-ready when a model file is missing', async () => {
      // Meta.json exists, but individual model files don't
      mockExistsSync.mockImplementation((path: string) => {
        if (path.endsWith('.meta.json')) return true;
        return false; // model files missing
      });
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      expect(classifier.isReady()).toBe(false);
    });

    it('should become ready when all model files are present and loadable', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));
      mockSessionCreate.mockResolvedValue(createMockSession(0.5));

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      expect(classifier.isReady()).toBe(true);
      expect(classifier.getManifest()).toEqual(VALID_MANIFEST);
      expect(mockSessionCreate).toHaveBeenCalledTimes(10);
    });

    it('should abort and clean up when a session fails to load', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));

      // First 5 sessions load, 6th throws
      let callCount = 0;
      mockSessionCreate.mockImplementation(() => {
        callCount++;
        if (callCount === 6) {
          throw new Error('ONNX load failure');
        }
        return Promise.resolve(createMockSession(0.5));
      });

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      expect(classifier.isReady()).toBe(false);
      // The 5 successfully loaded sessions should have been released
      expect(mockRelease).toHaveBeenCalledTimes(5);
    });
  });

  // ── Prediction Tests ────────────────────────────────────────────────────────

  describe('predict', () => {
    it('should throw if not initialized', async () => {
      const classifier = new OnnxExploitClassifier();
      await expect(
        classifier.predict(new Float64Array(28)),
      ).rejects.toThrow('not initialized');
    });

    it('should throw if feature vector has wrong length', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));
      mockSessionCreate.mockResolvedValue(createMockSession(0.5));

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      await expect(
        classifier.predict(new Float64Array(10)),
      ).rejects.toThrow('Expected feature vector of length 28');
    });

    it('should return matches above confidence threshold', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));

      // Only FLASH_LOAN (idx 0) and REENTRANCY (idx 1) above 0.3 threshold
      const sessions = PATTERN_LABELS.map((_, i) => {
        if (i === 0) return createMockSession(0.85); // FLASH_LOAN
        if (i === 1) return createMockSession(0.72); // REENTRANCY
        return createMockSession(0.1); // below threshold
      });

      let sessionIdx = 0;
      mockSessionCreate.mockImplementation(() => {
        return Promise.resolve(sessions[sessionIdx++]);
      });

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      const features = new Float64Array(28);
      const results = await classifier.predict(features);

      expect(results).toHaveLength(2);
      expect(results[0]!.patternId).toBe('FLASH_LOAN');
      expect(results[0]!.confidence).toBeCloseTo(0.85, 2);
      expect(results[1]!.patternId).toBe('REENTRANCY');
      expect(results[1]!.confidence).toBeCloseTo(0.72, 2);
    });

    it('should return results sorted by confidence descending', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));

      // REENTRANCY highest, then ACCESS_CONTROL, then FLASH_LOAN
      const sessions = PATTERN_LABELS.map((_, i) => {
        if (i === 0) return createMockSession(0.5);  // FLASH_LOAN
        if (i === 1) return createMockSession(0.9);  // REENTRANCY
        if (i === 3) return createMockSession(0.7);  // ACCESS_CONTROL
        return createMockSession(0.1);
      });

      let sessionIdx = 0;
      mockSessionCreate.mockImplementation(() => {
        return Promise.resolve(sessions[sessionIdx++]);
      });

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      const results = await classifier.predict(new Float64Array(28));

      expect(results[0]!.patternId).toBe('REENTRANCY');
      expect(results[1]!.patternId).toBe('ACCESS_CONTROL');
      expect(results[2]!.patternId).toBe('FLASH_LOAN');
    });

    it('should return empty array when no patterns exceed threshold', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));
      mockSessionCreate.mockResolvedValue(createMockSession(0.1));

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      const results = await classifier.predict(new Float64Array(28));
      expect(results).toHaveLength(0);
    });

    it('should respect custom per-pattern confidence thresholds', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));

      // All return 0.4 confidence
      mockSessionCreate.mockResolvedValue(createMockSession(0.4));

      const classifier = new OnnxExploitClassifier({
        modelDir: '/fake/models',
        defaultConfidenceThreshold: 0.5, // Most patterns filtered
        confidenceThresholds: {
          FLASH_LOAN: 0.3, // This one passes
        },
      });
      await classifier.initialize();

      const results = await classifier.predict(new Float64Array(28));
      expect(results).toHaveLength(1);
      expect(results[0]!.patternId).toBe('FLASH_LOAN');
    });

    it('should include ML source metadata in evidence', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));
      mockSessionCreate.mockResolvedValue(createMockSession(0.8));

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      const results = await classifier.predict(new Float64Array(28));
      const match = results[0]!;

      expect(match.evidence.details).toEqual(
        expect.objectContaining({
          source: 'ml_onnx_inference',
          modelType: 'xgboost_ovr',
        }),
      );
    });

    it('should skip a pattern gracefully if its session inference fails', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));

      const sessions = PATTERN_LABELS.map((_, i) => {
        if (i === 0) {
          // FLASH_LOAN session throws during inference
          return {
            inputNames: ['features'],
            outputNames: ['label', 'probabilities'],
            run: vi.fn().mockRejectedValue(new Error('inference error')),
            release: mockRelease,
          };
        }
        if (i === 1) return createMockSession(0.8); // REENTRANCY succeeds
        return createMockSession(0.1);
      });

      let sessionIdx = 0;
      mockSessionCreate.mockImplementation(() => {
        return Promise.resolve(sessions[sessionIdx++]);
      });

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();

      const results = await classifier.predict(new Float64Array(28));
      expect(results).toHaveLength(1);
      expect(results[0]!.patternId).toBe('REENTRANCY');
    });
  });

  // ── Disposal Tests ──────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('should release all sessions and become non-ready', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(VALID_MANIFEST));
      mockSessionCreate.mockResolvedValue(createMockSession(0.5));

      const classifier = new OnnxExploitClassifier({ modelDir: '/fake/models' });
      await classifier.initialize();
      expect(classifier.isReady()).toBe(true);

      await classifier.dispose();

      expect(classifier.isReady()).toBe(false);
      expect(mockRelease).toHaveBeenCalledTimes(10);
    });

    it('should be safe to call dispose on non-initialized classifier', async () => {
      const classifier = new OnnxExploitClassifier();
      await expect(classifier.dispose()).resolves.not.toThrow();
    });
  });
});

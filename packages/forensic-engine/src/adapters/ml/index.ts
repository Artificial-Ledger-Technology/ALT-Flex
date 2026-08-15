/**
 * @module ml/index
 * @description Barrel export for the Machine Learning subsystem.
 *
 * Exposes the ONNX Runtime classifier for multi-label exploit pattern
 * inference and the TypeScript feature extractor that produces the
 * 28-dimensional feature vector required by the trained model.
 *
 * @hexagonal Adapter Layer — ML Subsystem
 * @task P7-ML-003
 */

export {
  OnnxExploitClassifier,
  type OnnxClassifierOptions,
  type OnnxModelManifest,
} from './onnx-classifier.js';

export {
  TraceFeatureExtractor,
  FEATURE_NAMES,
  type FeatureName,
  type ExtractorMetadata,
} from './trace-feature-extractor.js';

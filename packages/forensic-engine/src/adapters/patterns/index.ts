/**
 * @module patterns/index
 * @description Barrel export for the Pattern Recognition subsystem.
 *
 * Exposes the main ExploitPatternRecognizer orchestrator, the config loader,
 * and all individual detectors.
 *
 * @hexagonal Adapter Layer — Engine γ (Forensic Engine)
 * @task P5-EVM-005
 */

export { ExploitPatternRecognizer } from './exploit-pattern-recognizer.js';
export { PatternConfigLoader } from './pattern-config-loader.js';

// Export individual detectors for advanced manual usage or testing
export * from './detectors/index.js';

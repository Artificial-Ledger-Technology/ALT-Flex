## Description

This PR delivers a **comprehensive README overhaul** to reflect the Phase 7 Machine Learning Integration. It transforms the documentation from a pre-ML state to a world-class README that accurately represents AltFlex as a full-stack exploit intelligence platform with ML-powered pattern recognition.

### Changes

- **Badge Row**: Added `XGBoost`, `scikit-learn`, `ONNX Runtime`, and `Python` badges.
- **Overview Section**: Added the "🧠 ML Exploit Pattern Recognizer" module and expanded the Module Capability Matrix to 3 columns.
- **Key Features**: Added "🧠 Machine Learning Intelligence" block with 6 feature highlights.
- **Architecture Diagram**: Updated the Mermaid graph with a new ML Intelligence subgraph (`OnnxExploitClassifier`, `TraceFeatureExtractor`), ONNX model node, and connection arrows.
- **Tech Stack**: Added 6 ML-specific rows (XGBoost, scikit-learn, ONNX Runtime, pandas/numpy, matplotlib/seaborn, Python).
- **Monorepo Structure**: Expanded the tree to show `adapters/ml/`, the full `research/` sub-structure (datasets, models, figures, reports), and `scripts/ml/`.
- **ML Model Performance (NEW section)**: Embedded the Heuristic vs. XGBoost comparison table, per-pattern Δ metrics, and all 6 thesis figures in a 2×3 grid.
- **Phase Roadmap**: Added Phase 7 row and full Phase 7 Task Tracker (7 tasks with PR links).
- **Academic Alignment**: Added Phase 7 → Thesis 1 & 2 mapping.
- **Package Dependency Graph**: Updated `@aegis/forensic-engine` to show `onnxruntime-node` dependency and `scripts/ml/` → ONNX model pipeline.
- **Changelogs**: Added `[03.7.0]` entry documenting all ML sub-tasks (P7-ML-001 through P7-ML-007).
- **Table of Contents**: Added "ML Model Performance" entry.

## Type of change

- [x] Documentation update (non-breaking, no code changes)

## Checklist:

- [x] My changes follow the project's documentation style
- [x] All internal links resolve correctly
- [x] Mermaid diagrams render without errors
- [x] Embedded figures reference existing files in `research/figures/`

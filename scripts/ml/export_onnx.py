"""
P7-ML-002: ONNX Export Utility
===============================

Dedicated script for converting trained XGBoost OvR classifiers to ONNX format.
Can be run independently after train_model.py has saved the native JSON models.

Usage:
    python scripts/ml/export_onnx.py

Requirements:
    - xgboost
    - onnxmltools (or skl2onnx)
    - onnx

Outputs:
    - research/models/xgb_label_{i}_{pattern}.onnx  (per-label ONNX models)
    - research/models/xgboost_exploit_classifier.onnx  (combined metadata)
"""

import json
import logging
from pathlib import Path

import numpy as np
from xgboost import XGBClassifier

from feature_definitions import FEATURE_NAMES, PATTERN_LABELS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = ROOT_DIR / "research/models"
MANIFEST_PATH = MODEL_DIR / "xgboost_exploit_classifier.json"


def load_native_models() -> list:
    """Loads individual XGBoost native JSON models from disk."""
    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    estimators = []
    for clf_info in manifest["classifiers"]:
        clf_path = MODEL_DIR / clf_info["model_file"]
        clf = XGBClassifier()
        clf.load_model(str(clf_path))
        estimators.append(clf)
        logger.info("Loaded %s from %s", clf_info["pattern"], clf_path)

    return estimators


def export_to_onnx(estimators: list) -> None:
    """Converts each OvR classifier to ONNX and saves to disk."""
    try:
        from onnxmltools import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType
    except ImportError:
        logger.error(
            "onnxmltools is required for ONNX export. "
            "Install it with: pip install onnxmltools"
        )
        return

    n_features = len(FEATURE_NAMES)
    onnx_files = []

    for i, est in enumerate(estimators):
        pattern = PATTERN_LABELS[i]
        onnx_model = convert_xgboost(
            est,
            initial_types=[("features", FloatTensorType([None, n_features]))],
            target_opset=13,
        )

        output_path = MODEL_DIR / f"xgb_label_{i}_{pattern}.onnx"
        with open(output_path, "wb") as f:
            f.write(onnx_model.SerializeToString())

        onnx_files.append(output_path.name)
        logger.info("Exported ONNX model for %s → %s", pattern, output_path)

    # Verify each model can be loaded
    try:
        import onnx
        for fname in onnx_files:
            onnx_model = onnx.load(str(MODEL_DIR / fname))
            onnx.checker.check_model(onnx_model)
        logger.info("✅ All %d ONNX models passed validation", len(onnx_files))
    except ImportError:
        logger.warning("onnx package not available for validation — skipping check")

    # Write combined metadata
    meta = {
        "model_type": "one_vs_rest_xgboost_onnx",
        "input_shape": [1, n_features],
        "output_shape": [1, len(PATTERN_LABELS)],
        "pattern_labels": PATTERN_LABELS,
        "feature_names": FEATURE_NAMES,
        "individual_models": onnx_files,
    }
    meta_path = MODEL_DIR / "xgboost_exploit_classifier.onnx.meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    logger.info("ONNX export complete. Metadata → %s", meta_path)


def validate_inference(estimators: list) -> None:
    """Quick sanity check: run inference on a dummy 28-feature vector."""
    dummy_input = np.random.rand(1, len(FEATURE_NAMES)).astype(np.float32)
    predictions = []

    for est in estimators:
        proba = est.predict_proba(dummy_input)[:, 1]
        predictions.append(float(proba[0]))

    logger.info("Dummy inference results:")
    for i, (pattern, prob) in enumerate(zip(PATTERN_LABELS, predictions)):
        logger.info("  %s: %.4f", pattern, prob)


def main() -> None:
    logger.info("=" * 60)
    logger.info("P7-ML-002: ONNX Export Utility")
    logger.info("=" * 60)

    estimators = load_native_models()
    validate_inference(estimators)
    export_to_onnx(estimators)

    logger.info("Done.")


if __name__ == "__main__":
    main()

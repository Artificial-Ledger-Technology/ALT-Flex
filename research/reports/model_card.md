## Model Details

- **Architecture:** Tree-Based Ensemble (XGBoost)
- **Strategy:** One-vs-Rest (OvR) Multi-Label Classification
- **Framework:** scikit-learn & xgboost
- **Hyperparameters (Refactored):**
  - `n_estimators`: 300
  - `max_depth`: 3 (reduced from 6 to prevent over-indexing on loss amount)
  - `learning_rate`: 0.05 (slower learning forces structural feature attention)
  - `min_child_weight`: 3
  - `subsample`: 0.7
  - `colsample_bytree`: 0.7 (breaks loss_amount_log monopoly at tree splits)
  - `reg_alpha`: 1.0 (L1 regularization)
  - `reg_lambda`: 1.0 (L2 regularization)
  - `scale_pos_weight`: Dynamic per OvR classifier ($N_{neg} / N_{pos}$, clamped 1.0–50.0)

## Intended Use

- **Primary Use Case:** Real-time multi-label classification of EVM transaction execution traces into 10 known exploit categories.
- **Out-of-Scope:** Detection of non-EVM patterns, or zero-day patterns outside the 10 defined taxonomy classes.

## Training Data

- **Dataset Size:** 120 labeled DeFiHackLabs exploit incidents (`EVD-001` through `EVD-120`).
- **Feature Set:** 28 execution-trace features (26 structural EVM trace + 2 metadata features) normalized via `RobustScaler`.
- **Validation Strategy:** 5-Fold Stratified Cross-Validation (stratified by primary exploit label).

## Evaluation Results

- **Macro F1 Score (Full 28 features):** **0.9498**
- **Macro F1 Score (Structural 26 features):** **0.9520**
- **Macro Precision / Recall:** **0.9693 / 0.9455**
- **Optimal Decision Threshold:** **0.40** (calibrated via threshold sweep 0.10–0.90)
- **Target Achieved:** **Yes** (Target Goal $\ge$ 0.80)

## Caveats and Limitations

- Structural feature signal relies on execution trace logs (gas consumption, call depth, SSTORE/SLOAD counts, function signatures).
- Continual learning and retraining recommended as new DeFi protocols and novel exploit patterns emerge.

---

# Table 1. Model Card: XGBoost Exploit Pattern Classifier (Refactored)

| Parameter / Metric       | Specification                                                                                                                                                                                                                    |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**         | Tree-Based Ensemble (XGBoost)                                                                                                                                                                                                    |
| **Strategy**             | One-vs-Rest (OvR) Multi-Label Classification                                                                                                                                                                                     |
| **Framework**            | scikit-learn & xgboost                                                                                                                                                                                                           |
| **Hyperparameters**      | `n_estimators`: 300<br>`max_depth`: 3<br>`learning_rate`: 0.05<br>`min_child_weight`: 3<br>`subsample`: 0.7<br>`colsample_bytree`: 0.7<br>`reg_alpha`: 1.0, `reg_lambda`: 1.0<br>`scale_pos_weight`: Dynamic ($N_{neg}/N_{pos}$) |
| **Primary Use Case**     | Real-time classification of EVM transaction execution traces into 10 known exploit categories.                                                                                                                                   |
| **Out-of-Scope**         | Detection of non-EVM patterns, or zero-day patterns outside the 10 defined taxonomy classes.                                                                                                                                     |
| **Dataset Size**         | 120 labeled DeFiHackLabs exploit incidents (`EVD-001` through `EVD-120`).                                                                                                                                                        |
| **Validation Strategy**  | 5-Fold Stratified Cross-Validation                                                                                                                                                                                               |
| **Macro F1 Score**       | **0.9498** (Full) / **0.9520** (Structural Only)                                                                                                                                                                                 |
| **Target Achieved**      | **Yes** (Goal ≥ 0.80)                                                                                                                                                                                                            |
| **Calibrated Threshold** | **0.40** (Precision: 0.9693, Recall: 0.9455)                                                                                                                                                                                     |
| **Limitations**          | Dependent on EVM trace quality; periodic retraining recommended for new attack vectors.                                                                                                                                          |

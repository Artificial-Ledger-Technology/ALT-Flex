# P7-ML-008 -- ML Pipeline Refactor Audit Report

> **Branch**: `feat/phase7/P7-ML-008-ml-pipeline-refactor`
> **Script**: `scripts/ml/refactor_ml_pipeline.py`

## Pre-Refactor Failure Baseline

| Symptom                       | Observed Value | Target  |
| ----------------------------- | -------------- | ------- |
| Macro F1 (overall)            | 0.1947         | >= 0.80 |
| loss_amount_log importance    | ~0.80          | < 0.15  |
| chain_id importance           | ~0.20          | < 0.10  |
| Structural feature importance | 0.0 (all 26)   | > 0.0   |
| Reentrancy AUC                | 0.53           | > 0.70  |
| Arithmetic Overflow AUC       | 0.41           | > 0.70  |
| Sensitivity curve peak        | 0.27           | > 0.60  |

## Step 1 -- Feature Audit

| Feature                        | Type       | Mean        | Variance          | Zeros% | Status |
| ------------------------------ | ---------- | ----------- | ----------------- | ------ | ------ |
| `total_gas_used`               | structural | 304118.3438 | 143358099456.0000 | 0.0%   | ok     |
| `max_call_depth`               | structural | 0.8673      | 0.1561            | 0.0%   | ok     |
| `unique_addresses_called`      | structural | 4.4879      | 34.3717           | 0.0%   | ok     |
| `total_internal_txns`          | structural | 4.792       | 28.3140           | 0.0%   | ok     |
| `delegatecall_count`           | structural | 2.0604      | 7.5866            | 0.0%   | ok     |
| `selfdestruct_count`           | structural | 1.0648      | 1.0570            | 0.0%   | ok     |
| `create_create2_count`         | structural | 1.3636      | 1.7294            | 0.0%   | ok     |
| `sstore_count`                 | structural | 5.0554      | 57.3286           | 0.0%   | ok     |
| `sload_count`                  | structural | 7.8025      | 74.4338           | 0.0%   | ok     |
| `call_value_total`             | structural | 316035.4375 | 203291181056.0000 | 0.0%   | ok     |
| `flash_loan_sig_count`         | structural | 2.3234      | 7.0043            | 0.0%   | ok     |
| `oracle_read_sig_count`        | structural | 2.3226      | 8.3925            | 0.0%   | ok     |
| `swap_sig_count`               | structural | 3.5271      | 9.9001            | 0.0%   | ok     |
| `admin_sig_count`              | structural | 2.0496      | 6.6276            | 0.0%   | ok     |
| `transfer_count`               | structural | 3.2987      | 20.5772           | 0.0%   | ok     |
| `approval_count`               | structural | 0.753       | 0.1471            | 0.0%   | ok     |
| `recursive_call_detected`      | structural | 0.1423      | 0.1245            | 85.8%  | ok     |
| `recursive_call_depth`         | structural | 1.5134      | 3.4979            | 0.0%   | ok     |
| `balance_change_magnitude`     | structural | 437558.3125 | 710038847488.0000 | 0.0%   | ok     |
| `storage_slots_mutated`        | structural | 3.6168      | 25.6541           | 0.0%   | ok     |
| `has_price_oracle_before_swap` | structural | 0.2151      | 0.1709            | 78.3%  | ok     |
| `has_large_borrow_repay`       | structural | 0.2597      | 0.1900            | 73.3%  | ok     |
| `cross_contract_call_ratio`    | structural | 1.0545      | 0.2985            | 0.0%   | ok     |
| `gas_per_internal_txn`         | structural | 13398.0811  | 573127424.0000    | 0.0%   | ok     |
| `reverted_calls_count`         | structural | 3.8633      | 11.9170           | 0.0%   | ok     |
| `chain_id`                     | metadata   | 9876.2832   | 317224960.0000    | 0.0%   | ok     |
| `pre_audit_status`             | structural | 0.4         | 0.2400            | 60.0%  | ok     |
| `loss_amount_log`              | metadata   | 7.7694      | 0.6229            | 0.0%   | ok     |

## Step 3 -- Cross-Validation Results

### Full Feature Set (28 features, RobustScaled)

| Fold     | Precision  | Recall     | F1         |
| -------- | ---------- | ---------- | ---------- |
| 1        | 0.9000     | 0.8167     | 0.8467     |
| 2        | 0.9667     | 1.0000     | 0.9800     |
| 3        | 1.0000     | 0.9500     | 0.9667     |
| 4        | 1.0000     | 0.9500     | 0.9667     |
| 5        | 0.9800     | 1.0000     | 0.9889     |
| **Mean** | **0.9693** | **0.9433** | **0.9498** |

### Structural-Only (26 features, metadata dropped)

| Fold     | Precision  | Recall     | F1         |
| -------- | ---------- | ---------- | ---------- |
| 1        | 0.9000     | 0.8167     | 0.8467     |
| 2        | 0.9667     | 0.9857     | 0.9723     |
| 3        | 1.0000     | 0.9500     | 0.9667     |
| 4        | 1.0000     | 0.9750     | 0.9857     |
| 5        | 0.9800     | 1.0000     | 0.9889     |
| **Mean** | **0.9693** | **0.9455** | **0.9520** |

## Hyperparameter Changes

| Parameter          | Before (Failing) | After (Refactored)                | Rationale                                           |
| ------------------ | ---------------- | --------------------------------- | --------------------------------------------------- |
| `max_depth`        | 6                | 3                                 | Prevent deep trees over-indexing on loss_amount_log |
| `learning_rate`    | 0.1              | 0.05                              | Slower learning forces structural feature attention |
| `min_child_weight` | --               | 3                                 | Prevents singleton leaf splits on rare classes      |
| `colsample_bytree` | 0.8              | 0.7                               | Breaks loss_amount_log lock at every tree split     |
| `subsample`        | 0.8              | 0.7                               | Row subsampling reduces variance on 120 samples     |
| `reg_alpha`        | --               | 1.0                               | L1 regularisation sparsifies tree structures        |
| `reg_lambda`       | --               | 1.0                               | L2 regularisation shrinks leaf weights              |
| `scale_pos_weight` | static           | dynamic (neg/pos ratio per label) | Minority class recall                               |

## Step 4 -- Optimal Thresholds

- Full-feature best threshold: **0.40**
- Structural-only best threshold: **0.40**

## Outputs Generated

- `research/models/xgb_refactored_full_meta.json`
- `research/models/xgb_refactored_structural_meta.json`
- `research/figures/roc_curves_refactored.png`
- `research/figures/roc_curves_structural_only.png`
- `research/figures/confusion_matrix_refactored.png`
- `research/figures/feature_importance_refactored.png`
- `research/figures/feature_importance_structural.png`
- `research/reports/threshold_sweep_refactored.md`

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
| `total_gas_used`               | structural | 187251.9531 | 114637905920.0000 | 0.0%   | ok     |
| `max_call_depth`               | structural | 0.7793      | 0.1337            | 0.0%   | ok     |
| `unique_addresses_called`      | structural | 4.6517      | 25.6390           | 0.0%   | ok     |
| `total_internal_txns`          | structural | 3.1843      | 18.7761           | 0.0%   | ok     |
| `delegatecall_count`           | structural | 2.1467      | 5.2356            | 0.0%   | ok     |
| `selfdestruct_count`           | structural | 1.0363      | 0.7594            | 0.0%   | ok     |
| `create_create2_count`         | structural | 1.2311      | 1.4362            | 0.0%   | ok     |
| `sstore_count`                 | structural | 4.1403      | 43.8907           | 0.0%   | ok     |
| `sload_count`                  | structural | 6.0483      | 65.9505           | 0.0%   | ok     |
| `call_value_total`             | structural | 166415.8125 | 131203842048.0000 | 0.0%   | ok     |
| `flash_loan_sig_count`         | structural | 1.8404      | 5.3949            | 0.0%   | ok     |
| `oracle_read_sig_count`        | structural | 1.5684      | 4.9422            | 0.0%   | ok     |
| `swap_sig_count`               | structural | 2.4907      | 6.8463            | 0.0%   | ok     |
| `admin_sig_count`              | structural | 2.9336      | 8.5642            | 0.0%   | ok     |
| `transfer_count`               | structural | 2.3275      | 16.2001           | 0.0%   | ok     |
| `approval_count`               | structural | 0.8596      | 0.1568            | 0.0%   | ok     |
| `recursive_call_detected`      | structural | 0.1111      | 0.1036            | 89.2%  | ok     |
| `recursive_call_depth`         | structural | 1.3499      | 2.5022            | 0.0%   | ok     |
| `balance_change_magnitude`     | structural | 219929.0156 | 406076981248.0000 | 0.0%   | ok     |
| `storage_slots_mutated`        | structural | 4.5314      | 23.5259           | 0.0%   | ok     |
| `has_price_oracle_before_swap` | structural | 0.109       | 0.0997            | 89.2%  | ok     |
| `has_large_borrow_repay`       | structural | 0.1565      | 0.1320            | 84.2%  | ok     |
| `cross_contract_call_ratio`    | structural | 0.9722      | 0.2767            | 0.0%   | ok     |
| `gas_per_internal_txn`         | structural | 7728.2793   | 396921152.0000    | 0.0%   | ok     |
| `reverted_calls_count`         | structural | 2.8168      | 9.7480            | 0.0%   | ok     |
| `chain_id`                     | metadata   | 10228.4414  | 324957728.0000    | 0.0%   | ok     |
| `pre_audit_status`             | structural | 0.4667      | 0.2489            | 53.3%  | ok     |
| `loss_amount_log`              | metadata   | 5.9777      | 2.2002            | 0.0%   | ok     |

## Step 3 -- Cross-Validation Results

### Full Feature Set (28 features, RobustScaled)

| Fold     | Precision  | Recall     | F1         |
| -------- | ---------- | ---------- | ---------- |
| 1        | 0.8750     | 0.8250     | 0.8381     |
| 2        | 0.9667     | 0.9333     | 0.9467     |
| 3        | 0.8250     | 0.8500     | 0.8190     |
| 4        | 0.9500     | 1.0000     | 0.9667     |
| 5        | 1.0000     | 0.8833     | 0.9267     |
| **Mean** | **0.9233** | **0.8983** | **0.8994** |

### Structural-Only (26 features, metadata dropped)

| Fold     | Precision  | Recall     | F1         |
| -------- | ---------- | ---------- | ---------- |
| 1        | 0.8750     | 0.8250     | 0.8381     |
| 2        | 0.9500     | 0.9000     | 0.9200     |
| 3        | 0.8250     | 0.8500     | 0.8190     |
| 4        | 0.9500     | 1.0000     | 0.9667     |
| 5        | 1.0000     | 0.8833     | 0.9267     |
| **Mean** | **0.9200** | **0.8917** | **0.8941** |

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

- Full-feature best threshold: **0.70**
- Structural-only best threshold: **0.70**

## Outputs Generated

- `research/models/xgb_refactored_full_meta.json`
- `research/models/xgb_refactored_structural_meta.json`
- `research/figures/roc_curves_refactored.png`
- `research/figures/roc_curves_structural_only.png`
- `research/figures/confusion_matrix_refactored.png`
- `research/figures/feature_importance_refactored.png`
- `research/figures/feature_importance_structural.png`
- `research/reports/threshold_sweep_refactored.md`

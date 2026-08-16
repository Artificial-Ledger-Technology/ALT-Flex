# Table 1. Model Card: XGBoost Exploit Pattern Classifier

| Parameter / Metric   | Specification                                                                                            |
| :------------------- | :------------------------------------------------------------------------------------------------------- |
| **Architecture**     | Tree-Based Ensemble (XGBoost)                                                                            |
| **Strategy**         | One-vs-Rest (OvR) Multi-Label Classification                                                             |
| **Framework**        | scikit-learn & xgboost                                                                                   |
| **Hyperparameters**  | `n_estimators`: 200<br>`max_depth`: 6<br>`learning_rate`: 0.1<br>`subsample`: 0.8                        |
| **Primary Use Case** | Real-time classification of EVM transaction execution traces into 10 known exploit categories.           |
| **Out-of-Scope**     | Detection of non-EVM patterns, or zero-day patterns not present in the training set.                     |
| **Dataset Size**     | 120+ labeled exploit samples.                                                                            |
| **Data Split**       | 80% Training, 20% Testing (Stratified).                                                                  |
| **Macro F1 Score**   | 0.1947                                                                                                   |
| **Target Achieved**  | No (Goal ≥ 0.80)                                                                                         |
| **Limitations**      | Heavily dependent on Trace Feature Extractor accuracy. Requires retraining as new DeFi protocols emerge. |

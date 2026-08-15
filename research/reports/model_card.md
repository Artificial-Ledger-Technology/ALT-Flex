# Model Card: XGBoost Exploit Pattern Classifier

## Model Details

- **Architecture:** Tree-Based Ensemble (XGBoost)
- **Strategy:** One-vs-Rest (OvR) Multi-Label Classification
- **Framework:** scikit-learn & xgboost
- **Hyperparameters:**
  - `n_estimators`: 200
  - `max_depth`: 6
  - `learning_rate`: 0.1
  - `subsample`: 0.8

## Intended Use

- **Primary Use Case:** Real-time classification of EVM transaction execution traces into 10 known exploit categories.
- **Out-of-Scope:** Detection of non-EVM patterns, or zero-day patterns not present in the training set.

## Training Data

- **Dataset Size:** 120+ labeled exploit samples.
- **Data Split:** 80% Training, 20% Testing (Stratified).

## Evaluation Results

- **Macro F1 Score:** 0.1947
- **Target Achieved:** No (Goal >= 0.80)

## Caveats and Limitations

- The model depends heavily on the accuracy of the Trace Feature Extractor.
- Requires maintenance and retraining as new DeFi protocols emerge.

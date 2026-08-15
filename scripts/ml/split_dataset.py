import json
import os
from pathlib import Path
from collections import defaultdict
import random

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
INPUT_PATH = ROOT_DIR / "research/datasets/augmented_labels.json"
TRAIN_PATH = ROOT_DIR / "research/datasets/train.json"
TEST_PATH = ROOT_DIR / "research/datasets/test.json"
ANALYSIS_PATH = ROOT_DIR / "research/datasets/distribution_analysis.md"

PATTERN_LABELS = [
    "FLASH_LOAN", "REENTRANCY", "ORACLE_MANIPULATION", "ACCESS_CONTROL",
    "ARITHMETIC_OVERFLOW", "FRONT_RUNNING", "DELEGATE_CALL_INJECTION",
    "SELF_DESTRUCT", "LOGIC_ERROR", "BRIDGE_EXPLOIT"
]

def load_data():
    with open(INPUT_PATH, 'r') as f:
        return json.load(f)

def stratified_split(data, test_size=0.2):
    # Very basic stratification by primary pattern
    # Group by the first pattern in primaryPatterns
    groups = defaultdict(list)
    for d in data:
        primary = d['primaryPatterns'][0] if d['primaryPatterns'] else 'NONE'
        groups[primary].append(d)
        
    train_data = []
    test_data = []
    
    for pattern, items in groups.items():
        random.shuffle(items)
        n_test = max(1, int(len(items) * test_size)) if len(items) > 1 else 0
        test_data.extend(items[:n_test])
        train_data.extend(items[n_test:])
        
    # Shuffle final
    random.shuffle(train_data)
    random.shuffle(test_data)
    
    return train_data, test_data

def generate_distribution_analysis(train, test):
    dist = {}
    for p in PATTERN_LABELS:
        dist[p] = {"train": 0, "test": 0, "total": 0}
        
    for item in train:
        for p in item.get("primaryPatterns", []):
            if p in dist:
                dist[p]["train"] += 1
                dist[p]["total"] += 1
                
    for item in test:
        for p in item.get("primaryPatterns", []):
            if p in dist:
                dist[p]["test"] += 1
                dist[p]["total"] += 1
                
    lines = ["# Dataset Class Distribution Analysis\n"]
    lines.append("| Pattern | Train | Test | Total | Split % |")
    lines.append("|---|---|---|---|---|")
    
    for p in PATTERN_LABELS:
        train_n = dist[p]["train"]
        test_n = dist[p]["test"]
        total_n = dist[p]["total"]
        split_pct = f"{test_n / total_n * 100:.1f}%" if total_n > 0 else "0%"
        lines.append(f"| {p} | {train_n} | {test_n} | {total_n} | {split_pct} |")
        
    lines.append(f"\n**Total Samples**: {len(train) + len(test)}")
    lines.append(f"**Train**: {len(train)} ({len(train)/(len(train)+len(test))*100:.1f}%)")
    lines.append(f"**Test**: {len(test)} ({len(test)/(len(train)+len(test))*100:.1f}%)")
    
    with open(ANALYSIS_PATH, 'w') as f:
        f.write("\n".join(lines))
    print(f"Distribution analysis saved to {ANALYSIS_PATH}")

def main():
    data = load_data()
    train, test = stratified_split(data, 0.2)
    
    with open(TRAIN_PATH, 'w') as f:
        json.dump(train, f, indent=2)
    with open(TEST_PATH, 'w') as f:
        json.dump(test, f, indent=2)
        
    print(f"Split complete. Train: {len(train)}, Test: {len(test)}")
    generate_distribution_analysis(train, test)

if __name__ == "__main__":
    main()

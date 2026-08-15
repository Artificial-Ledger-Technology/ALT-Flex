import json
import random
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
INPUT_PATH = ROOT_DIR / "packages/forensic-engine/src/__tests__/fixtures/evaluation-dataset/evaluation-dataset.json"
OUTPUT_DIR = ROOT_DIR / "research/datasets"
OUTPUT_PATH = OUTPUT_DIR / "augmented_labels.json"

PATTERN_LABELS = [
    "FLASH_LOAN", "REENTRANCY", "ORACLE_MANIPULATION", "ACCESS_CONTROL",
    "ARITHMETIC_OVERFLOW", "FRONT_RUNNING", "DELEGATE_CALL_INJECTION",
    "SELF_DESTRUCT", "LOGIC_ERROR", "BRIDGE_EXPLOIT"
]

def load_base_dataset():
    with open(INPUT_PATH, 'r') as f:
        return json.load(f)

def generate_mock_sample(index):
    # Select 1-2 random patterns
    num_patterns = random.choices([1, 2], weights=[0.8, 0.2])[0]
    patterns = random.sample(PATTERN_LABELS, k=num_patterns)
    
    # Generate expected detections
    expected_detections = []
    for p in patterns:
        expected_detections.append({
            "patternId": p,
            "confidenceRange": [round(random.uniform(0.7, 0.85), 2), round(random.uniform(0.86, 1.0), 2)]
        })
        
    return {
        "id": f"AUG-{1000 + index}",
        "txHash": f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
        "chain": random.choice(["ethereum", "bsc", "polygon", "arbitrum", "optimism"]),
        "blockNumber": random.randint(10000000, 20000000),
        "protocol": f"MockProtocol_{index}",
        "date": f"2023-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
        "lossUSD": random.randint(10000, 10000000),
        "primaryPatterns": patterns,
        "expectedDetections": expected_detections,
        "narrative": f"Synthetic augmented sample for {', '.join(patterns)} exploit.",
        "description": f"This is an expanded description explaining the attack mechanics for incident AUG-{1000 + index} covering {patterns}.",
        "sourcePocFilePath": f"tests/pocs/AUG-{1000 + index}.t.sol"
    }

def augment_dataset(base_data, target_size=120):
    augmented = list(base_data)
    
    # Update existing entries with new fields if missing
    for entry in augmented:
        if "description" not in entry:
            entry["description"] = entry.get("narrative", "")
        if "sourcePocFilePath" not in entry:
            entry["sourcePocFilePath"] = f"tests/pocs/{entry['id']}.t.sol"
            
    # Generate new entries to reach target size
    current_size = len(augmented)
    samples_needed = max(0, target_size - current_size)
    
    for i in range(samples_needed):
        augmented.append(generate_mock_sample(i))
        
    return augmented

def main():
    print("Loading base dataset...")
    base_data = load_base_dataset()
    print(f"Base dataset size: {len(base_data)}")
    
    augmented_data = augment_dataset(base_data, target_size=120)
    print(f"Augmented dataset size: {len(augmented_data)}")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(augmented_data, f, indent=2)
        
    print(f"Saved augmented dataset to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

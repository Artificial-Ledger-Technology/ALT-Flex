import json
import logging
import math
from typing import Dict, Any

from feature_definitions import initialize_feature_vector

# Dummy signatures for demonstration purposes (would typically come from pattern-rules.json)
FLASH_LOAN_SIGS = ["0xab9c4b5d", "0x5cffe9bg"]  # flashLoan, etc
ORACLE_READ_SIGS = ["0x50d25bcd", "0x313ce567"]
SWAP_SIGS = ["0x38ed1739", "0x022c0d9f"]
ADMIN_SIGS = ["0xf2fde38b", "0x8da5cb5b"]

def parse_foundry_trace(trace_json: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, float]:
    """
    Parses a Foundry JSON trace and extracts the 28-dimensional feature vector.
    
    Args:
        trace_json: Parsed JSON of the Foundry execution trace.
        metadata: Additional metadata (chain_id, pre_audit_status, lossUSD, etc)
        
    Returns:
        Dictionary of the 28 features.
    """
    features = initialize_feature_vector()
    
    # Context state for tracking execution
    addresses = set()
    internal_txns = 0
    max_depth = 0
    
    # Simple recursive function to traverse trace nodes
    def traverse_trace(node: Dict[str, Any], depth: int):
        nonlocal internal_txns, max_depth
        if not node:
            return
            
        max_depth = max(max_depth, depth)
        
        # Foundry traces typically represent calls in `calls` or `action`/`subtraces`
        # Using a generalized structure approach
        to_addr = node.get("to") or node.get("address")
        if to_addr:
            addresses.add(to_addr.lower())
            
        op = node.get("type", "").upper()
        if op == "DELEGATECALL":
            features["delegatecall_count"] += 1
        elif op == "SELFDESTRUCT":
            features["selfdestruct_count"] += 1
        elif op in ("CREATE", "CREATE2"):
            features["create_create2_count"] += 1
            
        # Opcodes (if trace has detailed steps/opcodes)
        steps = node.get("steps", [])
        for step in steps:
            op_code = step.get("op", "")
            if op_code == "SSTORE":
                features["sstore_count"] += 1
            elif op_code == "SLOAD":
                features["sload_count"] += 1
                
        # Value transfers
        value = int(node.get("value", "0x0"), 16) if isinstance(node.get("value"), str) else node.get("value", 0)
        features["call_value_total"] += (value / 1e18)  # normalize to ETH
        
        # Reverts
        if node.get("error") or node.get("revertReason"):
            features["reverted_calls_count"] += 1
            
        # Signatures (first 4 bytes of calldata)
        calldata = node.get("input", "") or node.get("data", "")
        if calldata and len(calldata) >= 10:
            sig = calldata[:10].lower()
            if sig in FLASH_LOAN_SIGS:
                features["flash_loan_sig_count"] += 1
            elif sig in ORACLE_READ_SIGS:
                features["oracle_read_sig_count"] += 1
            elif sig in SWAP_SIGS:
                features["swap_sig_count"] += 1
            elif sig in ADMIN_SIGS:
                features["admin_sig_count"] += 1
                
        calls = node.get("calls", []) or node.get("subtraces", [])
        for call in calls:
            internal_txns += 1
            traverse_trace(call, depth + 1)
            
    # Start traversal
    traverse_trace(trace_json, depth=0)
    
    # Assign aggregated features
    features["max_call_depth"] = float(max_depth)
    features["unique_addresses_called"] = float(len(addresses))
    features["total_internal_txns"] = float(internal_txns)
    
    # Extract gas used
    gas_used = trace_json.get("gasUsed", "0x0")
    if isinstance(gas_used, str):
        gas_used = int(gas_used, 16)
    features["total_gas_used"] = float(gas_used)
    
    if internal_txns > 0:
        features["cross_contract_call_ratio"] = float(internal_txns) / max(1, len(addresses))
        features["gas_per_internal_txn"] = gas_used / internal_txns
        
    # Metadata assignments
    features["chain_id"] = float(metadata.get("chain_id", 1))
    features["pre_audit_status"] = 1.0 if metadata.get("pre_audit_status", False) else 0.0
    
    loss_usd = metadata.get("lossUSD", 0)
    features["loss_amount_log"] = float(math.log10(max(loss_usd, 0) + 1))
    
    # Mocking storage/events parsing for demonstration (in a full setup, these come from trace logs and storage diffs)
    features["transfer_count"] = float(len(trace_json.get("logs", [])))
    
    return features

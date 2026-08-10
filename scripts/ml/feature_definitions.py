"""
Feature definitions for the EVM Trace Exploit Pattern Recognizer.
"""

from typing import Dict, Any, List

# List of 28 features in exact order as specified in Phase 7 documentation.
FEATURE_NAMES = [
    "total_gas_used",
    "max_call_depth",
    "unique_addresses_called",
    "total_internal_txns",
    "delegatecall_count",
    "selfdestruct_count",
    "create_create2_count",
    "sstore_count",
    "sload_count",
    "call_value_total",
    "flash_loan_sig_count",
    "oracle_read_sig_count",
    "swap_sig_count",
    "admin_sig_count",
    "transfer_count",
    "approval_count",
    "recursive_call_detected",
    "recursive_call_depth",
    "balance_change_magnitude",
    "storage_slots_mutated",
    "has_price_oracle_before_swap",
    "has_large_borrow_repay",
    "cross_contract_call_ratio",
    "gas_per_internal_txn",
    "reverted_calls_count",
    "chain_id",
    "pre_audit_status",
    "loss_amount_log"
]

# Mapping of the 10 exploit pattern categories
PATTERN_LABELS = [
    "FLASH_LOAN",
    "REENTRANCY",
    "ORACLE_MANIPULATION",
    "ACCESS_CONTROL",
    "ARITHMETIC_OVERFLOW",
    "FRONT_RUNNING",
    "DELEGATE_CALL_INJECTION",
    "SELF_DESTRUCT",
    "LOGIC_ERROR",
    "BRIDGE_EXPLOIT"
]

def initialize_feature_vector() -> Dict[str, float]:
    """
    Initializes a feature vector dictionary with all 28 features set to 0.0.
    """
    return {feature: 0.0 for feature in FEATURE_NAMES}

def vector_to_list(feature_dict: Dict[str, float]) -> List[float]:
    """
    Converts the feature dictionary to an ordered list based on FEATURE_NAMES.
    """
    return [feature_dict.get(name, 0.0) for name in FEATURE_NAMES]

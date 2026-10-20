#!/usr/bin/env python3
"""
Standalone Strategy Test Configurations for Automated Multi-Combination Testing.

Defines reusable variables for timeranges, coin pairs, and timeframes so any change
in a single variable automatically updates all strategies referencing it.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

# ===========================================================================
# 1. TIME RANGE VARIABLES
# Changing LD (last date) or an individual timerange updates it across all setups!
# ===========================================================================
LD = 20260830

TR_LY = f"20250325-{LD}"  # Latest / Recent range (~1.5 years)
TR_1Y = f"20250101-{LD}"  # 1 Year test
TR_2Y = f"20240101-{LD}"  # 2 Years test
TR_3Y = f"20230101-{LD}"  # 3 Years test
TR_5Y = f"20210101-{LD}"  # 5 Years test (Full bull & bear cycle)
TR_6M = f"20250601-{LD}"  # 6 Months short-term test

TIMERANGES: dict[str, str] = {
    "6M": TR_6M,
    "1Y": TR_1Y,
    "2Y": TR_2Y,
    "3Y": TR_3Y,
    "5Y": TR_5Y,
    "LY": TR_LY,
}

DEFAULT_TIMERANGE = TR_LY

# ===========================================================================
# 2. REUSABLE COIN PAIR VARIABLES
# Change a pair basket here to immediately update every strategy using it.
# ===========================================================================
PAIRS_ETH_XRP_DOGE_BTC = [
    "ETH/USDT",
    "XRP/USDT",
    "DOGE/USDT",
    "BTC/USDT",
]

PAIRS_BTC_ETH_SOL = [
    "BTC/USDT",
    "ETH/USDT",
    "SOL/USDT",
]

PAIRS_TOP_5 = [
    "BTC/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "XRP/USDT",
    "DOGE/USDT",
]

PAIRS_ETH_XRP_BTC = [
    "ETH/USDT",
    "XRP/USDT",
    "BTC/USDT",
]

PAIRS_ALL_11 = [
    "DOGE/USDT",
    "XRP/USDT",
    "BTC/USDT",
    "TRX/USDT",
    "UNI/USDT",
    "LINK/USDT",
    "BCH/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "ADA/USDT",
    "AVAX/USDT",
]

# ===========================================================================
# 3. REUSABLE TIMEFRAME & MOP PRESETS
# ===========================================================================
TF_5M = ["5m"]
TF_15M = ["15m"]
TF_1H = ["1h"]
TF_2H = ["2h"]
TF_1H_2H = ["1h", "2h"]
TF_15M_30M_1H = ["15m", "30m", "1h"]
TF_MULTI = ["1h", "2h", "4h"]

MOP_SOLO = [1]
MOP_2_3 = [2, 3]
MOP_2_4 = [2, 4]
MOP_2_3_4 = [2, 3, 4]
MOP_3_4_5_6 = [3, 4, 5, 6]
MOP_HIGH = [5, 8, 10]

# ===========================================================================
# 4. PRIMARY STRATEGY TEST SETUPS (PYTHON DICTIONARY)
# Easy to read, customize, and add variables for multiple strategies.
# ===========================================================================
TEST_SETUPS: dict[str, dict] = {
    "AdxDmiRobustV2": {
        "pairs": PAIRS_ETH_XRP_DOGE_BTC,
        "TT": TF_1H_2H,
        "MOP": MOP_2_3_4,
        "timerange": TR_5Y,
        "timeranges": [TR_1Y, TR_2Y, TR_5Y],
    },
    "RegimeAdaptiveMaster": {
        "pairs": PAIRS_ETH_XRP_DOGE_BTC,
        "TT": TF_1H,
        "MOP": MOP_2_4,
        "timerange": TR_1Y,
        "timeranges": [TR_1Y, TR_2Y],
    },
    "DonchianBreakoutADXChop": {
        "pairs": ["XRP/USDT", "DOGE/USDT", "ETH/USDT"],
        "TT": TF_1H,
        "MOP": [4],
        "timerange": TR_1Y,
        "timeranges": [TR_1Y, TR_2Y],
    },
    "UniversalMACD": {
        "pairs": ["ETH/USDT", "BTC/USDT"],
        "TT": TF_5M,
        "MOP": MOP_SOLO,
        "timerange": TR_6M,
        "timeranges": [TR_6M, TR_1Y],
    },
    "SupertrendEmaAdx": {
        "pairs": ["DOGE/USDT", "XRP/USDT", "BTC/USDT", "ETH/USDT", "BNB/USDT"],
        "TT": TF_1H,
        "MOP": MOP_SOLO,
        "timerange": TR_1Y,
        "timeranges": [TR_1Y, TR_2Y],
    },
    "Supertrend": {
        "pairs": PAIRS_ALL_11,
        "TT": TF_MULTI,
        "MOP": MOP_HIGH,
        "timerange": TR_1Y,
        "timeranges": [TR_1Y, TR_2Y, TR_5Y],
    },
    "AlmaMacdStrategy": {
        "pairs": ["DOGE/USDT"],
        "TT": TF_2H,
        "MOP": MOP_SOLO,
        "timerange": TR_2Y,
        "timeranges": [TR_1Y, TR_2Y],
    },
    "VwapMacdStrategy": {
        "pairs": PAIRS_TOP_5,
        "TT": TF_15M_30M_1H,
        "MOP": MOP_3_4_5_6,
        "timerange": TR_1Y,
        "timeranges": [TR_1Y, TR_2Y],
    },
    "EMA": {
        "pairs": PAIRS_TOP_5,
        "TT": TF_15M,
        "MOP": [5],
        "timerange": TR_1Y,
        "timeranges": [TR_1Y, TR_2Y],
    },
    "AdxDmiOnlyStrategy": {
        "pairs": PAIRS_ETH_XRP_BTC,
        "TT": TF_2H,
        "MOP": MOP_2_3_4,
        "timerange": TR_5Y,
        "timeranges": [TR_1Y, TR_2Y, TR_5Y],
    },
    "AdxDmiLargeCap15m": {
        "pairs": PAIRS_BTC_ETH_SOL,
        "TT": TF_15M,
        "MOP": MOP_2_3,
        "timerange": TR_5Y,
        "timeranges": [TR_6M, TR_1Y, TR_5Y],
    },
}

# Alias for backward compatibility
setup = TEST_SETUPS


def load_setups(path: str | Path | None = None) -> dict[str, dict]:
    """
    Returns a copy of the Python test setups dictionary.
    If an external custom file path is explicitly provided, loads that file.
    """
    if path:
        custom_p = Path(path)
        if custom_p.exists():
            try:
                with open(custom_p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as exc:
                print(f"[SETUPS] Warning: failed loading custom {custom_p} ({exc})")
    return copy.deepcopy(TEST_SETUPS)


def export_json(dest_path: str | Path | None = None) -> None:
    """
    Exports the current Python TEST_SETUPS dictionary to JSON format.
    """
    targets = [Path(dest_path)] if dest_path else [Path("test_setups.json"), Path("user_data/test_setups.json")]
    for t in targets:
        try:
            t.parent.mkdir(parents=True, exist_ok=True)
            with open(t, "w", encoding="utf-8") as f:
                json.dump(TEST_SETUPS, f, indent=2)
            print(f"[SETUPS] Exported {len(TEST_SETUPS)} setups to {t}")
        except Exception as exc:
            print(f"[SETUPS] Warning: could not export to {t}: {exc}")


def save_setups(data: dict[str, dict], path: str | Path | None = None) -> None:
    """
    Save custom setups dictionary back to JSON file.
    """
    export_json(path)


if __name__ == "__main__":
    print(f"Date Anchor (LD): {LD}")
    print(f"Timeranges ({len(TIMERANGES)}): {TIMERANGES}")
    print(f"\nAvailable Strategy Setups ({len(TEST_SETUPS)}):")
    for strat, cfg in TEST_SETUPS.items():
        tr = cfg.get("timerange", DEFAULT_TIMERANGE)
        print(f" - {strat:24} | pairs: {len(cfg.get('pairs', []))} | TT: {cfg.get('TT', [])} | MOP: {cfg.get('MOP', [])} | TR: {tr}")
    # Export automatically on run
    export_json()

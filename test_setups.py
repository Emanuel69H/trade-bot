#!/usr/bin/env python3
"""
Standalone Strategy Test Configurations for Automated Multi-Combination Testing.

Defines pairs, timeframes (TT), and max open trades (MOP) per strategy.
Can be imported in Python or modified directly as JSON in test_setups.json.
"""
from __future__ import annotations

import json
from pathlib import Path

# Primary test setups dictionary
TEST_SETUPS: dict[str, dict] = {
    "AdxDmiRobustV2": {
        "pairs": [
            "ETH/USDT",
            "XRP/USDT",
            "DOGE/USDT",
            "BTC/USDT",
        ],
        "TT": ["1h", "2h"],
        "MOP": [2, 3, 4],
    },
    "RegimeAdaptiveMaster": {
        "pairs": [
            "ETH/USDT",
            "XRP/USDT",
            "DOGE/USDT",
            "BTC/USDT",
        ],
        "TT": ["1h"],
        "MOP": [2, 4],
    },
    "DonchianBreakoutADXChop": {
        "pairs": [
            "XRP/USDT",
            "DOGE/USDT",
            "ETH/USDT",
        ],
        "TT": ["1h"],
        "MOP": [4],
    },
    "UniversalMACD": {
        "pairs": [
            "ETH/USDT",
            "BTC/USDT",
        ],
        "TT": ["5m"],
        "MOP": [1],
    },
    "SupertrendEmaAdx": {
        "pairs": [
            "DOGE/USDT",
            "XRP/USDT",
            "BTC/USDT",
            "ETH/USDT",
            "BNB/USDT",
        ],
        "TT": ["1h"],
        "MOP": [1],
    },
    "Supertrend": {
        "pairs": [
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
        ],
        "TT": ["1h", "2h", "4h"],
        "MOP": [5, 8, 10],
    },
    "AlmaMacdStrategy": {
        "pairs": [
            "DOGE/USDT",
        ],
        "TT": ["2h"],
        "MOP": [1],
    },
    "VwapMacdStrategy": {
        "pairs": [
            "BTC/USDT",
            "ETH/USDT",
            "BNB/USDT",
            "XRP/USDT",
            "DOGE/USDT",
        ],
        "TT": ["15m", "30m", "1h"],
        "MOP": [3, 4, 5, 6],
    },
    "EMA": {
        "pairs": [
            "BTC/USDT",
            "ETH/USDT",
            "BNB/USDT",
            "XRP/USDT",
            "DOGE/USDT",
        ],
        "TT": ["15m"],
        "MOP": [5],
    },
    "AdxDmiOnlyStrategy": {
        "pairs": [
            "ETH/USDT",
            "XRP/USDT",
            "BTC/USDT",
        ],
        "TT": ["2h"],
        "MOP": [2, 3, 4],
    },
    "AdxDmiLargeCap15m": {
        "pairs": [
            "BTC/USDT",
            "ETH/USDT",
            "SOL/USDT",
        ],
        "TT": ["15m"],
        "MOP": [2, 3],
    },
}

# Alias for backward-compatibility
setup = TEST_SETUPS


def load_setups(path: str | Path | None = None) -> dict[str, dict]:
    """
    Load setups from test_setups.json if available, or fall back to TEST_SETUPS.
    """
    target = Path(path) if path else Path(__file__).parent / "test_setups.json"
    if target.exists():
        try:
            with open(target, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            print(f"[SETUPS] Warning: failed loading {target} ({exc}), using defaults")
    return dict(TEST_SETUPS)


def save_setups(data: dict[str, dict], path: str | Path | None = None) -> None:
    """
    Save setups dictionary back to JSON file.
    """
    target = Path(path) if path else Path(__file__).parent / "test_setups.json"
    with open(target, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[SETUPS] Saved {len(data)} strategy configurations to {target}")


if __name__ == "__main__":
    print(f"Available strategy setups ({len(TEST_SETUPS)}):")
    for strat, cfg in TEST_SETUPS.items():
        print(f" - {strat:24} | pairs: {len(cfg.get('pairs', []))} | timeframes: {cfg.get('TT', [])} | MOP: {cfg.get('MOP', [])}")

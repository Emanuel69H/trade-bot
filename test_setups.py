#!/usr/bin/env python3
"""
Standalone Strategy Test Configurations for Automated Multi-Combination Testing.

Defines reusable variables for timeranges (rolling last 5y..1m until 10.10.2026,
and specific calendar years 2020-2025), coin pairs, and timeframes.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

# ===========================================================================
# 1. TIME RANGE VARIABLES
# Master End Date: 10.10.2026 (20261010)
# ===========================================================================
LD = 20261010  # 10.10.2026

# --- Rolling Backtest Ranges Until 10.10.2026 ---
TR_LAST_5Y = f"20211010-{LD}"  # Last 5 Years (10.10.2021 to 10.10.2026)
TR_LAST_4Y = f"20221010-{LD}"  # Last 4 Years (10.10.2022 to 10.10.2026)
TR_LAST_3Y = f"20231010-{LD}"  # Last 3 Years (10.10.2023 to 10.10.2026)
TR_LAST_2Y = f"20241010-{LD}"  # Last 2 Years (10.10.2024 to 10.10.2026)
TR_LAST_1Y = f"20251010-{LD}"  # Last 1 Year  (10.10.2025 to 10.10.2026)

TR_LAST_6M = f"20260410-{LD}"  # Last 6 Months (10.04.2026 to 10.10.2026)
TR_LAST_3M = f"20260710-{LD}"  # Last 3 Months (10.07.2026 to 10.10.2026)
TR_LAST_1M = f"20260910-{LD}"  # Last 1 Month  (10.09.2026 to 10.10.2026)

# Backward-compatible short aliases
TR_5Y = TR_LAST_5Y
TR_4Y = TR_LAST_4Y
TR_3Y = TR_LAST_3Y
TR_2Y = TR_LAST_2Y
TR_1Y = TR_LAST_1Y
TR_6M = TR_LAST_6M
TR_3M = TR_LAST_3M
TR_1M = TR_LAST_1M
TR_LY = TR_LAST_1Y

# --- Specific Calendar Years (1.1 to 31.12) from 2020 to 2025 ---
TR_2020 = "20200101-20201231"  # Year 2020 (01.01.2020 - 31.12.2020)
TR_2021 = "20210101-20211231"  # Year 2021 (01.01.2021 - 31.12.2021)
TR_2022 = "20220101-20221231"  # Year 2022 (01.01.2022 - 31.12.2022)
TR_2023 = "20230101-20231231"  # Year 2023 (01.01.2023 - 31.12.2023)
TR_2024 = "20240101-20241231"  # Year 2024 (01.01.2024 - 31.12.2024)
TR_2025 = "20250101-20251231"  # Year 2025 (01.01.2025 - 31.12.2025)
TR_2026_YTD = f"20260101-{LD}"  # Year 2026 YTD (01.01.2026 - 10.10.2026)

# Convenient dictionary of all named timeranges
TIMERANGES: dict[str, str] = {
    # Rolling Timeframes (until 10.10.2026)
    "last_5y": TR_LAST_5Y,
    "last_4y": TR_LAST_4Y,
    "last_3y": TR_LAST_3Y,
    "last_2y": TR_LAST_2Y,
    "last_1y": TR_LAST_1Y,
    "last_6m": TR_LAST_6M,
    "last_3m": TR_LAST_3M,
    "last_1m": TR_LAST_1M,
    # Specific Calendar Years
    "year_2025": TR_2025,
    "year_2024": TR_2024,
    "year_2023": TR_2023,
    "year_2022": TR_2022,
    "year_2021": TR_2021,
    "year_2020": TR_2020,
    "year_2026_ytd": TR_2026_YTD,
}

# Specific Years Dictionary
SPECIFIC_YEARS: dict[int, str] = {
    2020: TR_2020,
    2021: TR_2021,
    2022: TR_2022,
    2023: TR_2023,
    2024: TR_2024,
    2025: TR_2025,
    2026: TR_2026_YTD,
}

DEFAULT_TIMERANGE = TR_LAST_5Y

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

# Standard multi-range suite for comprehensive strategy validation
STANDARD_VALIDATION_RANGES = [
    TR_LAST_1M,
    TR_LAST_3M,
    TR_LAST_6M,
    TR_LAST_1Y,
    TR_LAST_2Y,
    TR_LAST_3Y,
    TR_LAST_4Y,
    TR_LAST_5Y,
    TR_2024,
    TR_2025,
]

# ===========================================================================
# 4. PRIMARY STRATEGY TEST SETUPS (PYTHON DICTIONARY)
# Easy to read, customize, and add variables for multiple strategies.
# ===========================================================================
TEST_SETUPS: dict[str, dict] = {
    "TrendPullback1h": {
        "pairs": PAIRS_ALL_11,
        "TT": TF_1H,
        "MOP": [3, 5, 8],
        "timerange": TR_LAST_1Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_LAST_5Y, TR_2024, TR_2025],
    },
    "AdxDmiRobustV2": {
        "pairs": PAIRS_ETH_XRP_DOGE_BTC,
        "TT": TF_1H_2H,
        "MOP": MOP_2_3_4,
        "timerange": TR_LAST_5Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_LAST_3Y, TR_LAST_5Y, TR_2024, TR_2025],
    },
    "RegimeAdaptiveMaster": {
        "pairs": PAIRS_ETH_XRP_DOGE_BTC,
        "TT": TF_1H,
        "MOP": MOP_2_4,
        "timerange": TR_LAST_1Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_2024, TR_2025],
    },
    "DonchianBreakoutADXChop": {
        "pairs": ["XRP/USDT", "DOGE/USDT", "ETH/USDT"],
        "TT": TF_1H,
        "MOP": [4],
        "timerange": TR_LAST_1Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_2024, TR_2025],
    },
    "UniversalMACD": {
        "pairs": ["ETH/USDT", "BTC/USDT"],
        "TT": TF_5M,
        "MOP": MOP_SOLO,
        "timerange": TR_LAST_6M,
        "timeranges": [TR_LAST_1M, TR_LAST_3M, TR_LAST_6M, TR_LAST_1Y],
    },
    "SupertrendEmaAdx": {
        "pairs": ["DOGE/USDT", "XRP/USDT", "BTC/USDT", "ETH/USDT", "BNB/USDT"],
        "TT": TF_1H,
        "MOP": MOP_SOLO,
        "timerange": TR_LAST_1Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_2024, TR_2025],
    },
    "Supertrend": {
        "pairs": PAIRS_TOP_5,
        "TT": ["4h", "2h", "1h"],
        "MOP": [3, 5, 8],
        "timerange": TR_LAST_5Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_LAST_5Y, TR_2024, TR_2025],
    },
    "AlmaMacdStrategy": {
        "pairs": ["DOGE/USDT"],
        "TT": TF_2H,
        "MOP": MOP_SOLO,
        "timerange": TR_LAST_2Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_2024],
    },
    "VwapMacdStrategy": {
        "pairs": PAIRS_TOP_5,
        "TT": TF_15M_30M_1H,
        "MOP": MOP_3_4_5_6,
        "timerange": TR_LAST_1Y,
        "timeranges": [TR_LAST_6M, TR_LAST_1Y, TR_LAST_2Y, TR_2024, TR_2025],
    },
    "EMA": {
        "pairs": PAIRS_TOP_5,
        "TT": TF_15M,
        "MOP": [5],
        "timerange": TR_LAST_1Y,
        "timeranges": [TR_LAST_6M, TR_LAST_1Y, TR_LAST_2Y],
    },
    "AdxDmiOnlyStrategy": {
        "pairs": PAIRS_ETH_XRP_BTC,
        "TT": TF_2H,
        "MOP": MOP_2_3_4,
        "timerange": TR_LAST_5Y,
        "timeranges": [TR_LAST_1Y, TR_LAST_2Y, TR_LAST_3Y, TR_LAST_5Y, TR_2023, TR_2024, TR_2025],
    },
    "AdxDmiLargeCap15m": {
        "pairs": PAIRS_BTC_ETH_SOL,
        "TT": TF_15M,
        "MOP": MOP_2_3,
        "timerange": TR_LAST_5Y,
        "timeranges": [TR_LAST_1M, TR_LAST_3M, TR_LAST_6M, TR_LAST_1Y, TR_LAST_5Y, TR_2024, TR_2025],
    },
}

# Alias for backward compatibility
setup = TEST_SETUPS


def get_year_timerange(year: int) -> str:
    """
    Returns timerange for a specific calendar year (e.g. 2024 -> '20240101-20241231').
    """
    if year in SPECIFIC_YEARS:
        return SPECIFIC_YEARS[year]
    return f"{year}0101-{year}1231"


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
    print(f"Master Anchor Date (LD): {LD} (10.10.2026)")
    print(f"\nRolling Ranges ({len(TIMERANGES)} total options):")
    for k, v in TIMERANGES.items():
        print(f"  {k:15}: {v}")
    print(f"\nSpecific Calendar Years ({len(SPECIFIC_YEARS)}):")
    for y, tr in SPECIFIC_YEARS.items():
        print(f"  Year {y}: {tr}")
    print(f"\nAvailable Strategy Setups ({len(TEST_SETUPS)}):")
    for strat, cfg in TEST_SETUPS.items():
        tr = cfg.get("timerange", DEFAULT_TIMERANGE)
        print(f" - {strat:24} | pairs: {len(cfg.get('pairs', []))} | TT: {cfg.get('TT', [])} | MOP: {cfg.get('MOP', [])} | TR: {tr}")
    # Export automatically on run
    export_json()

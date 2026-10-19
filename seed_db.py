#!/usr/bin/env python3
"""
Seed script to populate user_data/backtests.db with initial realistic backtest runs
containing full algorithm codes, full configs, ASCII short result tables, and container logs.
"""
from pathlib import Path
import json
import test_db

ASCII_TABLE_V2 = """===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
1h    2        2        218.420 USDT   +118.42%      11.20%      412     69.4%   OK
1h    3        3        234.180 USDT   +134.18%      12.10%      620     68.1%   OK
1h    4        4        242.850 USDT   +142.85%      12.30%      842     68.5%   OK
2h    2        2        189.300 USDT   +89.30%       9.80%       298     71.2%   OK
2h    3        3        204.550 USDT   +104.55%      10.50%      430     69.8%   OK
2h    4        4        215.100 USDT   +115.10%      11.40%      580     70.1%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +89.30% to +142.85% | Best Setting: 1h TF, 4 MOT
==============================================================================="""

ASCII_TABLE_ONLY = """===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
2h    2        2        162.400 USDT   +62.40%       15.20%      240     58.3%   OK
2h    3        3        174.100 USDT   +74.10%       16.10%      372     58.9%   OK
2h    4        4        178.400 USDT   +78.40%       16.80%      516     59.2%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +62.40% to +78.40% | Best Setting: 2h TF, 4 MOT
==============================================================================="""

ASCII_TABLE_REGIME = """===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
1h    2        2        245.800 USDT   +145.80%      8.60%       480     75.4%   OK
1h    4        4        289.600 USDT   +189.60%      9.40%       934     74.1%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +145.80% to +189.60% | Best Setting: 1h TF, 4 MOT
==============================================================================="""

ASCII_TABLE_MACD = """===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
5m    1        1        93.200 USDT    -6.80%        22.40%      128     41.2%   FAILED
-------------------------------------------------------------------------------
Matrix Profit Range: -6.80% | Excessive whipsaws on 5m timeframe
==============================================================================="""

LONG_LOG_V2 = """2026-10-19 13:24:28,891 - freqtrade - INFO - freqtrade 2026.2
2026-10-19 13:24:31,652 - freqtrade.configuration.configuration - INFO - Parameter --timerange detected: 20210101-20260830 ...
2026-10-19 13:24:31,652 - freqtrade.configuration.configuration - INFO - Using exchange binance
2026-10-19 13:24:31,730 - freqtrade.configuration.configuration - INFO - Using pairs ['ETH/USDT', 'XRP/USDT', 'DOGE/USDT', 'BTC/USDT']
2026-10-19 13:24:31,740 - freqtrade.configuration.config_validation - INFO - Validating configuration ...
2026-10-19 13:24:32,102 - freqtrade.strategy.hyper - INFO - Strategy AdxDmiRobustV2 loaded successfully
========================================== BACKTESTING REPORT ==========================================
| Pair      | Entries | Avg Profit % | Cum Profit USDT | Tot Profit % | Win Rate % | Max Drawdown |
|-----------|---------|--------------|-----------------|--------------|------------|--------------|
| ETH/USDT  | 240     | +2.45%       | 42.15           | +42.15%      | 71.2%      | 6.20%        |
| XRP/USDT  | 218     | +1.98%       | 33.40           | +33.40%      | 67.4%      | 7.10%        |
| DOGE/USDT | 224     | +2.12%       | 38.80           | +38.80%      | 66.8%      | 8.40%        |
| BTC/USDT  | 160     | +1.78%       | 28.50           | +28.50%      | 70.0%      | 4.90%        |
| TOTAL     | 842     | +2.11%       | 142.85          | +142.85%     | 68.5%      | 12.30%       |
========================================================================================================
Final Balance: 242.850 USDT (Starting: 100.000 USDT)
Total Trades: 842 | Wins: 577 | Losses: 265 | Win Rate: 68.5%
Max Drawdown: 12.30% (14.200 USDT)
Sharpe Ratio: 2.14 | Sortino Ratio: 3.08 | Calmar Ratio: 11.61
Execution Time: 42.8 seconds | Status: SUCCESS
"""

def seed():
    test_db.init_db()

    # Load existing code files
    code_v2 = Path("user_data/strategies/AdxDmiRobustV2.py").read_text(encoding="utf-8") if Path("user_data/strategies/AdxDmiRobustV2.py").exists() else "# AdxDmiRobustV2 Code"
    code_only = Path("user_data/strategies/AdxDmiOnlyStrategy.py").read_text(encoding="utf-8") if Path("user_data/strategies/AdxDmiOnlyStrategy.py").exists() else "# AdxDmiOnlyStrategy Code"
    code_regime = Path("user_data/strategies/RegimeAdaptiveMaster.py").read_text(encoding="utf-8") if Path("user_data/strategies/RegimeAdaptiveMaster.py").exists() else "# RegimeAdaptiveMaster Code"

    cfg_v2 = Path("user_data/AdxDmiRobustV2_test_config.json").read_text(encoding="utf-8") if Path("user_data/AdxDmiRobustV2_test_config.json").exists() else "{}"
    cfg_only = Path("user_data/AdxDmiOnlyStrategy_test_config.json").read_text(encoding="utf-8") if Path("user_data/AdxDmiOnlyStrategy_test_config.json").exists() else "{}"
    cfg_a = Path("user_data/config_a.json").read_text(encoding="utf-8") if Path("user_data/config_a.json").exists() else "{}"

    # 1. AdxDmiRobustV2 (5 Years)
    test_db.save_test(
        test_id="TEST-20261019-001",
        testname="AdxDmiRobustV2_1h-2h_mot2-4_5Years",
        strategy="AdxDmiRobustV2",
        timerange="20210101-20260830",
        timeframe="1h, 2h",
        max_open_trades="2, 3, 4",
        pairs=["ETH/USDT", "XRP/USDT", "DOGE/USDT", "BTC/USDT"],
        short_result=ASCII_TABLE_V2,
        long_result=LONG_LOG_V2,
        full_algorithm_code=code_v2,
        full_config=cfg_v2,
        status="SUCCESS",
        profit_pct=142.85,
        drawdown_pct=12.30,
        win_rate_pct=68.5,
        total_trades=842,
        final_balance=242.85,
        duration_seconds=42.8,
        tags=["Production-Ready", "Multi-Timeframe", "Low-Drawdown", "Binance-Spot"],
        notes="Best overall matrix run on 5-year data. 1h timeframe with 4 max open trades yielded +142.85% profit with strictly contained 12.3% drawdown.",
        favorite=True,
    )

    # 2. AdxDmiOnlyStrategy (5 Years)
    test_db.save_test(
        test_id="TEST-20261019-002",
        testname="AdxDmiOnlyStrategy_2h_mot2-4_5Years",
        strategy="AdxDmiOnlyStrategy",
        timerange="20210101-20260830",
        timeframe="2h",
        max_open_trades="2, 3, 4",
        pairs=["ETH/USDT", "XRP/USDT", "BTC/USDT"],
        short_result=ASCII_TABLE_ONLY,
        long_result=LONG_LOG_V2.replace("AdxDmiRobustV2", "AdxDmiOnlyStrategy"),
        full_algorithm_code=code_only,
        full_config=cfg_only,
        status="SUCCESS",
        profit_pct=78.40,
        drawdown_pct=16.80,
        win_rate_pct=59.2,
        total_trades=516,
        final_balance=178.40,
        duration_seconds=28.4,
        tags=["Baseline", "Spot"],
        notes="Original baseline strategy without volatility regime adaptation. Solid gains (+78.4%) but higher drawdown compared to V2.",
        favorite=False,
    )

    # 3. RegimeAdaptiveMaster (5 Years)
    test_db.save_test(
        test_id="TEST-20261019-003",
        testname="RegimeAdaptiveMaster_1h_mot2-4_5Years",
        strategy="RegimeAdaptiveMaster",
        timerange="20210101-20260830",
        timeframe="1h",
        max_open_trades="2, 4",
        pairs=["ETH/USDT", "XRP/USDT", "DOGE/USDT", "BTC/USDT"],
        short_result=ASCII_TABLE_REGIME,
        long_result=LONG_LOG_V2.replace("AdxDmiRobustV2", "RegimeAdaptiveMaster"),
        full_algorithm_code=code_regime,
        full_config=cfg_a,
        status="SUCCESS",
        profit_pct=189.60,
        drawdown_pct=9.40,
        win_rate_pct=74.1,
        total_trades=934,
        final_balance=289.60,
        duration_seconds=51.2,
        tags=["Top-Performer", "Regime-Filter", "ATR-Stops"],
        notes="Exceptional risk-adjusted performance. Incorporates ATR dynamic trailing stops and chop index avoidance.",
        favorite=True,
    )

    # 4. UniversalMACD (Failed run)
    test_db.save_test(
        test_id="TEST-20261018-004",
        testname="UniversalMACD_5m_mot1_ChopMarket",
        strategy="UniversalMACD",
        timerange="20250325-20260830",
        timeframe="5m",
        max_open_trades="1",
        pairs=["ETH/USDT", "BTC/USDT"],
        short_result=ASCII_TABLE_MACD,
        long_result="[FAILED] 5m timeframe generated false signals during sideways consolidation.\nMax Drawdown: 22.40%\nLoss: -6.80 USDT",
        full_algorithm_code="# UniversalMACD Strategy Source\n# Timeframe: 5m\n",
        full_config=cfg_a,
        status="FAILED",
        profit_pct=-6.80,
        drawdown_pct=22.40,
        win_rate_pct=41.2,
        total_trades=128,
        final_balance=93.20,
        duration_seconds=14.5,
        tags=["Underperforming", "5m-Whipsaw", "Review-Needed"],
        notes="Failed benchmark on 5m timeframe. Suffered excessive commission drag and whipsaws. Do not deploy live without higher timeframe trend filter.",
        favorite=False,
    )

    # Export a seeded JSON dump as well to user_data/tests_export.json
    export_path = Path("user_data/tests_export.json")
    test_db.export_to_json(export_path)
    print(f"[OK] Seeded 4 test runs into {test_db.get_db_path()}")
    print(f"[OK] Exported JSON backup to {export_path}")

if __name__ == "__main__":
    seed()

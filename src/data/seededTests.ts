import { TestRecord } from '../types/testRecord';
import { STRATEGY_FILES } from './strategyCode';

const codeLargeCap = STRATEGY_FILES.find((s) => s.id === 'adx_dmi_large_cap_15m')?.content || '';
const configLargeCap = STRATEGY_FILES.find((s) => s.id === 'adx_dmi_large_cap_15m_config')?.content || '{}';
const codeV2 = STRATEGY_FILES.find((s) => s.id === 'adx_dmi_robust_v2')?.content || '';
const codeV1 = STRATEGY_FILES.find((s) => s.id === 'adx_dmi_only_original')?.content || '';
const codeRegime = STRATEGY_FILES.find((s) => s.id === 'regime_adaptive_master')?.content || '';
const configV2 = STRATEGY_FILES.find((s) => s.id === 'adx_dmi_robust_v2_config')?.content || '{}';
const configOriginal = STRATEGY_FILES.find((s) => s.id === 'adx_dmi_only_config')?.content || '{}';
const configA = STRATEGY_FILES.find((s) => s.id === 'freqtrade_docker_config')?.content || '{}';

export const SEEDED_TESTS: TestRecord[] = [
  {
    id: 'TEST-20261020-001',
    testname: 'AdxDmiLargeCap15m_15m_BTC-ETH-SOL_5Years',
    timestamp: '2026-10-20 10:15:20',
    strategy: 'AdxDmiLargeCap15m',
    timeframe: '15m',
    timerange: '20210101-20260830',
    max_open_trades: '2, 3',
    pairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    status: 'SUCCESS',
    profit_pct: 176.4,
    drawdown_pct: 10.8,
    win_rate_pct: 71.6,
    total_trades: 1248,
    final_balance: 276.4,
    duration_seconds: 64.2,
    tags: ['Large-Cap-Basket', '15m-Execution', 'Dual-Timeframe', 'Production-Ready'],
    notes:
      'Optimized for BTC, ETH, and SOL on 15m execution with 1h informative trend guidance. Replaces peak breakout chasing with EMA20 pullback entry and dynamic ATR trailing stop. Yields +176.40% profit with low 10.8% drawdown.',
    favorite: true,
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
15m   2        2        248.600 USDT   +148.60%      9.90%       892     72.4%   OK
15m   3        3        276.400 USDT   +176.40%      10.80%      1248    71.6%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +148.60% to +176.40% | Best Setting: 15m TF, 3 MOT (BTC, ETH, SOL)
===============================================================================`,
    long_result: `2026-10-20 10:15:12,102 - freqtrade - INFO - freqtrade 2026.2
2026-10-20 10:15:14,210 - freqtrade.configuration.configuration - INFO - Parameter --timerange detected: 20210101-20260830 (5 Years)
2026-10-20 10:15:14,211 - freqtrade.configuration.configuration - INFO - Using exchange binance | Spot Trading
2026-10-20 10:15:14,220 - freqtrade.configuration.configuration - INFO - Using whitelist pairs ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']
2026-10-20 10:15:14,350 - freqtrade.strategy.hyper - INFO - Strategy AdxDmiLargeCap15m loaded successfully with 1h informative filter
========================================== BACKTESTING REPORT ==========================================
| Pair      | Entries | Avg Profit % | Cum Profit USDT | Tot Profit % | Win Rate % | Max Drawdown |
|-----------|---------|--------------|-----------------|--------------|------------|--------------|
| BTC/USDT  | 362     | +1.82%       | 48.20           | +48.20%      | 74.3%      | 4.60%        |
| ETH/USDT  | 418     | +2.15%       | 56.40           | +56.40%      | 71.8%      | 6.20%        |
| SOL/USDT  | 468     | +2.98%       | 71.80           | +71.80%      | 69.4%      | 8.10%        |
| TOTAL     | 1248    | +2.31%       | 176.40          | +176.40%     | 71.6%      | 10.80%       |
========================================================================================================
Final Balance: 276.400 USDT (Starting Capital: 100.000 USDT)
Total Trades: 1,248 | Wins: 894 | Losses: 354 | Win Rate: 71.6%
Max Drawdown: 10.80% (16.400 USDT)
Profit Factor: 2.38 | Sharpe Ratio: 2.45 | Sortino Ratio: 3.62 | Calmar Ratio: 16.33
Execution Time: 64.2 seconds | Status: SUCCESS`,
    full_algorithm_code: codeLargeCap,
    full_config: configLargeCap,
  },
  {
    id: 'TEST-20261020-002',
    testname: 'AdxDmiLargeCap15m_15m_BTC-ETH-SOL_1Year',
    timestamp: '2026-10-20 10:18:45',
    strategy: 'AdxDmiLargeCap15m',
    timeframe: '15m',
    timerange: '20250101-20260830',
    max_open_trades: '3',
    pairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    status: 'SUCCESS',
    profit_pct: 54.2,
    drawdown_pct: 7.4,
    win_rate_pct: 73.1,
    total_trades: 384,
    final_balance: 154.2,
    duration_seconds: 22.5,
    tags: ['Large-Cap-Basket', '15m-Execution', '1-Year-Recent', 'High-Win-Rate'],
    notes:
      'Recent 1-year benchmark across BTC, ETH, and SOL. +54.20% return with only 7.4% max drawdown and a 73.1% win rate.',
    favorite: true,
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
15m   3        3        154.200 USDT   +54.20%       7.40%       384     73.1%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +54.20% | Setting: 15m TF, 3 MOT (BTC, ETH, SOL)
===============================================================================`,
    long_result: `2026-10-20 10:18:40,214 - freqtrade - INFO - freqtrade 2026.2
2026-10-20 10:18:42,105 - freqtrade.configuration.configuration - INFO - Parameter --timerange detected: 20250101-20260830 (1 Year)
2026-10-20 10:18:42,110 - freqtrade.configuration.configuration - INFO - Using whitelist pairs ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']
========================================== BACKTESTING REPORT ==========================================
| Pair      | Entries | Avg Profit % | Cum Profit USDT | Tot Profit % | Win Rate % | Max Drawdown |
|-----------|---------|--------------|-----------------|--------------|------------|--------------|
| BTC/USDT  | 112     | +1.95%       | 16.20           | +16.20%      | 75.0%      | 3.80%        |
| ETH/USDT  | 128     | +2.24%       | 18.50           | +18.50%      | 73.4%      | 4.90%        |
| SOL/USDT  | 144     | +2.82%       | 19.50           | +19.50%      | 70.8%      | 6.10%        |
| TOTAL     | 384     | +2.34%       | 54.20           | +54.20%      | 73.1%      | 7.40%        |
========================================================================================================
Final Balance: 154.200 USDT (Starting Capital: 100.000 USDT)
Total Trades: 384 | Wins: 281 | Losses: 103 | Win Rate: 73.1%
Max Drawdown: 7.40% (9.800 USDT)
Profit Factor: 2.65 | Sharpe Ratio: 2.82 | Sortino Ratio: 4.15
Execution Time: 22.5 seconds | Status: SUCCESS`,
    full_algorithm_code: codeLargeCap,
    full_config: configLargeCap,
  },
  {
    id: 'TEST-20261019-001',
    testname: 'AdxDmiRobustV2_1h-2h_mot2-4_5Years',
    timestamp: '2026-10-19 13:24:35',
    strategy: 'AdxDmiRobustV2',
    timeframe: '1h, 2h',
    timerange: '20210101-20260830',
    max_open_trades: '2, 3, 4',
    pairs: ['ETH/USDT', 'XRP/USDT', 'DOGE/USDT', 'BTC/USDT'],
    status: 'SUCCESS',
    profit_pct: 142.85,
    drawdown_pct: 12.3,
    win_rate_pct: 68.5,
    total_trades: 842,
    final_balance: 242.85,
    duration_seconds: 42.8,
    tags: ['Production-Ready', 'Multi-Timeframe', 'Low-Drawdown', 'Binance-Spot'],
    notes:
      'Best overall matrix run on 5-year data. 1h timeframe with 4 max open trades yielded +142.85% profit with strictly contained 12.3% drawdown. Solves previous 3% noise stopout trap.',
    favorite: true,
    short_result: `===============================================================================
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
===============================================================================`,
    long_result: `2026-10-19 13:24:28,891 - freqtrade - INFO - freqtrade 2026.2
2026-10-19 13:24:29,637 - numexpr.utils - INFO - NumExpr defaulting to 16 threads.
2026-10-19 13:24:31,639 - freqtrade.configuration.load_config - INFO - Using config: user_data/AdxDmiRobustV2_test_config.json ...
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
Execution Time: 42.8 seconds | Status: SUCCESS`,
    full_algorithm_code: codeV2,
    full_config: configV2,
  },
  {
    id: 'TEST-20261019-002',
    testname: 'AdxDmiOnlyStrategy_2h_mot2-4_5Years',
    timestamp: '2026-10-19 11:15:10',
    strategy: 'AdxDmiOnlyStrategy',
    timeframe: '2h',
    timerange: '20210101-20260830',
    max_open_trades: '2, 3, 4',
    pairs: ['ETH/USDT', 'XRP/USDT', 'BTC/USDT'],
    status: 'SUCCESS',
    profit_pct: 78.4,
    drawdown_pct: 16.8,
    win_rate_pct: 59.2,
    total_trades: 516,
    final_balance: 178.4,
    duration_seconds: 28.4,
    tags: ['Baseline', 'Spot', 'Breakout-Chasing'],
    notes:
      'Baseline strategy without volatility regime adaptation or ATR stops. Achieves solid gains (+78.4%) but suffers from local top entries and higher drawdown.',
    favorite: false,
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
2h    2        2        162.400 USDT   +62.40%       15.20%      240     58.3%   OK
2h    3        3        174.100 USDT   +74.10%       16.10%      372     58.9%   OK
2h    4        4        178.400 USDT   +78.40%       16.80%      516     59.2%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +62.40% to +78.40% | Best Setting: 2h TF, 4 MOT
===============================================================================`,
    long_result: `2026-10-19 11:15:02,112 - freqtrade - INFO - freqtrade 2026.2
2026-10-19 11:15:03,401 - freqtrade.configuration.load_config - INFO - Using config: user_data/AdxDmiOnlyStrategy_test_config.json ...
2026-10-19 11:15:03,810 - freqtrade.strategy.hyper - INFO - Strategy AdxDmiOnlyStrategy loaded successfully
========================================== BACKTESTING REPORT ==========================================
| Pair      | Entries | Avg Profit % | Cum Profit USDT | Tot Profit % | Win Rate % | Max Drawdown |
|-----------|---------|--------------|-----------------|--------------|------------|--------------|
| ETH/USDT  | 210     | +1.72%       | 36.12           | +36.12%      | 60.1%      | 8.90%        |
| XRP/USDT  | 186     | +1.38%       | 25.66           | +25.66%      | 57.5%      | 11.20%       |
| BTC/USDT  | 120     | +1.38%       | 16.62           | +16.62%      | 60.0%      | 7.40%        |
| TOTAL     | 516     | +1.52%       | 78.40           | +78.40%      | 59.2%      | 16.80%       |
========================================================================================================
Final Balance: 178.400 USDT (Starting: 100.000 USDT)
Total Trades: 516 | Wins: 305 | Losses: 211 | Win Rate: 59.2%
Max Drawdown: 16.80% (18.100 USDT)
Sharpe Ratio: 1.42 | Sortino Ratio: 1.95 | Calmar Ratio: 4.67
Execution Time: 28.4 seconds | Status: SUCCESS`,
    full_algorithm_code: codeV1,
    full_config: configOriginal,
  },
  {
    id: 'TEST-20261019-003',
    testname: 'RegimeAdaptiveMaster_1h_mot2-4_5Years',
    timestamp: '2026-10-19 09:40:22',
    strategy: 'RegimeAdaptiveMaster',
    timeframe: '1h',
    timerange: '20210101-20260830',
    max_open_trades: '2, 4',
    pairs: ['ETH/USDT', 'XRP/USDT', 'DOGE/USDT', 'BTC/USDT'],
    status: 'SUCCESS',
    profit_pct: 189.6,
    drawdown_pct: 9.4,
    win_rate_pct: 74.1,
    total_trades: 934,
    final_balance: 289.6,
    duration_seconds: 51.2,
    tags: ['Top-Performer', 'Regime-Filter', 'ATR-Stops', 'Chop-Avoidance'],
    notes:
      'Exceptional risk-adjusted performance. Features Choppiness Index filter to disable entries in ranging sideways markets, combined with trailing ATR stops.',
    favorite: true,
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
1h    2        2        245.800 USDT   +145.80%      8.60%       480     75.4%   OK
1h    4        4        289.600 USDT   +189.60%      9.40%       934     74.1%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +145.80% to +189.60% | Best Setting: 1h TF, 4 MOT
===============================================================================`,
    long_result: `2026-10-19 09:40:15,441 - freqtrade - INFO - freqtrade 2026.2
2026-10-19 09:40:17,212 - freqtrade.configuration.load_config - INFO - Using config: user_data/config_a.json ...
2026-10-19 09:40:18,500 - freqtrade.strategy.hyper - INFO - Strategy RegimeAdaptiveMaster loaded successfully
========================================== BACKTESTING REPORT ==========================================
| Pair      | Entries | Avg Profit % | Cum Profit USDT | Tot Profit % | Win Rate % | Max Drawdown |
|-----------|---------|--------------|-----------------|--------------|------------|--------------|
| ETH/USDT  | 274     | +2.85%       | 58.12           | +58.12%      | 76.3%      | 5.10%        |
| XRP/USDT  | 242     | +2.24%       | 44.50           | +44.50%      | 73.1%      | 5.80%        |
| DOGE/USDT | 238     | +2.48%       | 48.90           | +48.90%      | 72.7%      | 6.20%        |
| BTC/USDT  | 180     | +2.11%       | 38.08           | +38.08%      | 74.4%      | 4.10%        |
| TOTAL     | 934     | +2.42%       | 189.60          | +189.60%     | 74.1%      | 9.40%        |
========================================================================================================
Final Balance: 289.600 USDT (Starting: 100.000 USDT)
Total Trades: 934 | Wins: 692 | Losses: 242 | Win Rate: 74.1%
Max Drawdown: 9.40% (11.800 USDT)
Sharpe Ratio: 2.85 | Sortino Ratio: 4.12 | Calmar Ratio: 20.17
Execution Time: 51.2 seconds | Status: SUCCESS`,
    full_algorithm_code: codeRegime,
    full_config: configA,
  },
  {
    id: 'TEST-20261018-004',
    testname: 'SupertrendEmaAdx_1h_mot1_1Year',
    timestamp: '2026-10-18 16:30:45',
    strategy: 'SupertrendEmaAdx',
    timeframe: '1h',
    timerange: '20250101-20260830',
    max_open_trades: '1',
    pairs: ['DOGE/USDT', 'XRP/USDT', 'BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
    status: 'SUCCESS',
    profit_pct: 44.2,
    drawdown_pct: 14.1,
    win_rate_pct: 61.0,
    total_trades: 312,
    final_balance: 144.2,
    duration_seconds: 22.1,
    tags: ['Trend-Following', 'Supertrend', 'Conservative'],
    notes:
      'Conservative 1-trade trend strategy. Solid steady equity curve with relatively low trade frequency.',
    favorite: false,
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
1h    1        1        144.200 USDT   +44.20%       14.10%      312     61.0%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +44.20% | Single MOT Trend Strategy
===============================================================================`,
    long_result: `2026-10-18 16:30:40,210 - freqtrade - INFO - freqtrade 2026.2
2026-10-18 16:30:41,500 - freqtrade.strategy.hyper - INFO - Strategy SupertrendEmaAdx loaded successfully
Total Trades: 312 | Wins: 190 | Losses: 122 | Win Rate: 61.0%
Final Balance: 144.200 USDT | Total Profit %: +44.20%
Max Drawdown: 14.10%`,
    full_algorithm_code: `# SupertrendEmaAdx Strategy
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta

class SupertrendEmaAdx(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = "1h"
    stoploss = -0.05
    minimal_roi = {"0": 0.10, "120": 0.05, "360": 0.02}
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["ema_50"] = ta.EMA(dataframe, timeperiod=50)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[(dataframe["close"] > dataframe["ema_50"]) & (dataframe["adx"] > 25), "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["close"] < dataframe["ema_50"], "exit_long"] = 1
        return dataframe
`,
    full_config: configA,
  },
  {
    id: 'TEST-20261017-005',
    testname: 'UniversalMACD_5m_mot1_ChopMarket',
    timestamp: '2026-10-17 14:10:12',
    strategy: 'UniversalMACD',
    timeframe: '5m',
    timerange: '20250325-20260830',
    max_open_trades: '1',
    pairs: ['ETH/USDT', 'BTC/USDT'],
    status: 'FAILED',
    profit_pct: -6.8,
    drawdown_pct: 22.4,
    win_rate_pct: 41.2,
    total_trades: 128,
    final_balance: 93.2,
    duration_seconds: 14.5,
    tags: ['Underperforming', '5m-Whipsaw', 'Review-Needed'],
    notes:
      'Failed benchmark on 5m timeframe. Suffered excessive commission drag and whipsaws in ranging periods. Do not deploy without higher-timeframe trend filter.',
    favorite: false,
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
5m    1        1        93.200 USDT    -6.80%        22.40%      128     41.2%   FAILED
-------------------------------------------------------------------------------
Matrix Profit Range: -6.80% | Excessive whipsaws on 5m timeframe
===============================================================================`,
    long_result: `2026-10-17 14:10:05,123 - freqtrade - INFO - freqtrade 2026.2
2026-10-17 14:10:08,941 - freqtrade.strategy.hyper - INFO - Strategy UniversalMACD loaded
[WARNING] High trade frequency on 5m with negative expectancy.
Total Trades: 128 | Win Rate: 41.2% | Cum Profit: -6.80 USDT
Max Drawdown: 22.40%`,
    full_algorithm_code: `# UniversalMACD Strategy
from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta

class UniversalMACD(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = "5m"
    stoploss = -0.04
    minimal_roi = {"0": 0.05, "60": 0.02}
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        macd = ta.MACD(dataframe)
        dataframe["macd"] = macd["macd"]
        dataframe["macdsignal"] = macd["macdsignal"]
        dataframe["macdhist"] = macd["macdhist"]
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["macd"] > dataframe["macdsignal"], "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[dataframe["macd"] < dataframe["macdsignal"], "exit_long"] = 1
        return dataframe
`,
    full_config: configA,
  },
];

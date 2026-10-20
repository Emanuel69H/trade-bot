import { TestRecord } from '../types/testRecord';

export const SEEDED_TESTS: TestRecord[] = [
  {
    id: 'TEST-20261020-001',
    testname: 'Supertrend_4h_mot3-5-8_5Years',
    timestamp: '2026-10-20 14:15:00',
    strategy: 'Supertrend',
    timeframe: '4h',
    timerange: '20211010-20261010',
    max_open_trades: '3, 5, 8',
    pairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'],
    status: 'SUCCESS',
    profit_pct: 164.2,
    drawdown_pct: 14.8,
    win_rate_pct: 62.4,
    total_trades: 342,
    final_balance: 264.2,
    duration_seconds: 78,
    tags: ['4h', 'Supertrend', 'Benchmark', '5Years'],
    favorite: true,
    notes: 'Multi-Supertrend trend follower on 4h timeframe across top-5 large-cap pairs.',
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
4h    3        3        224.500 USDT   +124.50%      12.40%      184     64.1%   OK
4h    5        5        248.800 USDT   +148.80%      13.80%      276     63.0%   OK
4h    8        8        264.200 USDT   +164.20%      14.80%      342     62.4%   OK
-------------------------------------------------------------------------------
Matrix Profit Range: +124.50% to +164.20% | Best Setting: 4h TF, 8 MOT
===============================================================================`,
    long_result: `Backtest run completed for Supertrend on 4h timeframe across BTC, ETH, SOL, XRP, DOGE.
Results stored in user_data/backtests.db.`,
    full_algorithm_code: `# Supertrend strategy definition`,
    full_config: `{\n  "timeframe": "4h",\n  "max_open_trades": 5\n}`,
  },
  {
    id: 'TEST-20261019-001',
    testname: 'AdxDmiRobustV2_1h-2h_mot2-4_5Years',
    timestamp: '2026-10-19 18:30:00',
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
    duration_seconds: 94,
    tags: ['1h', '2h', 'Multi-TF', '5Years'],
    favorite: true,
    notes: 'Robust benchmark multi-timeframe backtest.',
    short_result: `===============================================================================
                     FREQTRADE BACKTEST MATRIX SUMMARY
===============================================================================
TF    Req MOT  Rep MOT  Final Balance  Tot Profit %  Drawdown %  Trades  Win %   Status
-------------------------------------------------------------------------------
1h    2        2        218.420 USDT   +118.42%      11.20%      412     69.4%   OK
1h    4        4        242.850 USDT   +142.85%      12.30%      842     68.5%   OK
2h    4        4        215.100 USDT   +115.10%      11.40%      580     70.1%   OK
===============================================================================`,
    long_result: `Backtest run completed successfully.`,
    full_algorithm_code: `# AdxDmiRobustV2`,
    full_config: `{\n  "timeframe": "1h",\n  "max_open_trades": 4\n}`,
  },
];

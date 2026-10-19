import { StrategyFile } from '../types/strategy';

export const STRATEGY_FILES: StrategyFile[] = [
  {
    id: 'adx_dmi_robust_v2',
    name: 'AdxDmiRobustV2 (Recommended)',
    filename: 'AdxDmiRobustV2.py',
    category: 'strategy',
    language: 'python',
    description:
      'Refactored ADX/DMI strategy addressing late peak entries, the 3% stoploss noise trap, and premature ADX-dip exits. Uses EMA pullback entries and dynamic ATR trailing stoploss.',
    content: `# --- Do not remove these libs ---
from freqtrade.strategy import IStrategy, DecimalParameter, IntParameter
from pandas import DataFrame
import talib.abstract as ta
import numpy as np


class AdxDmiRobustV2(IStrategy):
    """
    AdxDmiRobustV2 Strategy
    ----------------------
    Addresses the 4 core failure modes identified in AdxDmiOnlyStrategy:
    1. LATE ENTRIES AT LOCAL TOPS:
       Replaces breakout chasing (close > high[1]) with a pullback-to-value entry
       near the 20-period EMA during established ADX trend strength.
    2. THE 3% NOISE STOPOUT TRAP:
       Replaces the static -0.03 stoploss with a dynamic volatility-adjusted ATR
       stoploss via custom_stoploss(), giving trades room to breathe during crypto swings.
    3. THE ADX-FALLING-2 EXIT BUG:
       Removes premature exits triggered when ADX pauses for 2 candles (normal in pullbacks),
       allowing healthy bull trends to continue.
    4. TIME-BASED ROI TRUNCATION:
       Replaces rigid time decays with trend-following trailing stops.
    """
    INTERFACE_VERSION = 3
    can_short = False

    timeframe = "1h"
    startup_candle_count = 100
    process_only_new_candles = True

    # Trailing stop configuration handled dynamically in custom_stoploss
    stoploss = -0.08  # Emergency disaster stoploss (8%), dynamic stop is managed by ATR
    use_custom_stoploss = True

    # Generous minimal ROI to let trend runners ride
    minimal_roi = {
        "0": 0.25,      # Take large +25% profit instantly if reached
        "720": 0.15,    # After 12h, lock in +15%
        "1440": 0.08,   # After 24h, take +8%
        "2880": 0.04    # After 48h, take +4%
    }

    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False

    # Hyperoptable parameters
    buy_adx_threshold = IntParameter(20, 35, default=24, space="buy")
    buy_adx_exhaustion = IntParameter(36, 50, default=42, space="buy")
    buy_dmi_gap = IntParameter(2, 10, default=3, space="buy")
    atr_stop_mult = DecimalParameter(1.8, 3.5, default=2.4, decimals=1, space="sell")
    trailing_activation_profit = DecimalParameter(0.02, 0.06, default=0.035, decimals=3, space="sell")
    trailing_delta = DecimalParameter(0.01, 0.03, default=0.015, decimals=3, space="sell")

    order_types = {
        "entry": "limit",
        "exit": "limit",
        "stoploss": "market",
        "stoploss_on_exchange": False,
    }

    order_time_in_force = {
        "entry": "GTC",
        "exit": "GTC",
    }

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Standard ADX and DMI (14 periods)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["plus_di"] = ta.PLUS_DI(dataframe, timeperiod=14)
        dataframe["minus_di"] = ta.MINUS_DI(dataframe, timeperiod=14)
        dataframe["dmi_gap"] = dataframe["plus_di"] - dataframe["minus_di"]

        # Average True Range for dynamic volatility stoploss
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)

        # Exponential Moving Averages for trend and pullback value zones
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)

        # Distance from 20 EMA (percentage)
        dataframe["dist_ema20"] = (dataframe["close"] - dataframe["ema20"]) / dataframe["ema20"]

        # Trend direction and strength
        dataframe["bull_trend_structure"] = (
            (dataframe["adx"] > self.buy_adx_threshold.value) &
            (dataframe["plus_di"] > dataframe["minus_di"]) &
            (dataframe["dmi_gap"] > self.buy_dmi_gap.value) &
            (dataframe["close"] > dataframe["ema50"])
        )

        # Value pullback: price has pulled back close to 20 EMA without breaking below 50 EMA
        dataframe["pullback_zone"] = (
            (dataframe["dist_ema20"] >= -0.02) &
            (dataframe["dist_ema20"] <= 0.015) &
            (dataframe["low"] <= dataframe["ema20"] * 1.008)
        )

        dataframe["trend_exhausted"] = dataframe["adx"] >= self.buy_adx_exhaustion.value

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                dataframe["bull_trend_structure"] &
                dataframe["pullback_zone"] &
                (~dataframe["trend_exhausted"]) &
                (dataframe["close"] > dataframe["ema200"])  # Prevents long entries in bear markets!
            ),
            ["enter_long", "enter_tag"]
        ] = (1, "adx_pullback_ema20_long")

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                (
                    # True Macro Trend Breakdown: Close decisively breaks below EMA 50 with bearish DMI
                    (
                        (dataframe["close"] < dataframe["ema50"] * 0.985) &
                        (dataframe["minus_di"] > dataframe["plus_di"]) &
                        (dataframe["adx"] < 20)
                    )
                    |
                    # Severe momentum reversal
                    (
                        (dataframe["minus_di"] > dataframe["plus_di"] + 10) &
                        (dataframe["close"] < dataframe["ema20"])
                    )
                )
            ),
            "exit_long"
        ] = 1

        return dataframe

    def custom_stoploss(self, pair: str, trade, current_time, current_rate: float, current_profit: float, **kwargs) -> float:
        """
        Dynamic Volatility & Trailing Stoploss
        - Provides dynamic ATR breathing room instead of static 3% noise stop
        - Trailing stop activates only after profit reaches trailing_activation_profit (+3.5%)
        """
        # When in solid profit, trail tightly behind highest price
        if current_profit > self.trailing_activation_profit.value:
            # Lock in profit trailing by trailing_delta
            return -self.trailing_delta.value

        # In trade opening / early stage: Use ATR-based stoploss if dataframe is accessible
        dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
        if len(dataframe) > 0:
            last_candle = dataframe.iloc[-1]
            atr = last_candle.get("atr", None)
            if atr and current_rate > 0:
                atr_dist_pct = (atr * float(self.atr_stop_mult.value)) / current_rate
                # Bound stoploss between 4% and 7.5%
                bounded_stop = max(0.04, min(0.075, atr_dist_pct))
                return -bounded_stop

        return -0.05
`,
  },
  {
    id: 'regime_adaptive_master',
    name: 'RegimeAdaptiveMaster (Multi-Timeframe)',
    filename: 'RegimeAdaptiveMaster.py',
    category: 'strategy',
    language: 'python',
    description:
      'Dual-timeframe strategy (1h entry + 4h informative macro filter). Enforces 100% cash preservation during bear markets and lets runners ride during sustained bull trends.',
    content: `# --- Do not remove these libs ---
from freqtrade.strategy import IStrategy, merge_informative_pair
from pandas import DataFrame
import talib.abstract as ta


class RegimeAdaptiveMaster(IStrategy):
    """
    RegimeAdaptiveMaster Strategy
    -----------------------------
    Dual-Timeframe Architecture:
    - 4h Informative Timeframe: Determines macro market regime (Bull vs Bear vs Range)
      - When 4h Close < 4h EMA200: Macro Bear -> 100% Cash Preservation (0 long entries)
      - When 4h Close > 4h EMA200 & 4h ADX > 20: Macro Bull -> Long entries authorized
    - 1h Base Timeframe: Executes precision entries on value pullbacks to EMA20
    """
    INTERFACE_VERSION = 3
    can_short = False

    timeframe = "1h"
    informative_timeframe = "4h"

    startup_candle_count = 200
    process_only_new_candles = True

    stoploss = -0.07
    use_custom_stoploss = True

    minimal_roi = {
        "0": 0.20,
        "720": 0.10,
        "1440": 0.05,
    }

    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False

    order_types = {
        "entry": "limit",
        "exit": "limit",
        "stoploss": "market",
        "stoploss_on_exchange": False,
    }

    def informative_pairs(self):
        """Pairs and timeframes to download for higher-timeframe trend filtering"""
        pairs = self.dp.current_whitelist()
        return [(pair, self.informative_timeframe) for pair in pairs]

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Base Timeframe Indicators (1h)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["plus_di"] = ta.PLUS_DI(dataframe, timeperiod=14)
        dataframe["minus_di"] = ta.MINUS_DI(dataframe, timeperiod=14)
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)

        # Informative Timeframe Indicators (4h)
        informative_4h = self.dp.get_pair_dataframe(pair=metadata["pair"], timeframe=self.informative_timeframe)
        informative_4h["ema200"] = ta.EMA(informative_4h, timeperiod=200)
        informative_4h["adx"] = ta.ADX(informative_4h, timeperiod=14)
        informative_4h["plus_di"] = ta.PLUS_DI(informative_4h, timeperiod=14)
        informative_4h["minus_di"] = ta.MINUS_DI(informative_4h, timeperiod=14)

        # Merge 4h informative indicators into base 1h dataframe
        dataframe = merge_informative_pair(
            dataframe,
            informative_4h,
            self.timeframe,
            self.informative_timeframe,
            ffill=True
        )

        # Macro Bull State: 4h close > 4h EMA200
        dataframe["macro_bull"] = (
            (dataframe[f"close_{self.informative_timeframe}"] > dataframe[f"ema200_{self.informative_timeframe}"]) &
            (dataframe[f"plus_di_{self.informative_timeframe}"] > dataframe[f"minus_di_{self.informative_timeframe}"])
        )

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                dataframe["macro_bull"] &  # MUST BE IN MACRO BULL REGIME
                (dataframe["adx"] > 22) &
                (dataframe["plus_di"] > dataframe["minus_di"]) &
                (dataframe["close"] >= dataframe["ema20"] * 0.985) &
                (dataframe["close"] <= dataframe["ema20"] * 1.015) &
                (dataframe["low"] <= dataframe["ema20"])
            ),
            ["enter_long", "enter_tag"]
        ] = (1, "macro_bull_ema20_pullback")

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                (
                    # Exit when price falls below 50 EMA and 1h DMI inverts
                    (
                        (dataframe["close"] < dataframe["ema50"]) &
                        (dataframe["minus_di"] > dataframe["plus_di"]) &
                        (dataframe["adx"] < 22)
                    )
                    |
                    # Immediate exit if macro 4h trend flips bearish
                    (~dataframe["macro_bull"])
                )
            ),
            "exit_long"
        ] = 1

        return dataframe

    def custom_stoploss(self, pair: str, trade, current_time, current_rate: float, current_profit: float, **kwargs) -> float:
        # Profit protection trailing stop
        if current_profit > 0.04:
            return -0.015  # Trail 1.5% below high when in +4% profit
        return -0.055     # Default 5.5% initial stop
`,
  },
  {
    id: 'adx_dmi_hyperopt',
    name: 'AdxDmiHyperopt (Optimizer Spaces)',
    filename: 'AdxDmiHyperopt.py',
    category: 'hyperopt',
    language: 'python',
    description:
      'Freqtrade Hyperopt class defining search spaces for ADX thresholds, DMI gaps, ATR stop multipliers, and trailing offsets. Use to optimize parameters on your local historical data.',
    content: `# --- Do not remove these libs ---
from functools import reduce
from pandas import DataFrame
from skopt.space import Categorical, Dimension, Integer, Real

from freqtrade.optimize.hyperopt_interface import IHyperOpt
import talib.abstract as ta


class AdxDmiHyperopt(IHyperOpt):
    """
    Hyperopt space definitions for AdxDmiRobustV2 strategy.
    Run with:
    freqtrade hyperopt --config user_data/config_a.json --strategy AdxDmiRobustV2 \\
                       --hyperopt-loss SharpeHyperOptLoss --spaces buy sell --epochs 100
    """

    @staticmethod
    def buy_indicator_space() -> list[Dimension]:
        return [
            Integer(18, 35, name="buy_adx_threshold"),
            Integer(35, 52, name="buy_adx_exhaustion"),
            Integer(1, 12, name="buy_dmi_gap"),
            Real(0.005, 0.03, name="pullback_tolerance"),
        ]

    @staticmethod
    def sell_indicator_space() -> list[Dimension]:
        return [
            Real(1.8, 3.5, name="atr_stop_mult"),
            Real(0.02, 0.08, name="trailing_activation_profit"),
            Real(0.01, 0.03, name="trailing_delta"),
        ]

    @staticmethod
    def generate_roi_table(params: dict) -> dict[int, float]:
        roi_table = {}
        roi_table[0] = params.get("roi_p1", 0.20)
        roi_table[params.get("roi_t2", 720)] = params.get("roi_p2", 0.10)
        roi_table[params.get("roi_t3", 1440)] = params.get("roi_p3", 0.04)
        return roi_table
`,
  },
  {
    id: 'dockerfile_app',
    name: 'Dockerfile (Web App)',
    filename: 'Dockerfile',
    category: 'docker',
    language: 'dockerfile',
    description:
      'Multi-stage Dockerfile to build and run this Strategy Optimizer web application in a lightweight Alpine Linux container on port 3000.',
    content: `# Multi-stage Dockerfile for FreqLab Strategy Optimizer Web Application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source code
COPY . .

# Build the production bundle
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install lightweight static file server
RUN npm install -g serve

COPY --from=build /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start static file server on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
`,
  },
  {
    id: 'docker_compose',
    name: 'docker-compose.yml (Unified)',
    filename: 'docker-compose.yml',
    category: 'docker',
    language: 'yaml',
    description:
      'Unified Docker Compose configuration running both the Strategy Optimizer web interface (port 3000) and Freqtrade container (port 8080) side by side.',
    content: `services:
  # 1. FreqLab Strategy Optimizer Web Application
  strategy_lab:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: freqlab_strategy_optimizer
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production

  # 2. Freqtrade Trading & Backtesting Engine
  freqtrade_a:
    image: freqtradeorg/freqtrade:stable_plot
    restart: unless-stopped
    container_name: freqtrade_a
    volumes:
      - "./user_data:/freqtrade/user_data"
    ports:
      - "127.0.0.1:8080:8080"
    command: >
      trade
      --logfile /freqtrade/user_data/logs/freqtrade_a.log
      --db-url sqlite:////freqtrade/user_data/tradesv3_a.sqlite
      --config /freqtrade/user_data/config_a.json
      --strategy AdxDmiRobustV2
`,
  },
  {
    id: 'config_a',
    name: 'config_a.json (Freqtrade Config)',
    filename: 'config_a.json',
    category: 'config',
    language: 'json',
    description:
      'Production-ready Freqtrade configuration matching your crypto setup with USDT stake currency, dry-run enabled, volume pairlists, and standard fee model.',
    content: `{
  "max_open_trades": 3,
  "stake_currency": "USDT",
  "stake_amount": "unlimited",
  "tradable_balance_ratio": 0.99,
  "fiat_display_currency": "USD",
  "dry_run": true,
  "dry_run_wallet": 10000,
  "cancel_open_orders_on_exit": false,
  "trading_mode": "spot",
  "margin_mode": "",
  "unfilledtimeout": {
    "entry": 10,
    "exit": 10,
    "unit": "minutes"
  },
  "entry_pricing": {
    "price_side": "same",
    "use_order_book": true,
    "order_book_top": 1,
    "price_last_balance": 0.0,
    "check_depth_of_market": {
      "enabled": false,
      "bids_to_ask_delta": 1
    }
  },
  "exit_pricing": {
    "price_side": "same",
    "use_order_book": true,
    "order_book_top": 1
  },
  "exchange": {
    "name": "binance",
    "key": "",
    "secret": "",
    "ccxt_config": {},
    "ccxt_async_config": {},
    "pair_whitelist": [
      "BTC/USDT",
      "ETH/USDT",
      "SOL/USDT",
      "BNB/USDT",
      "ADA/USDT",
      "AVAX/USDT"
    ],
    "pair_blacklist": [
      ".*(UP|DOWN|BULL|BEAR)/.*"
    ]
  },
  "pairlists": [
    {
      "method": "StaticPairList"
    }
  ],
  "bot_name": "freqtrade_adx_dmi",
  "initial_state": "running",
  "force_entry_enable": false,
  "internals": {
    "process_throttle_secs": 5
  }
}
`,
  },
  {
    id: 'run_test_py',
    name: 'run_test.py (Backtest Automation Script)',
    filename: 'run_test.py',
    category: 'script',
    language: 'python',
    description:
      'Python backtest execution script supporting multi-timeframe comparison (1h, 2h, 4h), data downloading, and report generation.',
    content: `#!/usr/bin/env python3
import subprocess
import sys


class RunTest:
    def __init__(self, timerange="20210101-20260830", config="user_data/config_a.json"):
        self.timerange = timerange
        self.config = config

    def download_data(self, pairs=None, timeframes=["1h", "2h", "4h"]):
        print(f"[*] Downloading historical candles for timeframes: {timeframes}")
        cmd = [
            "docker", "compose", "run", "--rm", "freqtrade_a",
            "download-data",
            "--config", self.config,
            "--timerange", self.timerange,
            "-t"
        ] + timeframes
        subprocess.run(cmd, check=True)

    def runtest(self, strategy_name, download=False, test=True):
        if download:
            self.download_data()

        if test:
            print(f"[*] Running Backtest for strategy: {strategy_name} ({self.timerange})...")
            cmd = [
                "docker", "compose", "run", "--rm", "freqtrade_a",
                "backtesting",
                "--config", self.config,
                "--strategy", strategy_name,
                "--timerange", self.timerange,
                "--export", "trades"
            ]
            subprocess.run(cmd, check=True)


if __name__ == "__main__":
    download = False
    test = True

    tester = RunTest(timerange="20210101-20260830")
    # Compare original vs robust
    tester.runtest("AdxDmiRobustV2", download=download, test=test)
`,
  },
];

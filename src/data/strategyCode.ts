import { StrategyFile } from '../types/strategy';

export const STRATEGY_FILES: StrategyFile[] = [
  {
    id: 'adx_dmi_large_cap_15m',
    name: 'AdxDmiLargeCap15m (15m + 1h Macro Filter)',
    filename: 'AdxDmiLargeCap15m.py',
    category: 'strategy',
    language: 'python',
    description:
      'High-performance 15-minute execution strategy engineered for BTC, ETH, and SOL. Uses 1-hour macro trend anchor, EMA20 value pullback entries, dynamic ATR volatility trailing stops, and DMI momentum exhaustion filters.',
    content: `from pandas import DataFrame
import talib.abstract as ta
from freqtrade.strategy import IStrategy, DecimalParameter, IntParameter, informative


class AdxDmiLargeCap15m(IStrategy):
    """
    AdxDmiLargeCap15m Strategy
    --------------------------
    Engineered specifically for high-liquidity Large-Cap crypto assets:
    - Target Basket: BTC/USDT, ETH/USDT, SOL/USDT
    - Base Timeframe: 15m (Agile entry execution)
    - Macro Trend Filter: 1h Informative Timeframe (Anchored directional bias)
    """

    INTERFACE_VERSION = 3
    can_short = False

    timeframe = "15m"
    startup_candle_count = 200
    process_only_new_candles = True

    # Emergency catastrophic hard stoploss (-7%); dynamic stop is handled by custom_stoploss
    stoploss = -0.07
    use_custom_stoploss = True

    # Dynamic Minimal ROI table (scaled for 15m candle velocity)
    minimal_roi = {
        "0": 0.18,      # 18% instant home run take profit
        "90": 0.09,     # 9% after 1.5 hours (6 candles)
        "240": 0.05,    # 5% after 4 hours
        "720": 0.025,   # 2.5% after 12 hours
        "1440": 0.01,   # 1% after 24 hours
    }

    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False

    # Hyperoptable parameters for precision tuning
    buy_adx_threshold = IntParameter(18, 30, default=22, space="buy")
    buy_adx_exhaustion = IntParameter(38, 52, default=45, space="buy")
    buy_dmi_gap = IntParameter(2, 10, default=3, space="buy")
    buy_rsi_max = IntParameter(55, 75, default=65, space="buy")
    
    atr_stop_mult = DecimalParameter(1.8, 3.2, default=2.2, decimals=1, space="sell")
    trailing_activation_profit = DecimalParameter(0.02, 0.05, default=0.025, decimals=3, space="sell")
    trailing_delta = DecimalParameter(0.008, 0.025, default=0.012, decimals=3, space="sell")

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

    @informative("1h")
    def populate_indicators_1h(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["plus_di"] = ta.PLUS_DI(dataframe, timeperiod=14)
        dataframe["minus_di"] = ta.MINUS_DI(dataframe, timeperiod=14)
        dataframe["macro_bull"] = (
            (dataframe["close"] > dataframe["ema50"]) &
            (dataframe["ema50"] > dataframe["ema200"]) &
            (dataframe["plus_di"] > dataframe["minus_di"])
        )
        return dataframe

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["plus_di"] = ta.PLUS_DI(dataframe, timeperiod=14)
        dataframe["minus_di"] = ta.MINUS_DI(dataframe, timeperiod=14)
        dataframe["dmi_gap"] = dataframe["plus_di"] - dataframe["minus_di"]

        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)

        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)

        dataframe["volume_mean_20"] = dataframe["volume"].rolling(window=20).mean()
        dataframe["dist_ema20"] = (dataframe["close"] - dataframe["ema20"]) / dataframe["ema20"]

        dataframe["bull_trend_structure"] = (
            (dataframe["adx"] > self.buy_adx_threshold.value) &
            (dataframe["plus_di"] > dataframe["minus_di"]) &
            (dataframe["dmi_gap"] > self.buy_dmi_gap.value) &
            (dataframe["close"] > dataframe["ema50"])
        )

        dataframe["pullback_entry_zone"] = (
            (dataframe["low"] <= dataframe["ema20"] * 1.006) &
            (dataframe["close"] >= dataframe["ema20"] * 0.985) &
            (dataframe["dist_ema20"] <= 0.012)
        )

        dataframe["trend_exhausted"] = dataframe["adx"] >= self.buy_adx_exhaustion.value

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        macro_filter = (dataframe["close"] > dataframe["ema200"])
        if "macro_bull_1h" in dataframe.columns:
            macro_filter = (dataframe["macro_bull_1h"] == 1) | (dataframe["close"] > dataframe["ema200"])
        elif "ema50_1h" in dataframe.columns:
            macro_filter = (dataframe["close"] > dataframe["ema50_1h"])

        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                (dataframe["volume"] > dataframe["volume_mean_20"] * 0.75) &
                macro_filter &
                dataframe["bull_trend_structure"] &
                dataframe["pullback_entry_zone"] &
                (~dataframe["trend_exhausted"]) &
                (dataframe["rsi"] < self.buy_rsi_max.value) &
                (dataframe["rsi"] > 38)
            ),
            ["enter_long", "enter_tag"]
        ] = (1, "adx_15m_ema_pullback_long")

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                (
                    (
                        (dataframe["close"] < dataframe["ema50"] * 0.99) &
                        (dataframe["minus_di"] > dataframe["plus_di"] + 4) &
                        (dataframe["adx"] < 22)
                    )
                    |
                    (
                        (dataframe["minus_di"] > dataframe["plus_di"] + 12) &
                        (dataframe["close"] < dataframe["ema20"])
                    )
                    |
                    (
                        (dataframe["adx"] > 42) &
                        (dataframe["adx"] < dataframe["adx"].shift(1)) &
                        (dataframe["adx"].shift(1) < dataframe["adx"].shift(2)) &
                        (dataframe["plus_di"] < dataframe["plus_di"].shift(1))
                    )
                )
            ),
            "exit_long"
        ] = 1

        return dataframe

    def custom_stoploss(self, pair: str, trade, current_time, current_rate: float, current_profit: float, **kwargs) -> float:
        if current_profit > self.trailing_activation_profit.value:
            return -self.trailing_delta.value

        try:
            dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            if len(dataframe) > 0:
                last_candle = dataframe.iloc[-1]
                atr = last_candle.get("atr", None)
                if atr and current_rate > 0:
                    atr_pct = (atr * float(self.atr_stop_mult.value)) / current_rate
                    return -max(0.032, min(0.065, atr_pct))
        except Exception:
            pass

        return -0.045
`,
  },
  {
    id: 'adx_dmi_large_cap_15m_config',
    name: 'AdxDmiLargeCap15m Config',
    filename: 'AdxDmiLargeCap15m_test_config.json',
    category: 'config',
    language: 'json',
    description:
      'Freqtrade test configuration for AdxDmiLargeCap15m on Binance spot. Whitelists BTC/USDT, ETH/USDT, and SOL/USDT with 15m timeframe.',
    content: `{
  "$schema": "https://schema.freqtrade.io/schema.json",
  "max_open_trades": 3,
  "stake_currency": "USDT",
  "stake_amount": 30,
  "tradable_balance_ratio": 0.99,
  "fiat_display_currency": "USD",
  "timeframe": "15m",
  "dry_run": true,
  "dry_run_wallet": 100,
  "cancel_open_orders_on_exit": false,
  "trading_mode": "spot",
  "margin_mode": "",
  "unfilledtimeout": {
    "entry": 10,
    "exit": 10,
    "exit_timeout_count": 0,
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
    "enable_ws": false,
    "name": "binance",
    "pair_whitelist": [
      "BTC/USDT",
      "ETH/USDT",
      "SOL/USDT"
    ],
    "pair_blacklist": []
  },
  "pairlists": [
    {
      "method": "StaticPairList"
    }
  ],
  "telegram": {
    "enabled": false,
    "token": "",
    "chat_id": ""
  },
  "api_server": {
    "enabled": false,
    "listen_ip_address": "0.0.0.0",
    "listen_port": 8080,
    "verbosity": "error",
    "enable_openapi": false,
    "jwt_secret_key": "b9f02031e48864fbb4a11c8b62b38e8be7110bdcaf1d1ebd935545124b33aa2d",
    "ws_token": "lB9vtd_FdyvtGkEJaIq2VF2BqvEEekPnyw",
    "CORS_origins": [
      "http://127.0.0.1:8081",
      "http://localhost:3000"
    ],
    "username": "super-trader",
    "password": "_f5eL-7x9T=DEdnFS'-#Kzubu^Yu^4^4!Euqc*X:2.7DV_MAULm/Sp23u]#]g2C"
  },
  "bot_name": "freqtrade",
  "initial_state": "running",
  "force_entry_enable": false,
  "internals": {
    "process_throttle_secs": 5
  }
}`,
  },
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
RUN npm install --legacy-peer-deps

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
  {
    id: 'gui_runner_py',
    name: 'gui_runner.py (CustomTkinter Desktop GUI)',
    filename: 'gui_runner.py',
    category: 'script',
    language: 'python',
    description:
      'Full-featured desktop GUI test runner built with CustomTkinter. Features true monospace ASCII alignment (Courier New / Consolas), font size selection, dynamic theme colors, and Dark/Light mode.',
    content: `#!/usr/bin/env python3
"""
Freqtrade Desktop GUI Test Runner
Built with CustomTkinter for local strategy execution, multi-threaded matrix testing,
and comprehensive log analysis with true monospace alignment, font scaling, and theme controls.
Run with: python gui_runner.py
"""
import os
import subprocess
import sys
import threading
from pathlib import Path
from run_test import RunTest, Tonification, HAS_CTK

if not HAS_CTK:
    print("[ERROR] customtkinter is required for gui_runner.py.")
    print("Install via: pip install customtkinter")
    sys.exit(1)

import customtkinter as ctk

# Default appearance settings
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

THEME_PALETTES = {
    "Blue": {
        "primary": ("#2563eb", "#3b82f6"),
        "hover": ("#1d4ed8", "#2563eb"),
        "accent": ("#0284c7", "#38bdf8"),
    },
    "Green": {
        "primary": ("#059669", "#10b981"),
        "hover": ("#047857", "#059669"),
        "accent": ("#059669", "#34d399"),
    },
    "Dark-Blue": {
        "primary": ("#1e40af", "#2563eb"),
        "hover": ("#1e3a8a", "#1d4ed8"),
        "accent": ("#1d4ed8", "#60a5fa"),
    },
    "Purple": {
        "primary": ("#7c3aed", "#8b5cf6"),
        "hover": ("#6d28d9", "#7c3aed"),
        "accent": ("#7c3aed", "#a78bfa"),
    },
    "Amber": {
        "primary": ("#d97706", "#f59e0b"),
        "hover": ("#b45309", "#d97706"),
        "accent": ("#d97706", "#fbbf24"),
    },
}

MONO_FONTS = ["Courier New", "Consolas", "Courier", "Lucida Console"]


def get_strategies_from_folder() -> list[str]:
    base_dir = Path(__file__).resolve().parent
    strat_dir = base_dir / "user_data" / "strategies"
    if not strat_dir.exists():
        strat_dir = Path("user_data/strategies")
    if not strat_dir.exists():
        return ["AdxDmiRobustV2", "AdxDmiOnlyStrategy"]
    found = [
        f.stem for f in strat_dir.glob("*.py")
        if not f.name.startswith("__") and not f.name.startswith(".")
    ]
    return sorted(found) if found else ["AdxDmiRobustV2"]


class FreqtradeGuiRunner(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Freqtrade Strategy GUI Runner")
        self.geometry("1140x820")
        self.minsize(960, 680)

        self.tester = RunTest()

        self.current_font_family = "Courier New"
        self.current_font_size = 11
        self.current_theme = "Blue"
        self.log_font = ctk.CTkFont(family=self.current_font_family, size=self.current_font_size)

        self.short_log_content = ""
        self.long_log_content = ""
        self.raw_console_content = (
            "[INFO] Freqtrade GUI Runner Initialized.\\n"
            "[INFO] Monospace font configured for accurate ASCII table alignment.\\n"
            "Select a strategy and click 'Run Backtest Matrix'.\\n"
        )

        self.timeranges = [
            ("5 Years (2021-2026)", self.tester.TR_5Y),
            ("3 Years (2023-2026)", self.tester.TR_3Y),
            ("2 Years (2024-2026)", self.tester.TR_2Y),
            ("1 Year (2025-2026)", self.tester.TR_1Y),
            ("6 Months (2025-2026)", self.tester.TR_6M),
            ("Latest (20250325-2026)", self.tester.TR_LY),
        ]

        self._build_ui()
        self._load_existing_logs(self.strat_menu.get())

    def _build_ui(self):
        # Header Frame
        header_frame = ctk.CTkFrame(self, fg_color=("#e2e8f0", "#0f172a"), corner_radius=0)
        header_frame.pack(fill="x", padx=0, pady=0)

        self.title_label = ctk.CTkLabel(
            header_frame,
            text="⚡ Freqtrade Backtest GUI",
            font=("Arial", 18, "bold"),
            text_color=THEME_PALETTES["Blue"]["accent"],
        )
        self.title_label.pack(side="left", padx=20, pady=12)

        theme_controls = ctk.CTkFrame(header_frame, fg_color="transparent")
        theme_controls.pack(side="right", padx=16, pady=8)

        ctk.CTkLabel(theme_controls, text="Mode:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.mode_toggle = ctk.CTkSegmentedButton(
            theme_controls,
            values=["Dark", "Light"],
            width=110,
            command=self._on_appearance_mode_change,
        )
        self.mode_toggle.set("Dark")
        self.mode_toggle.pack(side="left", padx=(0, 14))

        ctk.CTkLabel(theme_controls, text="Theme:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.theme_menu = ctk.CTkOptionMenu(
            theme_controls,
            values=list(THEME_PALETTES.keys()),
            width=105,
            command=self._on_theme_color_change,
        )
        self.theme_menu.set("Blue")
        self.theme_menu.pack(side="left")

        # Control Panel
        control_frame = ctk.CTkFrame(self, fg_color=("#cbd5e1", "#1e293b"), corner_radius=10)
        control_frame.pack(fill="x", padx=16, pady=10)

        row1 = ctk.CTkFrame(control_frame, fg_color="transparent")
        row1.pack(fill="x", padx=12, pady=10)

        ctk.CTkLabel(row1, text="Strategy:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))
        available_strats = get_strategies_from_folder()
        self.strat_menu = ctk.CTkOptionMenu(
            row1,
            values=available_strats,
            width=230,
            command=self._on_strategy_change,
        )
        default_strat = "AdxDmiRobustV2" if "AdxDmiRobustV2" in available_strats else available_strats[0]
        self.strat_menu.set(default_strat)
        self.strat_menu.pack(side="left", padx=(0, 8))

        self.refresh_btn = ctk.CTkButton(
            row1,
            text="🔄 Refresh",
            width=80,
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._refresh_strategies,
        )
        self.refresh_btn.pack(side="left", padx=(0, 18))

        ctk.CTkLabel(row1, text="Timerange:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))
        self.tr_menu = ctk.CTkOptionMenu(
            row1,
            values=[label for label, _ in self.timeranges],
            width=210,
        )
        self.tr_menu.set(self.timeranges[0][0])
        self.tr_menu.pack(side="left", padx=(0, 18))

        self.download_var = ctk.BooleanVar(value=False)
        self.download_cb = ctk.CTkCheckBox(row1, text="Download Data First", variable=self.download_var)
        self.download_cb.pack(side="left")

        # Row 2: Config info
        self.info_label = ctk.CTkLabel(
            control_frame,
            text="",
            font=("Consolas", 11),
            text_color=("#059669", "#34d399"),
            justify="left",
        )
        self.info_label.pack(fill="x", padx=12, pady=(0, 8))
        self._on_strategy_change(self.strat_menu.get())

        # Row 3: Buttons
        btn_row = ctk.CTkFrame(control_frame, fg_color="transparent")
        btn_row.pack(fill="x", padx=12, pady=(0, 10))

        self.run_btn = ctk.CTkButton(
            btn_row,
            text="🚀 Run Backtest Matrix",
            font=("Arial", 14, "bold"),
            fg_color="#10b981",
            hover_color="#059669",
            height=38,
            command=self._start_run_thread,
        )
        self.run_btn.pack(side="left", padx=(0, 12))

        self.plot_btn = ctk.CTkButton(
            btn_row,
            text="📈 Plot Dataframe (Brave)",
            font=("Arial", 13),
            fg_color="#3b82f6",
            hover_color="#2563eb",
            height=38,
            command=self._plot_current,
        )
        self.plot_btn.pack(side="left", padx=(0, 12))

        self.open_logs_btn = ctk.CTkButton(
            btn_row,
            text="📂 Open Logs Folder",
            font=("Arial", 12),
            fg_color=("#64748b", "#475569"),
            hover_color=("#475569", "#64748b"),
            height=38,
            command=self._open_logs_folder,
        )
        self.open_logs_btn.pack(side="left", padx=(0, 12))

        self.status_label = ctk.CTkLabel(
            btn_row,
            text="Ready",
            font=("Arial", 12),
            text_color=("#475569", "#94a3b8"),
        )
        self.status_label.pack(side="left", padx=10)

        # Output Terminal
        output_frame = ctk.CTkFrame(self, fg_color=("#f1f5f9", "#090d16"), corner_radius=10)
        output_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        top_output_bar = ctk.CTkFrame(output_frame, fg_color="transparent")
        top_output_bar.pack(fill="x", padx=12, pady=(8, 4))

        ctk.CTkLabel(
            top_output_bar,
            text="Logs:",
            font=("Arial", 12, "bold"),
            text_color=("#334155", "#cbd5e1"),
        ).pack(side="left", padx=(0, 8))

        self.log_mode_segmented = ctk.CTkSegmentedButton(
            top_output_bar,
            values=["Short Summary (Table)", "Detailed Long Log", "Docker Console"],
            command=self._on_log_mode_change,
        )
        self.log_mode_segmented.set("Docker Console")
        self.log_mode_segmented.pack(side="left")

        font_bar = ctk.CTkFrame(top_output_bar, fg_color="transparent")
        font_bar.pack(side="right")

        ctk.CTkLabel(font_bar, text="Font:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.font_family_menu = ctk.CTkOptionMenu(
            font_bar,
            values=MONO_FONTS,
            width=115,
            command=self._on_font_family_change,
        )
        self.font_family_menu.set(self.current_font_family)
        self.font_family_menu.pack(side="left", padx=(0, 10))

        ctk.CTkLabel(font_bar, text="Size:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.font_size_menu = ctk.CTkOptionMenu(
            font_bar,
            values=["9", "10", "11", "12", "13", "14", "16", "18"],
            width=65,
            command=self._on_font_size_change,
        )
        self.font_size_menu.set(str(self.current_font_size))
        self.font_size_menu.pack(side="left", padx=(0, 8))

        self.copy_btn = ctk.CTkButton(
            font_bar,
            text="📋 Copy",
            width=65,
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._copy_log_to_clipboard,
        )
        self.copy_btn.pack(side="left")

        self.textbox = ctk.CTkTextbox(
            output_frame,
            font=self.log_font,
            text_color=("#0f172a", "#f1f5f9"),
            fg_color=("#ffffff", "#020617"),
            wrap="none",
        )
        self.textbox.pack(fill="both", expand=True, padx=8, pady=(4, 8))
        self._apply_strict_monospace_font()
        self.textbox.insert("end", self.raw_console_content)

    def _apply_strict_monospace_font(self):
        try:
            self.log_font = ctk.CTkFont(family=self.current_font_family, size=self.current_font_size)
            self.textbox.configure(font=self.log_font)
            if hasattr(self.textbox, "_textbox"):
                self.textbox._textbox.configure(font=(self.current_font_family, self.current_font_size))
        except Exception as exc:
            print(f"[FONT ERROR] {exc}")

    def _on_appearance_mode_change(self, mode: str):
        ctk.set_appearance_mode(mode.lower())

    def _on_theme_color_change(self, theme: str):
        self.current_theme = theme
        palette = THEME_PALETTES.get(theme, THEME_PALETTES["Blue"])
        self.title_label.configure(text_color=palette["accent"])
        self.plot_btn.configure(fg_color=palette["primary"], hover_color=palette["hover"])
        self.strat_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.tr_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.theme_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.font_family_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.font_size_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])

        theme_map = {"Blue": "blue", "Green": "green", "Dark-Blue": "dark-blue"}
        if theme in theme_map:
            ctk.set_default_color_theme(theme_map[theme])

    def _on_font_family_change(self, family: str):
        self.current_font_family = family
        self._apply_strict_monospace_font()

    def _on_font_size_change(self, size_str: str):
        try:
            self.current_font_size = int(size_str)
            self._apply_strict_monospace_font()
        except Exception as exc:
            print(f"[FONT SIZE ERROR] {exc}")

    def _copy_log_to_clipboard(self):
        try:
            content = self.textbox.get("1.0", "end-1c")
            self.clipboard_clear()
            self.clipboard_append(content)
            self.status_label.configure(text="Copied to clipboard!", text_color="#34d399")
            self.after(2500, lambda: self.status_label.configure(text="Ready", text_color=("#475569", "#94a3b8")))
        except Exception as exc:
            print(f"[COPY ERROR] {exc}")

    def _load_existing_logs(self, strategy: str):
        try:
            short_logs = sorted(Path(".").glob(f"short.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if short_logs:
                self.short_log_content = short_logs[-1].read_text(encoding="utf-8")
            long_logs = sorted(Path(".").glob(f"long.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if long_logs:
                self.long_log_content = long_logs[-1].read_text(encoding="utf-8")
        except Exception:
            pass

    def _refresh_strategies(self):
        strats = get_strategies_from_folder()
        self.strat_menu.configure(values=strats)
        cur = self.strat_menu.get()
        if cur not in strats:
            self.strat_menu.set(strats[0])
            self._on_strategy_change(strats[0])

    def _on_strategy_change(self, strategy: str):
        cfg = self.tester._get_strategy_config(strategy)
        pairs = ", ".join(cfg.get("pairs", []))
        timeframes = ", ".join(cfg.get("TT", []))
        mop = ", ".join(str(x) for x in cfg.get("MOP", []))
        self.info_label.configure(
            text=f"Strategy: {strategy} | Timeframes: [{timeframes}] | Max Open Trades: [{mop}] | Pairs: {pairs}"
        )
        self._load_existing_logs(strategy)

    def _on_log_mode_change(self, mode: str):
        self.textbox.delete("1.0", "end")
        if mode == "Short Summary (Table)":
            if self.short_log_content:
                self.textbox.insert("end", self.short_log_content)
            else:
                self.textbox.insert("end", "[INFO] No short log result yet. Run a backtest first.\\n")
        elif mode == "Detailed Long Log":
            if self.long_log_content:
                self.textbox.insert("end", self.long_log_content)
            else:
                self.textbox.insert("end", "[INFO] No long log result yet. Run a backtest first.\\n")
        else:
            self.textbox.insert("end", self.raw_console_content)

    def _set_ui_state(self, enabled: bool):
        state = "normal" if enabled else "disabled"
        self.run_btn.configure(state=state)
        self.strat_menu.configure(state=state)
        self.refresh_btn.configure(state=state)
        self.tr_menu.configure(state=state)
        self.download_cb.configure(state=state)
        self.plot_btn.configure(state=state)
        self.open_logs_btn.configure(state=state)
        self.mode_toggle.configure(state=state)
        self.theme_menu.configure(state=state)
        self.font_family_menu.configure(state=state)
        self.font_size_menu.configure(state=state)
        self.copy_btn.configure(state=state)

    def _start_run_thread(self):
        strategy = self.strat_menu.get()
        selected_tr_label = self.tr_menu.get()
        timerange = next(tr for lbl, tr in self.timeranges if lbl == selected_tr_label)
        download = self.download_var.get()

        self._set_ui_state(False)
        self.status_label.configure(text=f"Running {strategy}...", text_color="#fbbf24")

        start_msg = (
            f"\\n=======================================================\\n"
            f"[START] Running backtests for {strategy} on {timerange}\\n"
            f"=======================================================\\n"
        )
        self.raw_console_content += start_msg
        self.log_mode_segmented.set("Docker Console")
        self.textbox.delete("1.0", "end")
        self.textbox.insert("end", self.raw_console_content)

        thread = threading.Thread(
            target=self._run_task,
            args=(strategy, timerange, download),
            daemon=True,
        )
        thread.start()

    def _run_task(self, strategy: str, timerange: str, download: bool):
        try:
            self.tester.timerange = timerange
            results = self.tester.runtest(strategy, download=download, test=True)

            short_logs = sorted(Path(".").glob(f"short.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if short_logs:
                self.short_log_content = short_logs[-1].read_text(encoding="utf-8")

            long_logs = sorted(Path(".").glob(f"long.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if long_logs:
                self.long_log_content = long_logs[-1].read_text(encoding="utf-8")

            done_msg = f"\\n[SUCCESS] Completed {strategy} test run!\\n"
            self.raw_console_content += done_msg

            self.log_mode_segmented.set("Short Summary (Table)")
            self.textbox.delete("1.0", "end")
            self.textbox.insert("end", self.short_log_content or self.raw_console_content)

            self.status_label.configure(text="Finished Successfully", text_color="#34d399")
            Tonification("Freqtrade Backtest", f"Completed {strategy} test!", 3000, master=self)

        except Exception as exc:
            err_msg = f"\\n[ERROR] {exc}\\n"
            self.raw_console_content += err_msg
            self.textbox.insert("end", err_msg)
            self.status_label.configure(text="Failed with errors", text_color="#f87171")
        finally:
            self._set_ui_state(True)

    def _plot_current(self):
        try:
            strategy = self.strat_menu.get()
            self.tester.current_strategy = strategy
            self.tester.current_config_file = f"user_data/{strategy}_test_config.json"
            self.tester.plot_data()
        except Exception as exc:
            self.textbox.insert("end", f"\\n[PLOT ERROR] {exc}\\n")

    def _open_logs_folder(self):
        try:
            folder_path = os.path.abspath(".")
            if sys.platform == "win32":
                os.startfile(folder_path)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", folder_path])
            else:
                subprocess.Popen(["xdg-open", folder_path])
        except Exception as exc:
            self.textbox.insert("end", f"\\n[FOLDER ERROR] {exc}\\n")


if __name__ == "__main__":
    app = FreqtradeGuiRunner()
    app.mainloop()
`,
  },
];

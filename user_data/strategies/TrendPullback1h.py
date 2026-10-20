import logging
from pandas import DataFrame
import talib.abstract as ta
import numpy as np
import pandas as pd
from freqtrade.strategy import IStrategy, DecimalParameter, IntParameter

logger = logging.getLogger(__name__)


class TrendPullback1h(IStrategy):
    """
    TrendPullback1h Strategy (Archetype A: Trend-Following Pullbacks)
    ---------------------------------------------------------------
    Engineered specifically to solve the low-trade-frequency problem while
    maintaining high statistical edge in crypto:
    - Timeframe: 1h (Agile swing trades without 15m intraday noise)
    - Target: Full 11-pair crypto basket (~350-450 trades/year, ~1 trade/day)
    - Macro Regime: Bull market confirmation (Price > EMA200 & EMA50 > EMA200)
    - Anti-Chop: ADX >= 20 ensures market is trending, not flat
    - Value Retest: Buy on pullback to EMA20 / EMA50 dynamic support
    - Timing Trigger: StochRSI bullish cross (%K > %D) from oversold (< 25)
    - Dynamic Exit: Price closes below EMA20 with momentum confirmation
    - Emergency Stoploss: -7.5% catastrophic protection
    """

    INTERFACE_VERSION: int = 3
    can_short: bool = False

    timeframe = "1h"
    startup_candle_count = 250
    process_only_new_candles = True

    # Emergency catastrophic hard stoploss (-7.5%)
    # Dynamic trend exits are handled by populate_exit_trend
    stoploss = -0.075

    # Letting winners run: high ROI targets so runners aren't choked,
    # with parabolic blowout caps on extreme pumps
    minimal_roi = {
        "0": 0.28,       # Instant profit on parabolic pumps (+28%)
        "720": 0.16,     # +16% after 12 hours (12 candles on 1h)
        "1440": 0.10,    # +10% after 24 hours
        "4320": 0.05,    # +5% after 3 days
    }

    trailing_stop = False
    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False

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

    # Hyperoptable parameters for precision tuning
    buy_stoch_oversold = IntParameter(15, 32, default=25, space="buy")
    buy_adx_min = IntParameter(16, 26, default=20, space="buy")
    buy_ema20_dist = DecimalParameter(1.005, 1.025, default=1.015, decimals=3, space="buy")

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 1. Exponential Moving Averages (Trend & Support Framework)
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)

        # 2. Volatility & Trend Strength (Anti-Chop)
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)

        # 3. Standard RSI
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)

        # 4. Stochastic RSI (14, 14, 3, 3) - Robust & Crash-Proof
        rsi_series = dataframe["rsi"]
        rsi_min = rsi_series.rolling(window=14).min()
        rsi_max = rsi_series.rolling(window=14).max()
        stoch_rsi = np.where(
            (rsi_max - rsi_min) != 0,
            (rsi_series - rsi_min) / (rsi_max - rsi_min) * 100.0,
            50.0,
        )
        dataframe["stoch_rsi_k"] = pd.Series(stoch_rsi, index=dataframe.index).rolling(window=3).mean()
        dataframe["stoch_rsi_d"] = dataframe["stoch_rsi_k"].rolling(window=3).mean()

        # Previous candle values for crossover detection
        dataframe["stoch_k_prev"] = dataframe["stoch_rsi_k"].shift(1)
        dataframe["stoch_d_prev"] = dataframe["stoch_rsi_d"].shift(1)

        # 5. Volume Moving Average
        dataframe["volume_mean_20"] = dataframe["volume"].rolling(window=20).mean()

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                # Pillar 1: Macro Bull Regime Confirmation
                (dataframe["close"] > dataframe["ema200"]) &
                (dataframe["ema50"] > dataframe["ema200"]) &

                # Pillar 2: Anti-Chop Gate (Market is moving, not dead)
                (dataframe["adx"] >= self.buy_adx_min.value) &

                # Pillar 3: Pullback to Value Zone (Not chasing at the peak)
                (dataframe["close"] <= dataframe["ema20"] * self.buy_ema20_dist.value) &
                (dataframe["close"] >= dataframe["ema50"] * 0.980) &

                # Pillar 4: Timing Trigger - StochRSI Bullish Cross from Oversold Zone
                (
                    (dataframe["stoch_rsi_k"] > dataframe["stoch_rsi_d"]) &
                    (dataframe["stoch_k_prev"] <= dataframe["stoch_d_prev"]) &
                    (dataframe["stoch_rsi_k"] <= self.buy_stoch_oversold.value + 10) &
                    (dataframe["stoch_k_prev"] <= self.buy_stoch_oversold.value)
                ) &

                # Valid trade volume
                (dataframe["volume"] > 0)
            ),
            "enter_long",
        ] = 1

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                # Dynamic EMA20 Trailing Exit with Momentum Confirmation
                # When price loses the 20 EMA and StochRSI momentum flips down
                (
                    (dataframe["close"] < dataframe["ema20"]) &
                    (dataframe["stoch_rsi_k"] < dataframe["stoch_rsi_d"])
                ) |
                # Catastrophic structural trend break (loss of 50 EMA)
                (dataframe["close"] < dataframe["ema50"] * 0.985)
            ) &
            (dataframe["volume"] > 0),
            "exit_long",
        ] = 1

        return dataframe

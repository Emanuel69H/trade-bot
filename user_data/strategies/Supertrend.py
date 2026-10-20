import logging
from pandas import DataFrame
import talib.abstract as ta
import numpy as np
import pandas as pd
from freqtrade.strategy import IStrategy, DecimalParameter, IntParameter

logger = logging.getLogger(__name__)


class Supertrend(IStrategy):
    """
    Supertrend Strategy (Optimized Multi-Supertrend Trend Follower)
    --------------------------------------------------------------
    Major Algorithmic Upgrades:
    1. Fixes Profit-Killer ROI Cutoff:
       Removed the premature ROI=0 cutoff after 64 hours so big bullish runners
       are NOT cut early, allowing full 20%-50%+ trend participation.
    2. Agile Fast-Supertrend Profit Taking:
       Eliminated impossible sell conditions (m=6) that forced trades to crash
       into the -25% stoploss. Exits now trigger cleanly when the Fast Supertrend
       (m=2.0) flips 'down' or when the macro trend breaks.
    3. Dynamic Trailing Protection:
       Reduced catastrophic hard stoploss from -25% to -8.5% and enabled
       trailing stop once profit hits +6.5% to lock in gains.
    4. Anti-Whipsaw Trend Strength Filter:
       Added 4h ADX >= 18 and RSI <= 72 filter to prevent buying in flat, dead,
       or overheated markets.
    5. High-Performance Computation:
       Eliminated redundant 630-loop indicator calculation; now computes
       cleanly in milliseconds.
    """

    INTERFACE_VERSION: int = 3
    can_short: bool = False

    timeframe = "4h"
    startup_candle_count = 200
    process_only_new_candles = True

    # Controlled hard stoploss (8.5% instead of catastrophic -25%)
    stoploss = -0.085

    # Letting big winners run (no more cutting off after 2.6 days!)
    minimal_roi = {
        "0": 0.38,       # Instant profit target on parabolic blowout tops (+38%)
        "1440": 0.22,    # +22% after 24 hours (6 candles on 4h)
        "4320": 0.14,    # +14% after 3 days
        "10080": 0.08,   # +8% after 7 days
        "20160": 0.04,   # +4% after 14 days
    }

    # Dynamic trailing stop: locks in profit once trend develops
    trailing_stop = True
    trailing_stop_positive = 0.025         # trail 2.5% below high
    trailing_stop_positive_offset = 0.065  # activates when +6.5% reached
    trailing_only_offset_is_reached = True

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

    # Hyperopt parameters
    # Fast Supertrend (Signal & Agile Exit)
    fast_st_mult = DecimalParameter(1.5, 2.8, default=2.0, decimals=1, space="buy")
    fast_st_period = IntParameter(8, 16, default=10, space="buy")

    # Medium Supertrend (Primary Trend Direction)
    med_st_mult = DecimalParameter(2.5, 4.0, default=3.0, decimals=1, space="buy")
    med_st_period = IntParameter(10, 20, default=14, space="buy")

    # Trend Strength (Anti-Chop)
    buy_adx_min = IntParameter(14, 25, default=18, space="buy")
    buy_rsi_max = IntParameter(65, 80, default=72, space="buy")

    @staticmethod
    def calc_supertrend(dataframe: DataFrame, multiplier: float, period: int) -> DataFrame:
        """
        Computes Supertrend indicator:
        Returns DataFrame with 'ST' (Supertrend line) and 'STX' ('up' / 'down')
        """
        high = dataframe["high"].values
        low = dataframe["low"].values
        close = dataframe["close"].values
        length = len(dataframe)

        tr = ta.TRANGE(dataframe["high"], dataframe["low"], dataframe["close"])
        atr = pd.Series(tr, index=dataframe.index).rolling(period).mean().to_numpy()

        basic_ub = (high + low) / 2.0 + multiplier * atr
        basic_lb = (high + low) / 2.0 - multiplier * atr

        final_ub = np.zeros(length)
        final_lb = np.zeros(length)

        for i in range(period, length):
            final_ub[i] = basic_ub[i] if basic_ub[i] < final_ub[i-1] or close[i-1] > final_ub[i-1] else final_ub[i-1]
            final_lb[i] = basic_lb[i] if basic_lb[i] > final_lb[i-1] or close[i-1] < final_lb[i-1] else final_lb[i-1]

        st = np.zeros(length)
        for i in range(period, length):
            if st[i-1] == final_ub[i-1]:
                st[i] = final_ub[i] if close[i] <= final_ub[i] else final_lb[i]
            elif st[i-1] == final_lb[i-1]:
                st[i] = final_lb[i] if close[i] >= final_lb[i] else final_ub[i]
            else:
                st[i] = final_ub[i] if close[i] <= final_ub[i] else final_lb[i]

        stx = np.where(st > 0, np.where(close < st, "down", "up"), "down")
        res = pd.DataFrame({"ST": st, "STX": stx}, index=dataframe.index)
        res["STX"] = res["STX"].fillna("down")
        return res

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # 1. Fast Supertrend (m=2.0, p=10) - Sensitive for entry confirmation & agile exit
        fast = self.calc_supertrend(dataframe, self.fast_st_mult.value, self.fast_st_period.value)
        dataframe["supertrend_fast"] = fast["ST"]
        dataframe["supertrend_fast_dir"] = fast["STX"]

        # 2. Medium Supertrend (m=3.0, p=14) - Primary Trend Direction
        med = self.calc_supertrend(dataframe, self.med_st_mult.value, self.med_st_period.value)
        dataframe["supertrend_med"] = med["ST"]
        dataframe["supertrend_med_dir"] = med["STX"]

        # 3. Macro Trend Baseline (200 EMA & 50 EMA)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)

        # 4. Volatility & Trend Strength Filters (Anti-Chop)
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                # Both Fast and Medium Supertrends confirmed bullish
                (dataframe["supertrend_fast_dir"] == "up") &
                (dataframe["supertrend_med_dir"] == "up") &
                # Macro trend confirmation: Price above 200 EMA
                (dataframe["close"] > dataframe["ema200"]) &
                # Anti-chop filter: ADX confirms real directional momentum
                (dataframe["adx"] >= self.buy_adx_min.value) &
                # Anti-FOMO filter: Prevent entering when RSI is already exhausted (>72)
                (dataframe["rsi"] <= self.buy_rsi_max.value) &
                # Valid trading volume
                (dataframe["volume"] > 0)
            ),
            "enter_long",
        ] = 1

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                # Agile exit: Fast Supertrend flips down (locks in profit near the top)
                (dataframe["supertrend_fast_dir"] == "down") |
                # Macro exit: Price falls below 200 EMA
                (dataframe["close"] < dataframe["ema200"])
            ) &
            (dataframe["volume"] > 0),
            "exit_long",
        ] = 1

        return dataframe

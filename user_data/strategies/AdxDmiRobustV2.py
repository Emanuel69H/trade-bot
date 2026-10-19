from freqtrade.strategy import IStrategy, DecimalParameter, IntParameter
from pandas import DataFrame
import talib.abstract as ta


class AdxDmiRobustV2(IStrategy):
    """
    AdxDmiRobustV2 Strategy
    ----------------------
    Fixes the failure modes of AdxDmiOnlyStrategy:
    1. Replaces breakout chasing at peak high with pullback-to-EMA value entry.
    2. Replaces static 3% noise stoploss with dynamic ATR stoploss via custom_stoploss.
    3. Removes the premature ADX-falling exit that sold at pullback bottoms.
    4. Prevents long entries in macro bear markets (Close must be > EMA200).
    """
    INTERFACE_VERSION = 3
    can_short = False

    timeframe = "1h"
    startup_candle_count = 100
    process_only_new_candles = True

    # Emergency catastrophic stoploss (-8%); dynamic stoploss managed via custom_stoploss()
    stoploss = -0.08
    use_custom_stoploss = True

    minimal_roi = {
        "0": 0.25,
        "720": 0.15,
        "1440": 0.08,
        "2880": 0.04,
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

        # Exponential Moving Averages
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)

        # Distance from 20 EMA
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
                (dataframe["close"] > dataframe["ema200"])
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
        """
        if current_profit > self.trailing_activation_profit.value:
            return -self.trailing_delta.value

        try:
            dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            if len(dataframe) > 0:
                last_candle = dataframe.iloc[-1]
                atr = last_candle.get("atr", None)
                if atr and current_rate > 0:
                    atr_dist_pct = (atr * float(self.atr_stop_mult.value)) / current_rate
                    return -max(0.04, min(0.075, atr_dist_pct))
        except Exception:
            pass

        return -0.05

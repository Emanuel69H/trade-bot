from pandas import DataFrame
import talib.abstract as ta
from freqtrade.strategy import IStrategy


class AdxDmiOnlyStrategy(IStrategy):
    INTERFACE_VERSION = 3
    can_short = False

    timeframe = "1h"
    startup_candle_count = 100
    process_only_new_candles = True

    minimal_roi = {
        "0": 0.15,
        "360": 0.08,
        "1440": 0.03,
        "2880": 0.0,
    }
    adx_trend_threshold = 27
    adx_exhaustion_threshold = 38
    dmi_gap_threshold = 3

    stoploss = -0.03
    
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

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        di_len = 14
        adx_len = 14

        dataframe["adx"] = ta.ADX(dataframe, timeperiod=adx_len)
        dataframe["plus_di"] = ta.PLUS_DI(dataframe, timeperiod=di_len)
        dataframe["minus_di"] = ta.MINUS_DI(dataframe, timeperiod=di_len)

        dataframe["dmi_gap"] = dataframe["plus_di"] - dataframe["minus_di"]

        # Trend strengthening / weakening
        dataframe["adx_rising_1"] = dataframe["adx"] > dataframe["adx"].shift(1)
        dataframe["adx_rising_2"] = (
            (dataframe["adx"] > dataframe["adx"].shift(1)) &
            (dataframe["adx"].shift(1) > dataframe["adx"].shift(2))
        )

        dataframe["adx_falling_2"] = (
            (dataframe["adx"] < dataframe["adx"].shift(1)) &
            (dataframe["adx"].shift(1) < dataframe["adx"].shift(2))
        )

        # Bull trend state
        dataframe["bull_trend"] = (
            (dataframe["adx"] > self.adx_trend_threshold) &
            (dataframe["plus_di"] > dataframe["minus_di"]) &
            (dataframe["dmi_gap"] > self.dmi_gap_threshold)
        )

        # Breakout confirmation:
        # current close breaks previous candle high
        # previous close did NOT already break its previous high
        dataframe["bull_breakout"] = (
            (dataframe["close"] > dataframe["high"].shift(1)) &
            (dataframe["close"].shift(1) <= dataframe["high"].shift(2))
        )

        dataframe["trend_exhausted"] = dataframe["adx"] >= self.adx_exhaustion_threshold

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                dataframe["bull_trend"] &
                dataframe["adx_rising_2"] &
                (dataframe["plus_di"] > dataframe["plus_di"].shift(1)) &
                dataframe["bull_breakout"] &
                (~dataframe["trend_exhausted"])
            ),
            ["enter_long", "enter_tag"]
        ] = (1, "adx_dmi_breakout_long")

        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                (
                    # bearish takeover
                    (
                        (dataframe["minus_di"] > dataframe["plus_di"]) &
                        (dataframe["minus_di"] > dataframe["minus_di"].shift(1))
                    )
                    |
                    # trend weakening after getting stretched
                    (
                        (dataframe["adx"] > 25) &
                        dataframe["adx_falling_2"]
                    )
                    |
                    # no more valid bullish trend
                    (
                        (dataframe["adx"] < self.adx_trend_threshold) &
                        (dataframe["minus_di"] > dataframe["plus_di"])
                    )
                )
            ),
            "exit_long"
        ] = 1

        return dataframe

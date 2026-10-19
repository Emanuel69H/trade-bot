from freqtrade.strategy import IStrategy, merge_informative_pair
from pandas import DataFrame
import talib.abstract as ta


class RegimeAdaptiveMaster(IStrategy):
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

        dataframe = merge_informative_pair(
            dataframe,
            informative_4h,
            self.timeframe,
            self.informative_timeframe,
            ffill=True
        )

        dataframe["macro_bull"] = (
            (dataframe[f"close_{self.informative_timeframe}"] > dataframe[f"ema200_{self.informative_timeframe}"]) &
            (dataframe[f"plus_di_{self.informative_timeframe}"] > dataframe[f"minus_di_{self.informative_timeframe}"])
        )

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                dataframe["macro_bull"] &
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
                    (
                        (dataframe["close"] < dataframe["ema50"]) &
                        (dataframe["minus_di"] > dataframe["plus_di"]) &
                        (dataframe["adx"] < 22)
                    )
                    |
                    (~dataframe["macro_bull"])
                )
            ),
            "exit_long"
        ] = 1

        return dataframe

    def custom_stoploss(self, pair: str, trade, current_time, current_rate: float, current_profit: float, **kwargs) -> float:
        if current_profit > 0.04:
            return -0.015
        return -0.055

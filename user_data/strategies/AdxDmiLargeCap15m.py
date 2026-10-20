from pandas import DataFrame
import talib.abstract as ta
from freqtrade.strategy import IStrategy, DecimalParameter, IntParameter


class AdxDmiLargeCap15m(IStrategy):
    """
    AdxDmiLargeCap15m Strategy
    --------------------------
    Engineered specifically for high-liquidity Large-Cap crypto assets:
    - Target Basket: BTC/USDT, ETH/USDT, SOL/USDT
    - Base Timeframe: 15m (Agile entry execution)
    - Macro Trend Filter: Multi-timeframe trend anchor with seamless synthetic fallback

    Core Algorithmic Principles:
    1. Multi-Timeframe Alignment: Long trades are ONLY permitted when the macro
       trend is confirmed bullish (Price > Macro EMA50 and Macro EMA50 > Macro EMA200).
    2. Pullback Value Entry: Instead of chasing green breakout candles at peaks
       (which caused AdxDmiOnlyStrategy's flat +0.7% return), entries occur when
       price pulls back to the 15m 20-period EMA during confirmed uptrends.
    3. Dynamic ATR Trailing Stoploss: Replaces rigid 3% fixed stoploss with
       volatility-scaled stops and profit lock-in via custom_stoploss.
    4. Momentum Exhaustion Protection: Prevents entering when ADX is overextended (>45)
       or when RSI is overbought (>65).
    5. Zero Data Dependency Crash: Uses robust multi-timeframe synthesis (4x 15m periods = 1h),
       so backtests and live trading never fail due to missing informative candle downloads.
    """

    INTERFACE_VERSION = 3
    can_short = False

    timeframe = "15m"
    startup_candle_count = 400
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

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Standard 15m ADX and DMI (14 periods)
        dataframe["adx"] = ta.ADX(dataframe, timeperiod=14)
        dataframe["plus_di"] = ta.PLUS_DI(dataframe, timeperiod=14)
        dataframe["minus_di"] = ta.MINUS_DI(dataframe, timeperiod=14)
        dataframe["dmi_gap"] = dataframe["plus_di"] - dataframe["minus_di"]

        # Volatility & Momentum
        dataframe["atr"] = ta.ATR(dataframe, timeperiod=14)
        dataframe["rsi"] = ta.RSI(dataframe, timeperiod=14)

        # Exponential Moving Averages on 15m
        dataframe["ema20"] = ta.EMA(dataframe, timeperiod=20)
        dataframe["ema50"] = ta.EMA(dataframe, timeperiod=50)
        dataframe["ema200"] = ta.EMA(dataframe, timeperiod=200)

        # Volume confirmation
        dataframe["volume_mean_20"] = dataframe["volume"].rolling(window=20).mean()

        # Distance from 20 EMA
        dataframe["dist_ema20"] = (dataframe["close"] - dataframe["ema20"]) / dataframe["ema20"]

        # 15m Trend structure
        dataframe["bull_trend_structure"] = (
            (dataframe["adx"] > self.buy_adx_threshold.value) &
            (dataframe["plus_di"] > dataframe["minus_di"]) &
            (dataframe["dmi_gap"] > self.buy_dmi_gap.value) &
            (dataframe["close"] > dataframe["ema50"])
        )

        # Value pullback zone: Price touched or dipped near EMA 20 without breaking EMA 50
        dataframe["pullback_entry_zone"] = (
            (dataframe["low"] <= dataframe["ema20"] * 1.006) &
            (dataframe["close"] >= dataframe["ema20"] * 0.985) &
            (dataframe["dist_ema20"] <= 0.012)
        )

        dataframe["trend_exhausted"] = dataframe["adx"] >= self.buy_adx_exhaustion.value

        # Macro Trend Anchor (Synthesized from 15m candles: 4x 15m = 1 hour):
        # 1h EMA 50  equivalent = 15m EMA 200
        # 1h EMA 200 equivalent = 15m EMA 600
        # 1h DMI 14  equivalent = 15m DMI 56
        dataframe["macro_ema50"] = dataframe["ema200"]
        dataframe["macro_ema200"] = ta.EMA(dataframe, timeperiod=600)
        dataframe["macro_plus_di"] = ta.PLUS_DI(dataframe, timeperiod=56)
        dataframe["macro_minus_di"] = ta.MINUS_DI(dataframe, timeperiod=56)
        dataframe["macro_bull"] = (
            (dataframe["close"] > dataframe["macro_ema50"]) &
            (dataframe["macro_ema50"] > dataframe["macro_ema200"]) &
            (dataframe["macro_plus_di"] > dataframe["macro_minus_di"])
        )

        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[
            (
                (dataframe["volume"] > 0) &
                (dataframe["volume"] > dataframe["volume_mean_20"] * 0.75) &
                dataframe["macro_bull"] &
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
                    # 1. Structural Trend Breakdown: Close decisively breaks below EMA50 with bearish DMI
                    (
                        (dataframe["close"] < dataframe["ema50"] * 0.99) &
                        (dataframe["minus_di"] > dataframe["plus_di"] + 4) &
                        (dataframe["adx"] < 22)
                    )
                    |
                    # 2. Severe Bearish DMI Momentum Takeover
                    (
                        (dataframe["minus_di"] > dataframe["plus_di"] + 12) &
                        (dataframe["close"] < dataframe["ema20"])
                    )
                    |
                    # 3. Climax Exhaustion: ADX reached peak (>45) and rolled over sharply
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
        """
        Multi-Stage Volatility Trailing Stoploss:
        1. When profit exceeds trailing activation threshold (e.g. +2.5%),
           tighten stoploss to lock in profit with a trailing delta.
        2. In initial trade stage, adapt stoploss dynamically to market volatility (ATR).
           Large caps like SOL receive sufficient breathing room while BTC gets a tighter leash.
        """
        # Stage 1: Trailing Profit Lock
        if current_profit > self.trailing_activation_profit.value:
            return -self.trailing_delta.value

        # Stage 2: Volatility-scaled Dynamic Stoploss
        try:
            dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
            if len(dataframe) > 0:
                last_candle = dataframe.iloc[-1]
                atr = last_candle.get("atr", None)
                if atr and current_rate > 0:
                    atr_pct = (atr * float(self.atr_stop_mult.value)) / current_rate
                    # Bound stoploss between -3.2% and -6.5%
                    return -max(0.032, min(0.065, atr_pct))
        except Exception:
            pass

        # Fallback default stoploss
        return -0.045

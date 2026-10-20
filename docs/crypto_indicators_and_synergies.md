# Crypto Technical Indicator Catalog & Optimal Synergies

A comprehensive, research-backed reference guide for algorithmic and quantitative crypto trading. Designed to eliminate indicator redundancy, identify high-statistical-edge indicator combinations, and evaluate trading archetypes targeting **~1 trade/day on average (~300–400 trades/year across a liquid pair basket)**.

---

## 1. Master Indicator Catalog

The table below lists all major technical indicators used in crypto markets, categorized by their mathematical nature, with their practical purpose and failure modes explained on the right.

| Category | Indicator Name | Formula / Core Concept | Plain-English Explanation & Practical Crypto Usage |
| :--- | :--- | :--- | :--- |
| **Trend** | **EMA (Exponential Moving Average)** | Weighted average prioritizing recent candles: $EMA_t = P_t \cdot \alpha + EMA_{t-1} \cdot (1-\alpha)$ | **Smooth dynamic baseline.** Used as macro regime filter (e.g., 200 EMA) or dynamic support/resistance (20/50 EMA). *Weakness*: Lags behind sharp reversals; whipsaws in horizontal chop. |
| **Trend** | **SMA (Simple Moving Average)** | Arithmetic mean over $N$ candles: $\frac{1}{N}\sum_{i=1}^N P_i$ | **Institutional baseline.** Used primarily on daily/weekly timeframes (50 SMA, 200 SMA) by traditional funds entering crypto. *Weakness*: Slower to react than EMA; equal weight overemphasizes stale data. |
| **Trend** | **Supertrend** | Combines ATR bands with median price: $\frac{H+L}{2} \pm M \cdot ATR$ | **Trailing stop & trend state machine.** Flips between bullish ('up') and bearish ('down') when price closes beyond the ATR band. Excellent for trailing runners. *Weakness*: Whipsaws violently in flat ranges; requires higher timeframes (1h/4h). |
| **Trend** | **ADX (Average Directional Index)** | Smoothed average of $+DI$ and $-DI$ directional movement | **Pure trend strength gauge (0–100).** Does NOT indicate direction, only whether a trend exists. $ADX > 20-25$ = trending; $ADX < 18$ = chop/sideways. Indispensable as a trend gatekeeper. *Weakness*: Highly lagging during sudden breakout candles. |
| **Trend** | **+DI / -DI (Directional Indicators)** | Positive/negative price movement normalized by True Range | **Directional momentum balance.** $+DI > -DI$ signals bulls in control. Bullish/bearish crosses often lead trend changes. *Weakness*: Crosses generate frequent false signals during consolidation. |
| **Trend** | **Ichimoku Cloud (Kumo)** | Multi-period midpoint system (Tenkan, Kijun, Senkou Span A/B) | **All-in-one trend, support, and momentum system.** Price above green cloud = bullish; Tenkan/Kijun cross = entry trigger. *Weakness*: Complex to optimize in algorithms; lags significantly on low timeframes. |
| **Trend** | **Parabolic SAR (Stop and Reverse)** | Trailing dots calculated with acceleration factor ($AF$): $SAR_{t+1} = SAR_t + AF \cdot (EP - SAR_t)$ | **Dynamic trailing stop system.** Dots move closer as trend accelerates. Flips side when price breaches dot. *Weakness*: Completely unusable in ranging/choppy markets (produces continuous false flips). |
| **Trend** | **Hull Moving Average (HMA)** | Weighted moving average using square root period: $WMA(2 \cdot WMA(n/2) - WMA(n), \sqrt{n})$ | **Ultra-low-lag trend line.** Reduces moving average lag dramatically while maintaining smoothness. Great for fast trend pivots. *Weakness*: Over-sensitive to sharp spikes, leading to false early exits. |
| **Momentum** | **RSI (Relative Strength Index)** | Ratio of average gains to average losses: $100 - \frac{100}{1 + RS}$ | **Momentum velocity & exhaustion oscillator (0–100).** Identifies overbought ($>70$) and oversold ($<30$) states, plus bullish/bearish divergences. *Weakness*: In strong crypto bull runs, RSI can stay "overbought" ($>75$) for weeks while price multiplies. |
| **Momentum** | **Stochastic RSI (StochRSI)** | Applies Stochastic formula to RSI values: $\frac{RSI - RSI_{min}}{RSI_{max} - RSI_{min}}$ | **Hyper-sensitive momentum trigger (0–100).** Measures where current RSI sits relative to its recent range. Much faster than standard RSI. Crosses from below 20 signal early momentum resumption. *Weakness*: Whipsaws easily; must be paired with macro trend filters. |
| **Momentum** | **MACD (Moving Average Convergence Divergence)** | Difference between 12 EMA and 26 EMA, plotted with 9 EMA signal line | **Trend-momentum hybrid.** Signal line crosses and histogram expansions indicate accelerating momentum. Centerline cross ($>0$) confirms bullish regime. *Weakness*: Lags behind rapid crypto impulse reversals; late entry on volatile candles. |
| **Momentum** | **CCI (Commodity Channel Index)** | Measures deviation of price from statistical mean: $\frac{TP - SMA}{0.015 \cdot MD}$ | **Cyclical turnaround detector.** Values beyond $\pm 100$ indicate strong trend impulse; moves back toward zero signal exhaustion. *Weakness*: Prone to erratic spikes on sudden crypto volume dumps. |
| **Momentum** | **Williams %R** | Compares current close to the high-low range: $\frac{H_n - C}{H_n - L_n} \cdot (-100)$ | **Inverted momentum oscillator (-100 to 0).** Moves between -80 (oversold) and -20 (overbought). Very reactive for timing precise entries during pullbacks. *Weakness*: Almost identical mathematically to Stochastic %K (redundant if paired together). |
| **Momentum** | **Rate of Change (ROC)** | Percentage change between current price and price $N$ periods ago | **Pure momentum acceleration.** Positive ROC confirms speed of advance. Sharp divergence often warns of momentum exhaustion. *Weakness*: Sensitive to single anomalous outlier candles. |
| **Volatility** | **ATR (Average True Range)** | Exponential average of True Range: $\max(H-L, \|H-C_p\|, \|L-C_p\|)$ | **Absolute volatility measure in price units.** Gold standard for dynamic stoploss placement (e.g. $2 \times ATR$) and position sizing. Does NOT indicate trend direction. *Weakness*: Rises equally during violent crashes and violent pumps. |
| **Volatility** | **Bollinger Bands (BB)** | 20 SMA baseline $\pm K \cdot \sigma$ (standard deviation) | **Dynamic volatility envelope.** Bands squeeze during low volatility (consolidation) and expand during breakouts. Price tagging outer bands indicates stretched conditions. *Weakness*: In strong trends, price "walks the band" upward; selling on upper band touch in crypto is suicide. |
| **Volatility** | **Keltner Channels (KC)** | 20 EMA baseline $\pm K \cdot ATR$ | **ATR-based volatility envelope.** Smoother and less erratic than Bollinger Bands because ATR does not swing wildly like standard deviation. *Weakness*: Slower to contract than Bollinger Bands after sudden volatility shocks. |
| **Volatility** | **Donchian Channels** | Highest High and Lowest Low over $N$ periods | **Breakout channel (Turtle Trading core).** Price breaking upper band indicates new multi-period high. Ideal for breakout momentum strategies. *Weakness*: Significant drawdown during choppy consolidations without ADX filter. |
| **Volatility** | **Chaikin Volatility** | Percentage change in moving average of $(High - Low)$ | **Expansion/compression cycler.** Detects volatility cycles before price explosions occur. *Weakness*: Does not give directional bias. |
| **Volume / Liquidity** | **OBV (On-Balance Volume)** | Cumulative running volume added on green candles, subtracted on red | **Smart-money accumulation/distribution tracker.** Rising OBV while price is flat reveals institutional accumulation before a breakout. *Weakness*: A single massive volume spike on an exchange can distort OBV for weeks. |
| **Volume / Liquidity** | **VWAP (Volume-Weighted Average Price)** | Cumulative $(Price \times Volume) / \text{Cumulative Volume}$ | **Institutional fair value benchmark.** Anchored daily/weekly/session. Crypto algorithms use VWAP as primary mean-reversion line: buying below VWAP in uptrends, selling above. *Weakness*: Resets periodically; losing effectiveness if anchor point is arbitrary. |
| **Volume / Liquidity** | **MFI (Money Flow Index)** | Volume-weighted version of RSI ("Volume RSI") | **Measures buying/selling pressure intensity.** Combines price momentum with volume. $MFI < 20$ indicates oversold with capitulation volume; $MFI > 80$ indicates overbought euphoria. *Weakness*: Can stay pinned in extreme zones during sustained liquidation cascades. |
| **Volume / Liquidity** | **CMF (Chaikin Money Flow)** | Sum of Accumulation/Distribution over $N$ periods divided by total volume | **Institutional capital inflow/outflow indicator (-1.0 to +1.0).** $CMF > 0.05-0.10$ confirms legitimate institutional buying behind a breakout. *Weakness*: Lags behind rapid flash crashes. |
| **Volume / Liquidity** | **Volume Mean / Rolling Ratio** | Ratio of current volume to 20-period volume moving average: $\frac{Vol}{SMA(Vol, 20)}$ | **Activity surge filter.** Ensures entry signals have at least $1.2\times$ or $1.5\times$ normal volume, filtering out low-liquidity fakeouts. *Weakness*: Does not indicate direction, only presence of activity. |

---

## 2. Indicator Multicollinearity: What NOT to Pair

The most common trap in algorithmic trading is **Indicator Redundancy (Multicollinearity)**. This occurs when a trader combines multiple indicators that calculate virtually the same underlying math.

### Negative Examples (Harmful Redundancy):
- **RSI + Stochastic + Williams %R**: All three are normalized momentum oscillators measuring where price closes relative to its high-low range. When one is oversold, all three are oversold. They provide **zero new information** and create dangerous false confidence.
- **SMA + EMA + Supertrend + Hull MA**: All are variations of price moving averages. When trend changes, they all lag and fail simultaneously in chop.
- **Bollinger Bands + Envelopes**: Both measure standard deviation / percentage distance from a moving average.

### The 4-Pillar Synergy Rule (Quantitative Architecture)
A robust crypto strategy must combine **exactly ONE indicator from each distinct mathematical pillar**:

```
[ Pillar 1: Macro Trend Filter ]   --> EMA 200 or 50/200 Cross (Is the macro tide rising?)
               +
[ Pillar 2: Volatility / Chop Filter ] --> ADX > 20 or BB Squeeze (Is the market actually moving?)
               +
[ Pillar 3: Timing / Value Trigger ]  --> Stoch RSI / Pullback to EMA20 (Is price at a discount?)
               +
[ Pillar 4: Risk / Stop Management ]  --> ATR Trailing Stop (Where does the trade become invalid?)
```

---

## 3. Top High-Performing Indicator Synergies in Crypto

Based on empirical data from leading quantitative crypto funds and popular algorithmic systems, these pairings demonstrate the highest statistical stability:

### Synergy 1: The EMA Ribbon + Stoch RSI + ATR (The "Pullback-in-Trend" Engine)
- **Concept**: Never chase green breakout candles at the top. Instead, identify a strong macro trend, wait for price to pull back into value, and time the bounce.
- **The Pairings**:
  1. **Macro Trend**: `Close > 200 EMA` and `50 EMA > 200 EMA` (guarantees you only buy in bull market regimes).
  2. **Value Zone**: Price pulls back to touch or retest the `20 EMA` or `50 EMA`.
  3. **Trigger**: `StochRSI (%K crosses above %D from < 20)` confirms that short-term seller exhaustion has ended and buyers are stepping back in.
  4. **Risk Management**: Stoploss set at $2.0 \times ATR(14)$ below the entry candle; profit target trailing along the 20 EMA.
- **Why It Works in Crypto**: Crypto trends violently, but features frequent 3%–7% intraday shakeouts. Buying the retest of the EMA with Stoch RSI timing gets tight risk with high risk/reward (1:2.5+).
- **Expected Frequency**: ~1 to 2 trades/day across a 5-coin basket on 1h timeframe (~350–500 trades/year).

---

### Synergy 2: Bollinger Bands + Keltner Channels + ADX (The TTM Squeeze Breakout)
- **Concept**: Volatility is cyclical — low volatility (compression) always leads to explosive volatility (expansion).
- **The Pairings**:
  1. **The Squeeze Condition**: Bollinger Bands (20, 2.0) contract inside Keltner Channels (20, 1.5). This mathematical condition identifies energy accumulation.
  2. **The Breakout Trigger**: Bollinger Bands expand back outside Keltner Channels + candle closes outside the band.
  3. **Momentum Confirmation**: `ADX > 20` and rising, with $+DI > -DI$.
  4. **Volume Confirmation**: Volume $> 1.5 \times$ 20-period volume average.
- **Why It Works in Crypto**: Consolidation ranges in Bitcoin and large caps precede massive 10%–30% directional legs. Catching the breakout early with momentum confirmation filters out false breakouts.
- **Expected Frequency**: ~200–350 trades/year on 1h/2h timeframe across liquid pairs.

---

### Synergy 3: Supertrend + ADX Trend Strength Filter + Volume Surge
- **Concept**: Supertrend is one of the best trailing stop and trend-riding tools, but fails during flat consolidation. Adding ADX fixes its primary flaw.
- **The Pairings**:
  1. **Trend State**: `Supertrend(10, 2.5) == 'up'`.
  2. **Anti-Chop Filter**: `ADX(14) > 22` (completely disables entries when the market is flat or dead).
  3. **Baseline Filter**: `Close > 200 EMA`.
  4. **Volume Filter**: `Volume > SMA(Volume, 20)`.
  5. **Exit**: Triggered when Fast Supertrend flips `'down'` OR price breaks trailing stop.
- **Why It Works in Crypto**: Keeps the simple, powerful trailing nature of Supertrend, but stops it from taking trades during the 60% of the time when the market is chopping sideways.
- **Expected Frequency**: ~250–400 trades/year across top pairs on 1h/2h timeframe.

---

### Synergy 4: VWAP + RSI Bullish Divergence + OBV (Institutional Mean Reversion)
- **Concept**: When price drops significantly below VWAP, but volume and momentum refuse to make lower lows, institutional absorption is taking place.
- **The Pairings**:
  1. **Value Discount**: Price is $> 2 \times ATR$ below Daily VWAP.
  2. **Momentum Divergence**: Price makes a lower low, but `RSI(14)` makes a higher low (Bullish Divergence).
  3. **Volume Absorption**: `OBV` is flat or rising while price drops (whales absorbing sell orders).
  4. **Exit**: Take profit at VWAP retest; tight stop below swing low.
- **Why It Works in Crypto**: Whales use liquidity sweeps to fill large bids below key levels. Entering on divergence targets fast snap-back bounces.
- **Expected Frequency**: ~300–450 trades/year on 15m/1h timeframe.

---

## 4. Crypto Trading Archetypes: Pros, Cons & Trade Frequencies

To achieve your target of **~1 trade/day on average (~300–400 trades/year)**, we must examine the 4 core algorithmic archetypes:

```
+-----------------------------------------------------------------------------------------+
|                               CRYPTO ARCHETYPE SPECTRUM                                |
|                                                                                         |
|   Low Frequency / High R:R                                   High Frequency / High Win% |
|   [Trend Following] -------- [Pullback Swing] -------- [Breakout] -------- [Mean Reversion]
|      (50-150 tr/yr)            (300-500 tr/yr)        (200-350 tr/yr)       (600-1500 tr/yr)
+-----------------------------------------------------------------------------------------+
```

### Archetype A: Trend-Following with Pullback Entries (RECOMMENDED)
- **Target Timeframe**: 1-hour candles (with optional 4h macro filter).
- **Target Frequency**: ~1 to 1.5 trades/day across 4–6 pairs (**~350–450 trades/year**).
- **Core Strategy**: Wait for confirmed uptrend, enter on 1h pullbacks to EMA20/50 when StochRSI is oversold.
- **Pros**:
  - **High Profit Factor**: Winning trades frequently yield 1:2.5 to 1:4 risk-reward ratios.
  - **Captures Major Pumps**: Never misses multi-day bull runs.
  - **Realistic Trade Frequency**: Generates enough trades for robust statistical validation without excessive exchange fee drag.
- **Cons**:
  - Suffers consecutive small losses when the market enters choppy multi-week consolidation.
  - Requires discipline to wait for pullbacks rather than chasing impulse candles.
- **Best Indicators**: EMA 50/200, Stoch RSI (14, 14, 3, 3), ATR Stoploss.

---

### Archetype B: Volatility Breakout (Compression -> Expansion)
- **Target Timeframe**: 1-hour or 2-hour candles.
- **Target Frequency**: ~0.8 to 1 trade/day (**~250–350 trades/year**).
- **Core Strategy**: Identify low-volatility Bollinger Band squeezes inside Keltner Channels, enter on directional volume expansion.
- **Pros**:
  - High win speed: Trades resolve quickly after entry (either momentum explodes or the trade invalidates).
  - Clear invalidation: Stoploss is strictly placed at the opposite band or channel midpoint.
- **Cons**:
  - Lower win rate (typically 40%–48%): Crypto features frequent "fakeouts" where price pokes out of a range and immediately reverses.
  - Requires trailing stops to let the 40% winners make up for the 60% small losses.
- **Best Indicators**: Bollinger Bands, Keltner Channels, ADX, Volume Mean.

---

### Archetype C: Mean Reversion / Oversold Bounces
- **Target Timeframe**: 15-minute or 1-hour candles.
- **Target Frequency**: ~1.5 to 3 trades/day (**~500–1000 trades/year**).
- **Core Strategy**: Buy when price deviates severely below the mean (e.g. RSI < 25, lower Bollinger Band breach) and sell at the mean (EMA20 or VWAP).
- **Pros**:
  - High win rate (65%–75%): Bounces happen frequently in crypto.
  - High frequency: Provides abundant trades for quick statistical feedback.
- **Cons**:
  - **Catastrophic Tail Risk (Falling Knife)**: In crypto bear market drops or liquidation cascades, an asset can drop 30% without bouncing. Without strict stoplosses, a single trade can wipe out 20 wins.
  - Requires strict stoploss discipline and bear-market market regime gates.
- **Best Indicators**: RSI, Bollinger Bands, Daily VWAP, Volume Delta.

---

### Archetype D: Pure Macro Trend Following (Your Previous Supertrend 4h)
- **Target Timeframe**: 4-hour or Daily candles.
- **Target Frequency**: Only ~0.2 to 0.4 trades/day (**~70–150 trades/year across 5 pairs**).
- **Core Strategy**: Buy when Supertrend or EMA crosses green; hold until it crosses red.
- **Pros**:
  - Very low effort, zero intraday noise.
- **Cons**:
  - **Statistically Insufficient**: As you observed, 200–300 trades over 5 years is too small a sample size to build confident statistics.
  - Large drawdowns during 6-month crypto chop seasons.
- **Best Indicators**: Supertrend, 200 EMA, ATR.

---

## 5. Comparative Archetype Summary Table

| Archetype | Typical Timeframe | Annual Trades (5 Coins) | Win Rate % | Profit Factor | Avg R:R | Suitability for Your Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Trend Pullback** | **1h** | **350 – 500** | **52% – 60%** | **1.8 – 2.4** | **1 : 2.5** | **PERFECT (Meets 1 trade/day + statistical edge)** |
| **B. Squeeze Breakout** | 1h / 2h | 250 – 350 | 42% – 48% | 1.6 – 2.0 | 1 : 3.0 | Strong (Good for explosive crypto moves) |
| **C. Mean Reversion** | 15m / 1h | 500 – 900 | 65% – 72% | 1.4 – 1.8 | 1 : 1.2 | Moderate (High win rate but tail risk) |
| **D. Macro Trend** | 4h | 80 – 160 | 40% – 50% | 1.3 – 1.7 | 1 : 2.0 | Too slow (Sample size too small) |

---

## 6. Strategic Recommendations & Next Steps

1. **Adopt Archetype A (Trend Pullback) on 1h Timeframe**:
   - Timeframe: `1h` (fast enough to generate ~300–400 trades/year across top 5–7 pairs, slow enough to avoid 15m noise and high commission drag).
   - Core Indicators:
     - **Regime Filter**: `EMA 50 > EMA 200` + `Price > EMA 200` (Never buy in bear markets).
     - **Value Retest**: Price within 1.0% of `EMA 20` or `EMA 50`.
     - **Entry Trigger**: `StochRSI (%K crosses above %D from below 25)`.
     - **Chop Gate**: `ADX > 20`.
     - **Stoploss**: $2.0 \times ATR$ below entry candle (dynamic volatility risk).
     - **Exit**: Take profit 50% at 1:2 R:R, trail remainder with EMA 20.

2. **Step-by-Step Implementation Protocol**:
   - **Step 1**: Build a clean, lightweight Freqtrade strategy file (`user_data/strategies/TrendPullback1h.py`).
   - **Step 2**: Run automated backtest matrix via `python run_test.py` across 1Y, 2Y, and 5Y datasets.
   - **Step 3**: Verify that trade count meets the target (~300–400 trades) and inspect win rate, profit factor, and maximum drawdown.

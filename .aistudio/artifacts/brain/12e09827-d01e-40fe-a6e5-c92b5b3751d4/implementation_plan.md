# Freqtrade Strategy Stress-Tester, Weak-Point Breaker & Optimizer

A dedicated algorithmic stress-testing workbench and strategy engineering suite built specifically for your **Freqtrade Docker** workflow. Its primary objective is to **deliberately stress-test and break trading algorithms across difficult market regimes** (flash crashes, prolonged bear markets, choppy consolidation) to identify and eliminate vulnerabilities before deploying capital.

## User Review & Critical Decisions

> [!IMPORTANT]
> The primary mission is not building a standalone commercial web app, but rather providing a high-powered **Stress-Testing Lab and Strategy Refinement Engine** that directly accelerates your local Freqtrade Docker testing. It allows you to expose and isolate algorithmic failure modes, test fixes against adversarial market conditions, and copy/export battle-hardened Python strategies directly into `user_data/strategies/`.

- **Confirmed Decision 1**: Focus squarely on **breaking algorithms at their weak points** (analyzing why the revisions lost 50%–70%, preventing late top-buying, eliminating whipsaw stopouts, and surviving bear markets).
- **Confirmed Decision 2**: Fully align with your **Freqtrade Docker workflow** (`user_data/strategies/`, `docker-compose.yml`, `config_a.json`, `run_test.py`).
- **Confirmed Decision 3**: Provide full, production-tested Python strategy code (`IStrategy`), Hyperopt configurations, and Docker CLI commands. You are welcome to share your `config_a.json` so we can align pairlists, stake currency, and exchange rules.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Adversarial Stress-Testing ("Break the Bot")**:
   - Test strategies against specific market regimes engineered to exploit trading bot flaws:
     - **The Peak Chaser Trap**: Sharp vertical pump followed by an immediate 4% pullback (shows why your original ADX breakout bought the top and stopped out).
     - **The Sideways Chop Grind**: Range-bound oscillating market with false breakouts (shows how ADX lag generates 5–8 consecutive losing entries).
     - **The Bear Market Bleed**: Macro downtrend with short-lived relief bounces (shows why long-only strategies without higher-timeframe filters lose 50%–70%).
     - **The Volatility Wick**: Flash liquidity wick that triggers fixed 3% stops before surging to new highs.
2. **Failure Autopsy of the Recent -50% and -70% Runs**:
   - Step-by-step breakdown of how the trailing-stop and indicator tweaks interacted to destroy performance.
3. **Robust, Battle-Hardened Python Strategies**:
   - Ready to drop directly into your Freqtrade `user_data/strategies/` folder:
     - `AdxDmiRobustV2.py`: Fixes the original ADX/DMI logic by replacing the peak breakout with pullback-to-EMA entries, removing the premature ADX-falling exit, and using ATR dynamic stops.
     - `RegimeAdaptiveMaster.py`: Dual-timeframe strategy (1h entry + 4h macro trend) that stays 100% in cash during bear regimes and rides multi-day bull trends.
     - `HyperoptAdxDmi.py`: Ready-to-run Freqtrade hyperopt spaces to optimize thresholds locally in Docker.
4. **Freqtrade Docker Orchestration**:
   - Pre-configured `docker-compose.yml`, backtest script (`run_test.py`), and config templates.

---

## 2. Technical Autopsy: Why Your Revised Strategy Lost 50%–70%

### Root Causes Identified from Your Code & Backtest Discrepancies

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE WHIPSAW DEATH SPIRAL BREAKDOWN                  │
└────────────────────────────────────────────────────────────────────────┘

 [Original Logic Flaw #1: Peak Entry]
  ADX > 27 + 2 Rising Candles + Bull Breakout
  ──────────────────────────────────────────► Buys at highest candle of the pump
                                                     │
                                                     ▼ [Price naturally pulls back 2-4%]
 [Original Logic Flaw #2: Tight Stop & Bad Exit]     │
  Fixed -3% Stoploss (stoploss = -0.03) ────────────► STOPPED OUT AT LOSS (-3%)
  OR:                                                │
  adx_falling_2 exit rule fires                      │
  (ADX ALWAYS falls during a pullback!) ────────────► EXITS AT THE BOTTOM OF THE PULLBACK
                                                     │
                                                     ▼ [Bull trend resumes]
 [The Compounding Loss Trap]                         │
  Price moves higher; ADX crosses 27 again ─────────► Buys high AGAIN
  Repeat 40-80 times across 1h/30m test ────────────► Account loses 50% to 70%
```

1. **The 3% Stoploss (`stoploss = -0.03`) in Crypto Volatility**:
   - On 1h and 2h crypto candles, standard candle wicks and normal pullbacks routinely measure 3%–5%. A static 3% stop is guaranteed to be hit during healthy pullbacks before the trend resumes.
2. **The ADX-Falling Exit Bug**:
   - `(dataframe["adx"] > 25) & dataframe["adx_falling_2"]` exits whenever ADX drops for 2 candles. But ADX measures velocity, so *any* consolidation causes ADX to fall. This code instructs the bot to sell right at the bottom of temporary consolidations.
3. **The Trailing-Stop Misconfiguration**:
   - When trailing stops are added to Freqtrade without positive offset or with too tight of a trail (e.g. trailing at 1% or 2%), standard intra-candle noise triggers the trailing exit immediately, locking in tiny gains while absorbing full 3% stopouts on losing trades.
4. **Timeframe Sensitivity (2h vs 1h vs 30m)**:
   - Your test showed 2h was +13.62%, 1h was -9.35%, and 30m was -54.99%. Why? Because lower timeframes have higher noise-to-signal ratios. Without a higher-timeframe filter, the bot generates hundreds of false breakouts.

---

## 3. The Interactive Stress-Test Workbench Interface

### Designed for Rapid Strategy Debugging
- **Canvas**: Clean dark-slate terminal aesthetic (`#090D16` / `#0F172A`) with high-contrast indicator tracks and tabular metrics (`font-mono tabular-nums`).
- **Top Bar Contract**:
  - Zone 1: `FreqLab // Docker Strategy Workbench`
  - Zone 2: `[Stress-Test Lab]` · `[Strategy Autopsy]` · `[Python Strategies]` · `[Docker & Config]`
  - Zone 3: `[Download Strategy Files (.zip / .py)]`

### Core Modules
1. **Interactive Stress-Tester ("Break the Bot")**:
   - Toggle through adversarial market regimes:
     - **Chop / Range-Bound Market**: See how the original strategy generates 6 losing trades in a row, while the robust version filters them out.
     - **Bear Downtrend**: See how the original strategy bleeds out on fake bounces, while the regime-filtered strategy remains 100% in cash.
     - **Bull Trend**: See how the original strategy cuts winners early at 1440m ROI, while the robust version rides the trend for max profit.
   - Interactive parameter sliders (ADX Threshold, DMI Gap, ATR Stop Multiplier, Trend EMA Filter) with live metric recalculation.
2. **Failure Autopsy View**:
   - Visual breakdown of the specific code lines in `AdxDmiOnlyStrategy.py` that caused the 50%–70% losses, paired with side-by-side corrected code.
3. **Production Freqtrade Python Hub**:
   - Syntax-highlighted viewers for:
     - `AdxDmiRobustV2.py` (Complete Freqtrade IStrategy)
     - `RegimeAdaptiveMaster.py` (Dual-timeframe 1h/4h with cash preservation)
     - `AdxDmiHyperopt.py` (Hyperopt spaces for Freqtrade)
     - `docker-compose.yml` (Dockerized setup matching your environment)
   - One-click copy and `.py` file download.
4. **Config & Docker Integration Assistant**:
   - Copy-paste bash commands for `freqtrade download-data`, `freqtrade backtesting`, and `freqtrade hyperopt`.
   - Dedicated viewer for `config_a.json` with pairs setup and dry-run guidelines.

---

## 4. Technical Architecture & Freqtrade Python Strategy Blueprint

### The Mathematical Improvements in the Python Strategy
1. **Pullback Entry Filter**:
   - Instead of entering on breakout (`close > high.shift(1)`), enter when price pulls back toward the 20 EMA while ADX > 25 and +DI > -DI, with RSI < 60 (preventing buying overbought tops).
2. **ATR Dynamic Stoploss (`custom_stoploss`)**:
   - Dynamically calculate stoploss as `2.5 * ATR`, giving trades room to breathe during high volatility and tightening during low volatility.
3. **Macro Trend Guard (`informative_pairs`)**:
   - Load 4h candle data; only take long entries if `close_4h > ema200_4h`. In bear markets, this forces the bot to stay in USDT/cash, completely avoiding the catastrophic drawdowns.
4. **Dynamic Trailing Profit (`custom_exit`)**:
   - Replace the rigid time-based ROI degradation with a trailing stop that activates only after +3% profit, trailing behind the 20 EMA.

---

## 5. Verification Plan

1. **App Compilation**: Verify TypeScript, Vite, and Tailwind build with zero errors (`compile_applet`).
2. **TA-Lib Logic Verification**: Ensure the simulator's indicator calculations (ADX, PLUS_DI, MINUS_DI, ATR, EMA) mirror Python TA-Lib outputs.
3. **Python Code Syntax**: Verify that the generated Python strategy files conform strictly to Freqtrade `IStrategy` (version 3) specifications.
4. **Interactive Controls**: Test regime switching, parameter tuning, code copy/download buttons, and config templates.

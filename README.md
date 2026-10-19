# Freqtrade Algo Trading Bot & Strategy Optimizer

A high-performance algorithmic trading suite for **Freqtrade**, featuring failure-mode stress testing, dual-timeframe trend filtering, dynamic ATR trailing stoplosses, and an interactive strategy workbench.

---

## 1. Strategies Included

### `AdxDmiRobustV2` (Recommended)
Location: `user_data/strategies/AdxDmiRobustV2.py`
- **Core Concept**: Pullback-to-value entry near the 20-period EMA during established ADX trend strength.
- **Problem Solved**: Eliminates peak-buying breakout entries and premature ADX-falling exits that previously led to -50% to -70% drawdowns.
- **Stoploss**: Dynamic ATR trailing stoploss via `custom_stoploss()` (adapts to market volatility, avoiding static 3% noise stopouts).
- **Timeframe**: 1h (recommended for crypto spot/futures).

### `RegimeAdaptiveMaster` (Multi-Timeframe)
Location: `user_data/strategies/RegimeAdaptiveMaster.py`
- **Core Concept**: Dual-timeframe architecture using Freqtrade's `informative_pairs`.
- **4h Macro Filter**: Only permits long positions when `4h Close > 4h EMA200`.
- **Bear Market Defense**: Forces 100% cash preservation (0 trades) during sustained bear market regimes, completely preventing dead-cat bounce traps.
- **1h Execution**: Precision entries on EMA pullbacks.

### `AdxDmiHyperopt` (Optimizer Spaces)
Location: `user_data/strategies/AdxDmiHyperopt.py`
- Ready-to-run parameter search spaces for ADX thresholds, DMI gap, and ATR stop multipliers.

---

## 2. Quick Start with Docker Compose

Run both the **Interactive Strategy Optimizer Web UI** and **Freqtrade** simultaneously:

```bash
docker compose up --build -d
```

- **Strategy Optimizer UI**: [http://localhost:3000](http://localhost:3000)
- **Freqtrade Web/API**: [http://localhost:8080](http://localhost:8080)

---

## 3. Backtesting & Hyperopting

### Download Historical Data
```bash
docker compose run --rm freqtrade_a download-data \
  --config user_data/config_a.json \
  --timerange 20210101-20260830 \
  -t 1h 2h 4h
```

### Run Backtest
```bash
docker compose run --rm freqtrade_a backtesting \
  --config user_data/config_a.json \
  --strategy AdxDmiRobustV2 \
  --timerange 20210101-20260830 \
  --export trades
```

### Run Hyperopt
```bash
docker compose run --rm freqtrade_a hyperopt \
  --config user_data/config_a.json \
  --strategy AdxDmiRobustV2 \
  --hyperopt-loss SharpeHyperOptLoss \
  --spaces buy sell \
  --epochs 100
```

### Plot Dataframe & Signals
```bash
docker compose run --rm freqtrade_a plot-dataframe \
  --config user_data/config_a.json \
  --strategy AdxDmiRobustV2 \
  -p BTC/USDT \
  --timeframe 1h \
  --timerange 20240101-20240301 \
  --indicators1 adx plus_di minus_di \
  --indicators2 ema20 ema50 ema200
```

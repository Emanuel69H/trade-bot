import { Candle, MarketRegime, SimulationResult, SimulatedTrade, StrategyParams } from '../types/strategy';

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  if (values.length === 0) return result;
  
  const multiplier = 2 / (period + 1);
  let ema = values[0];
  result[0] = ema;

  for (let i = 1; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result[i] = ema;
  }
  return result;
}

/**
 * Calculates Average True Range (ATR) using Wilder's smoothing
 */
export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const n = highs.length;
  const tr: number[] = new Array(n).fill(0);
  const atr: number[] = new Array(n).fill(0);
  
  if (n === 0) return atr;

  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < n; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  // Initial SMA of TR
  let sum = 0;
  for (let i = 0; i < Math.min(period, n); i++) {
    sum += tr[i];
  }
  atr[Math.min(period - 1, n - 1)] = sum / Math.min(period, n);

  // Wilder's smoothing
  for (let i = period; i < n; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

/**
 * Calculates ADX, +DI, -DI using standard Wilder's smoothing (TA-Lib equivalent)
 */
export function calculateADXandDMI(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): { adx: number[]; plus_di: number[]; minus_di: number[] } {
  const n = highs.length;
  const plus_di = new Array(n).fill(0);
  const minus_di = new Array(n).fill(0);
  const adx = new Array(n).fill(0);

  if (n < period + 1) return { adx, plus_di, minus_di };

  const tr: number[] = new Array(n).fill(0);
  const plus_dm: number[] = new Array(n).fill(0);
  const minus_dm: number[] = new Array(n).fill(0);

  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    if (upMove > downMove && upMove > 0) {
      plus_dm[i] = upMove;
    } else {
      plus_dm[i] = 0;
    }

    if (downMove > upMove && downMove > 0) {
      minus_dm[i] = downMove;
    } else {
      minus_dm[i] = 0;
    }

    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;

  for (let i = 1; i <= period; i++) {
    smoothedTR += tr[i];
    smoothedPlusDM += plus_dm[i];
    smoothedMinusDM += minus_dm[i];
  }

  const dx: number[] = new Array(n).fill(0);

  if (smoothedTR > 0) {
    plus_di[period] = (smoothedPlusDM / smoothedTR) * 100;
    minus_di[period] = (smoothedMinusDM / smoothedTR) * 100;
    const diDiff = Math.abs(plus_di[period] - minus_di[period]);
    const diSum = plus_di[period] + minus_di[period];
    dx[period] = diSum > 0 ? (diDiff / diSum) * 100 : 0;
  }

  for (let i = period + 1; i < n; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + tr[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plus_dm[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minus_dm[i];

    if (smoothedTR > 0) {
      plus_di[i] = (smoothedPlusDM / smoothedTR) * 100;
      minus_di[i] = (smoothedMinusDM / smoothedTR) * 100;
    } else {
      plus_di[i] = 0;
      minus_di[i] = 0;
    }

    const diDiff = Math.abs(plus_di[i] - minus_di[i]);
    const diSum = plus_di[i] + minus_di[i];
    dx[i] = diSum > 0 ? (diDiff / diSum) * 100 : 0;
  }

  // Calculate ADX as Wilder's smoothed DX
  let dxSum = 0;
  for (let i = period; i < period * 2 && i < n; i++) {
    dxSum += dx[i];
  }
  const adxStartIndex = Math.min(period * 2 - 1, n - 1);
  adx[adxStartIndex] = dxSum / period;

  for (let i = adxStartIndex + 1; i < n; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }

  return { adx, plus_di, minus_di };
}

/**
 * Generates populated Candle series with technical indicators
 */
export function buildCandleSeries(
  rawCandles: { timestamp: number; dateStr: string; open: number; high: number; low: number; close: number; volume: number }[]
): Candle[] {
  const highs = rawCandles.map(c => c.high);
  const lows = rawCandles.map(c => c.low);
  const closes = rawCandles.map(c => c.close);

  const { adx, plus_di, minus_di } = calculateADXandDMI(highs, lows, closes, 14);
  const atr = calculateATR(highs, lows, closes, 14);
  const ema20 = calculateEMA(closes, 20);
  const ema200 = calculateEMA(closes, 50); // Using 50-period as local macro baseline for simulation

  return rawCandles.map((c, i) => {
    const curAdx = adx[i];
    const prevAdx1 = i > 0 ? adx[i - 1] : curAdx;
    const prevAdx2 = i > 1 ? adx[i - 2] : prevAdx1;

    const adx_rising_1 = curAdx > prevAdx1;
    const adx_rising_2 = curAdx > prevAdx1 && prevAdx1 > prevAdx2;
    const adx_falling_2 = curAdx < prevAdx1 && prevAdx1 < prevAdx2;

    const dmi_gap = plus_di[i] - minus_di[i];
    const bull_trend = curAdx > 25 && plus_di[i] > minus_di[i] && dmi_gap > 3;

    // Breakout confirmation
    const prevHigh1 = i > 0 ? rawCandles[i - 1].high : c.high;
    const prevClose1 = i > 0 ? rawCandles[i - 1].close : c.close;
    const prevHigh2 = i > 1 ? rawCandles[i - 2].high : prevHigh1;
    const bull_breakout = c.close > prevHigh1 && prevClose1 <= prevHigh2;

    const trend_exhausted = curAdx >= 38;

    // Robust pullback condition: price pulls back near 20 EMA, but is above 20 EMA or within 0.5%, with ADX strong and +DI > -DI
    const distToEma20 = (c.close - ema20[i]) / ema20[i];
    const pullback_entry =
      c.close > ema200[i] &&
      curAdx > 22 &&
      plus_di[i] > minus_di[i] &&
      distToEma20 >= -0.015 &&
      distToEma20 <= 0.018 &&
      c.low <= ema20[i] * 1.008;

    return {
      ...c,
      adx: Number(curAdx.toFixed(2)),
      plus_di: Number(plus_di[i].toFixed(2)),
      minus_di: Number(minus_di[i].toFixed(2)),
      dmi_gap: Number(dmi_gap.toFixed(2)),
      atr: Number(atr[i].toFixed(4)),
      ema20: Number(ema20[i].toFixed(2)),
      ema200: Number(ema200[i].toFixed(2)),
      adx_rising_2,
      adx_falling_2,
      bull_breakout,
      bull_trend,
      trend_exhausted,
      pullback_entry,
    };
  });
}

/**
 * Synthetic Market Datasets engineered to stress-test specific algorithmic vulnerabilities
 */

// 1. CHOP / FALSE BREAKOUT TRAP
// Ranging market with false highs that quickly collapse back to range bottom
export function generateChopMarket(): Candle[] {
  const candles: { timestamp: number; dateStr: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  const baseTime = 1710000000000;
  let price = 65000;
  const count = 90;

  for (let i = 0; i < count; i++) {
    const cycle = (i % 16);
    let changePct = 0;
    
    // Wave pattern: pump to trigger breakout, then hard dump to stop out
    if (cycle === 3 || cycle === 4) {
      changePct = 0.022; // pump triggers ADX breakout
    } else if (cycle === 5) {
      changePct = -0.028; // sudden wick down hitting -3% stoploss
    } else if (cycle === 6 || cycle === 7) {
      changePct = -0.012; // slow bleed
    } else if (cycle === 10 || cycle === 11) {
      changePct = 0.018; // another false pump
    } else if (cycle === 12) {
      changePct = -0.025; // another stopout dump
    } else {
      changePct = (Math.sin(i * 0.7) * 0.008);
    }

    const open = price;
    const close = price * (1 + changePct);
    const high = Math.max(open, close) * (1 + 0.006);
    const low = Math.min(open, close) * (1 - 0.007);
    const volume = 1200 + Math.abs(changePct) * 100000;

    candles.push({
      timestamp: baseTime + i * 3600 * 1000,
      dateStr: `T+${i}h`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(volume),
    });
    price = close;
  }
  return buildCandleSeries(candles);
}

// 2. BEAR MARKET BLEED
// Macro downtrend (below 200 EMA) with seductive dead-cat bounces that trick breakout bots
export function generateBearMarket(): Candle[] {
  const candles: { timestamp: number; dateStr: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  const baseTime = 1710000000000;
  let price = 70000;
  const count = 100;

  for (let i = 0; i < count; i++) {
    const cycle = i % 20;
    let changePct = -0.006; // overall negative drift

    if (cycle >= 4 && cycle <= 6) {
      changePct = 0.025; // sharp dead-cat bounce! Causes ADX to rise and breakout to trigger
    } else if (cycle >= 7 && cycle <= 10) {
      changePct = -0.032; // heavy resumption of downtrend, smashing stoplosses
    } else if (cycle >= 14 && cycle <= 16) {
      changePct = 0.022; // second bear trap bounce
    } else if (cycle >= 17 && cycle <= 19) {
      changePct = -0.028; // dump continues
    }

    const open = price;
    const close = price * (1 + changePct);
    const high = Math.max(open, close) * (1 + 0.005);
    const low = Math.min(open, close) * (1 - 0.008);
    const volume = 1500 + Math.abs(changePct) * 120000;

    candles.push({
      timestamp: baseTime + i * 3600 * 1000,
      dateStr: `T+${i}h`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(volume),
    });
    price = close;
  }
  return buildCandleSeries(candles);
}

// 3. FLASH LIQUIDITY WICK
// Healthy trend with a sudden 3.5% liquidity wick that stops out static 3% stops before rocketing +25%
export function generateWickMarket(): Candle[] {
  const candles: { timestamp: number; dateStr: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  const baseTime = 1710000000000;
  let price = 58000;
  const count = 85;

  for (let i = 0; i < count; i++) {
    let changePct = 0.003;
    let wickExtra = 0.005;

    if (i < 20) {
      changePct = 0.008 + (Math.sin(i) * 0.004); // build strong trend, ADX crosses 28
    } else if (i === 22) {
      // THE WICK CANDLE: drops 3.6% intraday to hunt stops, then closes flat
      changePct = -0.005;
      wickExtra = 0.038; // deep wick to trigger fixed 3% stop
    } else if (i > 22 && i < 55) {
      // Explosive +28% continuation
      changePct = 0.012 + (Math.sin(i * 0.5) * 0.005);
    } else {
      // Gentle consolidation
      changePct = Math.sin(i) * 0.004;
    }

    const open = price;
    const close = price * (1 + changePct);
    const high = Math.max(open, close) * (1 + 0.006);
    const low = Math.min(open, close) * (1 - wickExtra);
    const volume = i === 22 ? 85000 : 2500 + Math.abs(changePct) * 80000;

    candles.push({
      timestamp: baseTime + i * 3600 * 1000,
      dateStr: `T+${i}h`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(volume),
    });
    price = close;
  }
  return buildCandleSeries(candles);
}

// 4. BULL RUNNER (TIME ROI TRAP)
// Sustained multi-day bull trend where 1440m time ROI forces early exit at +3% while trend runs +35%
export function generateBullRunnerMarket(): Candle[] {
  const candles: { timestamp: number; dateStr: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  const baseTime = 1710000000000;
  let price = 50000;
  const count = 100;

  for (let i = 0; i < count; i++) {
    let changePct = 0.005;
    if (i >= 15 && i <= 75) {
      // Steady strong trending regime with mild 1-2 candle pullbacks
      if (i % 9 === 0) {
        changePct = -0.012; // normal pullback where ADX dips slightly
      } else {
        changePct = 0.011 + (Math.cos(i * 0.4) * 0.004);
      }
    } else {
      changePct = Math.sin(i * 0.3) * 0.003;
    }

    const open = price;
    const close = price * (1 + changePct);
    const high = Math.max(open, close) * (1 + 0.006);
    const low = Math.min(open, close) * (1 - 0.006);
    const volume = 3000 + Math.abs(changePct) * 90000;

    candles.push({
      timestamp: baseTime + i * 3600 * 1000,
      dateStr: `T+${i}h`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(volume),
    });
    price = close;
  }
  return buildCandleSeries(candles);
}

export function getRegimeCandles(regime: MarketRegime): Candle[] {
  switch (regime) {
    case 'chop':
      return generateChopMarket();
    case 'bear':
      return generateBearMarket();
    case 'wick':
      return generateWickMarket();
    case 'bull_runner':
      return generateBullRunnerMarket();
  }
}

/**
 * Simulates user's ORIGINAL AdxDmiOnlyStrategy
 */
export function simulateOriginalStrategy(candles: Candle[], params: StrategyParams): SimulationResult {
  const trades: SimulatedTrade[] = [];
  let inTrade = false;
  let entryIndex = 0;
  let entryPrice = 0;
  let entryDate = '';
  let highWaterMark = 0;

  const startingEquity = 10000;
  let currentEquity = startingEquity;
  const equityCurve: { index: number; equity: number; dateStr: string }[] = [{ index: 0, equity: startingEquity, dateStr: candles[0]?.dateStr || '' }];

  for (let i = 2; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    if (!inTrade) {
      // Original Entry Condition:
      // volume > 0 & bull_trend (adx > 27, plus_di > minus_di, dmi_gap > 3) & adx_rising_2 & plus_di rising & bull_breakout & ~trend_exhausted
      const plusDiRising = c.plus_di > prevC.plus_di;
      const isOriginalEntry =
        c.volume > 0 &&
        c.adx > params.adx_trend_threshold &&
        c.plus_di > c.minus_di &&
        c.dmi_gap > params.dmi_gap_threshold &&
        c.adx_rising_2 &&
        plusDiRising &&
        c.bull_breakout &&
        c.adx < params.adx_exhaustion_threshold;

      if (isOriginalEntry) {
        inTrade = true;
        entryIndex = i;
        entryPrice = c.close;
        entryDate = c.dateStr;
        highWaterMark = c.close;
      }
    } else {
      // In Trade: Track high water mark
      if (c.high > highWaterMark) {
        highWaterMark = c.high;
      }
      const duration = i - entryIndex;
      const currentProfitPct = (c.close - entryPrice) / entryPrice;
      const lowestProfitPct = (c.low - entryPrice) / entryPrice;

      let exitTriggered = false;
      let exitReason: SimulatedTrade['exitReason'] = 'roi_time';
      let exitLabel = '';
      let exitPrice = c.close;

      // 1. Fixed Stoploss Check (-3%)
      if (lowestProfitPct <= params.fixed_stoploss) {
        exitTriggered = true;
        exitReason = 'stoploss_fixed';
        exitLabel = 'Fixed Stoploss (-3%)';
        exitPrice = entryPrice * (1 + params.fixed_stoploss);
      }

      // 2. Original Exit Signals from populate_exit_trend:
      // a) Bearish takeover: minus_di > plus_di and minus_di rising
      if (!exitTriggered && c.minus_di > c.plus_di && c.minus_di > prevC.minus_di) {
        exitTriggered = true;
        exitReason = 'dmi_inversion';
        exitLabel = 'Bearish DMI Takeover';
        exitPrice = c.close;
      }

      // b) ADX Falling exit (THE FATAL FLAW): adx > 25 & adx_falling_2
      if (!exitTriggered && c.adx > 25 && c.adx_falling_2) {
        exitTriggered = true;
        exitReason = 'adx_falling';
        exitLabel = 'ADX Falling for 2 Candles';
        exitPrice = c.close;
      }

      // c) No more valid bull trend
      if (!exitTriggered && c.adx < params.adx_trend_threshold && c.minus_di > c.plus_di) {
        exitTriggered = true;
        exitReason = 'trend_break';
        exitLabel = 'ADX Under Threshold & Bearish DI';
        exitPrice = c.close;
      }

      // 3. Minimal ROI Schedule:
      // 0m: 0.15, 360m (6 candles): 0.08, 1440m (24 candles): 0.03, 2880m (48 candles): 0.0
      if (!exitTriggered) {
        if (duration >= 48 && currentProfitPct >= 0.0) {
          exitTriggered = true;
          exitReason = 'roi_time';
          exitLabel = 'ROI Time (2880m @ 0.0%)';
          exitPrice = c.close;
        } else if (duration >= 24 && currentProfitPct >= 0.03) {
          exitTriggered = true;
          exitReason = 'roi_time';
          exitLabel = 'ROI Time (1440m @ 3.0%)';
          exitPrice = c.close;
        } else if (duration >= 6 && currentProfitPct >= 0.08) {
          exitTriggered = true;
          exitReason = 'roi_time';
          exitLabel = 'ROI Time (360m @ 8.0%)';
          exitPrice = c.close;
        } else if (currentProfitPct >= 0.15) {
          exitTriggered = true;
          exitReason = 'roi_time';
          exitLabel = 'ROI Instant (15.0%)';
          exitPrice = c.close;
        }
      }

      if (exitTriggered) {
        const finalProfitPct = (exitPrice - entryPrice) / entryPrice;
        const profitAbs = currentEquity * finalProfitPct;
        currentEquity += profitAbs;

        trades.push({
          id: `orig_trade_${trades.length + 1}`,
          entryIndex,
          exitIndex: i,
          entryDate,
          exitDate: c.dateStr,
          entryPrice: Number(entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          profitPct: Number((finalProfitPct * 100).toFixed(2)),
          profitAbs: Number(profitAbs.toFixed(2)),
          exitReason,
          exitReasonLabel: exitLabel,
          entryTag: 'adx_dmi_breakout_long',
          highWaterMark: Number(highWaterMark.toFixed(2)),
          durationCandles: duration,
        });

        inTrade = false;
      }
    }

    equityCurve.push({
      index: i,
      equity: Number(currentEquity.toFixed(2)),
      dateStr: c.dateStr,
    });
  }

  return computeMetrics(trades, equityCurve, startingEquity);
}

/**
 * Simulates the REFACTORED ROBUST Strategy:
 * - Macro trend filter (price > EMA 200) to protect against bear markets
 * - Pullback entry near 20 EMA instead of chasing breakout tops
 * - ATR-based dynamic stoploss (e.g. 2.5 * ATR) to withstand crypto wicks
 * - Dynamic trailing stoploss activated after +3% profit
 * - Eliminates the premature ADX-falling exit
 */
export function simulateRobustStrategy(candles: Candle[], params: StrategyParams): SimulationResult {
  const trades: SimulatedTrade[] = [];
  let inTrade = false;
  let entryIndex = 0;
  let entryPrice = 0;
  let entryDate = '';
  let highWaterMark = 0;
  let initialStopPrice = 0;

  const startingEquity = 10000;
  let currentEquity = startingEquity;
  const equityCurve: { index: number; equity: number; dateStr: string }[] = [{ index: 0, equity: startingEquity, dateStr: candles[0]?.dateStr || '' }];

  for (let i = 2; i < candles.length; i++) {
    const c = candles[i];

    if (!inTrade) {
      // Robust Entry Logic:
      // 1. Higher-timeframe / Trend filter: Close above EMA 200 (stays in cash in bear market!)
      const trendFilterPass = !params.use_ema_filter || c.close > c.ema200;

      // 2. Confirmed trend structure: ADX > threshold & +DI > -DI & DMI gap > threshold
      const adxStructurePass = c.adx > (params.adx_trend_threshold - 3) && c.plus_di > c.minus_di && c.dmi_gap > params.dmi_gap_threshold;

      // 3. Pullback to value: Price is within reasonable reach of 20 EMA (not over-extended)
      const distToEma20 = (c.close - c.ema20) / c.ema20;
      const isPullback = distToEma20 >= -0.02 && distToEma20 <= params.pullback_tolerance_pct;

      if (trendFilterPass && adxStructurePass && isPullback && c.adx < params.adx_exhaustion_threshold) {
        inTrade = true;
        entryIndex = i;
        entryPrice = c.close;
        entryDate = c.dateStr;
        highWaterMark = c.close;
        // Dynamic ATR stoploss calculated at entry
        initialStopPrice = entryPrice - c.atr * params.atr_multiplier;
      }
    } else {
      // In Trade
      if (c.high > highWaterMark) {
        highWaterMark = c.high;
      }

      const duration = i - entryIndex;
      const profitFromHigh = (highWaterMark - entryPrice) / entryPrice;

      let exitTriggered = false;
      let exitReason: SimulatedTrade['exitReason'] = 'stoploss_atr';
      let exitLabel = '';
      let exitPrice = c.close;

      // 1. Dynamic ATR Initial Stoploss Check
      if (c.low <= initialStopPrice) {
        exitTriggered = true;
        exitReason = 'stoploss_atr';
        exitLabel = `Dynamic ATR Stop (${params.atr_multiplier}x ATR)`;
        exitPrice = initialStopPrice;
      }

      // 2. Trailing Stop: Activates once trade reaches +trailing_activation_pct (e.g. +3.0%)
      if (!exitTriggered && profitFromHigh >= params.trailing_activation_pct) {
        const trailingStopPrice = highWaterMark * (1 - params.trailing_delta_pct);
        if (c.low <= trailingStopPrice) {
          exitTriggered = true;
          exitReason = 'trailing_stop';
          exitLabel = `Trailing Stop (Locked ${(params.trailing_activation_pct * 100).toFixed(0)}%+ Gain)`;
          exitPrice = trailingStopPrice;
        }
      }

      // 3. Macro Trend Break Exit: Only exit if close decisively drops below EMA 20 AND ADX collapses below 20
      if (!exitTriggered && c.close < c.ema20 * 0.985 && c.adx < 20 && c.minus_di > c.plus_di) {
        exitTriggered = true;
        exitReason = 'trend_break';
        exitLabel = 'Macro Trend Broken (Below 20 EMA)';
        exitPrice = c.close;
      }

      // NOTE: We deliberately DO NOT exit on simple 2-candle ADX hesitation! That was the fatal flaw.

      if (exitTriggered) {
        const finalProfitPct = (exitPrice - entryPrice) / entryPrice;
        const profitAbs = currentEquity * finalProfitPct;
        currentEquity += profitAbs;

        trades.push({
          id: `robust_trade_${trades.length + 1}`,
          entryIndex,
          exitIndex: i,
          entryDate,
          exitDate: c.dateStr,
          entryPrice: Number(entryPrice.toFixed(2)),
          exitPrice: Number(exitPrice.toFixed(2)),
          profitPct: Number((finalProfitPct * 100).toFixed(2)),
          profitAbs: Number(profitAbs.toFixed(2)),
          exitReason,
          exitReasonLabel: exitLabel,
          entryTag: 'adx_pullback_ema20_long',
          highWaterMark: Number(highWaterMark.toFixed(2)),
          durationCandles: duration,
        });

        inTrade = false;
      }
    }

    equityCurve.push({
      index: i,
      equity: Number(currentEquity.toFixed(2)),
      dateStr: c.dateStr,
    });
  }

  return computeMetrics(trades, equityCurve, startingEquity);
}

function computeMetrics(trades: SimulatedTrade[], equityCurve: { index: number; equity: number; dateStr: string }[], startingEquity: number): SimulationResult {
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.profitPct > 0);
  const losses = trades.filter(t => t.profitPct <= 0);

  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const grossProfit = wins.reduce((sum, t) => sum + t.profitAbs, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profitAbs, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.0 : 1.0;

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity || startingEquity;
  const netProfitPct = ((finalEquity - startingEquity) / startingEquity) * 100;

  // Max Drawdown calculation
  let peak = startingEquity;
  let maxDD = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    const dd = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  const avgTradePct = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.profitPct, 0) / totalTrades : 0;

  return {
    trades,
    totalTrades,
    winCount,
    lossCount,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    netProfitPct: Number(netProfitPct.toFixed(2)),
    maxDrawdownPct: Number(maxDD.toFixed(2)),
    avgTradePct: Number(avgTradePct.toFixed(2)),
    equityCurve,
  };
}

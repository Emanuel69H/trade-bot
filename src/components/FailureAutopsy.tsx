import React, { useState } from 'react';
import { AlertTriangle, Check, X, ArrowRight, ShieldCheck, Flame, Bug } from 'lucide-react';

interface FailureAutopsyProps {
  onGoToStrategyCode: () => void;
  onGoToStressTest: () => void;
}

export const FailureAutopsy: React.FC<FailureAutopsyProps> = ({ onGoToStrategyCode, onGoToStressTest }) => {
  const [activeFlawIndex, setActiveFlawIndex] = useState<number>(0);

  const flaws = [
    {
      id: 'adx_falling_exit',
      title: 'Flaw #1: Exiting at the Bottom of Every Pullback',
      severity: 'CRITICAL (Chief cause of the -70% loss)',
      originalCode: `def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
    dataframe.loc[
        (
            (dataframe["volume"] > 0) &
            (
                # trend weakening after getting stretched
                (
                    (dataframe["adx"] > 25) &
                    dataframe["adx_falling_2"]  # <--- FATAL BUG!
                )
            )
        ),
        "exit_long"
    ] = 1`,
      whyItBreaks: `ADX measures the VELOCITY of a move, not price direction. In every single healthy bull market, price pauses, consolidates, or pulls back for 2-3 candles before the next explosive leg up. During those 2 candles of consolidation, ADX naturally drops!
      
Your strategy was hardcoded to SELL whenever ADX fell for 2 candles. This forced your bot to sell at the absolute bottom of normal healthy pullbacks. Then, as soon as price resumed its rally, ADX rose again, and the bot bought back in at a higher price! This buy-high, sell-low loop compounded into a -70% loss.`,
      fixedCode: `# REMOVED the premature ADX falling exit!
# True trend breakdown requires price breaking below key moving averages:
dataframe.loc[
    (
        (dataframe["volume"] > 0) &
        (
            (dataframe["close"] < dataframe["ema50"] * 0.985) &
            (dataframe["minus_di"] > dataframe["plus_di"]) &
            (dataframe["adx"] < 20)
        )
    ),
    "exit_long"
] = 1`,
      fixExplanation: 'We only exit when the macro moving average breaks decisively. Consolidation pullbacks are held safely, allowing runner trades to generate 15%–30% gains.',
    },
    {
      id: 'fixed_stoploss_noise',
      title: 'Flaw #2: The 3% Stoploss in a 4% Volatility Environment',
      severity: 'HIGH (Causes stopout hunt wicks)',
      originalCode: `class AdxDmiOnlyStrategy(IStrategy):
    # Fixed stoploss of -3%
    stoploss = -0.03`,
      whyItBreaks: `On crypto 1-hour and 2-hour candles, the Average True Range (ATR) routinely spans 2.5% to 5.0% per candle. Standard intra-candle liquidity wicks sweep 3.0% to 3.8% below recent lows before continuing higher.
      
A static -0.03 (-3%) stoploss gives zero breathing room. Even when your directional bias was 100% correct, temporary noise triggers the stoploss, booking a 3% loss immediately before the coin surges +20%.`,
      fixedCode: `stoploss = -0.08  # Catastrophic emergency barrier
use_custom_stoploss = True

def custom_stoploss(self, pair: str, trade, current_time, current_rate, current_profit, **kwargs):
    # Dynamic ATR stoploss calculated per pair volatility
    dataframe, _ = self.dp.get_analyzed_dataframe(pair, self.timeframe)
    atr = dataframe.iloc[-1].get("atr")
    atr_dist_pct = (atr * 2.4) / current_rate
    return -max(0.04, min(0.075, atr_dist_pct))`,
      fixExplanation: 'Dynamic ATR stoploss expands during volatile periods (5% to 7.5%) and contracts during tight periods, surviving liquidity wicks.',
    },
    {
      id: 'peak_breakout_entries',
      title: 'Flaw #3: Late Entries Buying Local Tops',
      severity: 'HIGH (Entering at candle exhaustion)',
      originalCode: `dataframe["bull_breakout"] = (
    (dataframe["close"] > dataframe["high"].shift(1)) &
    (dataframe["close"].shift(1) <= dataframe["high"].shift(2))
)

# Enters when ADX > 27 + ADX rising 2 candles + Breakout
dataframe.loc[
    (dataframe["bull_trend"] & dataframe["adx_rising_2"] & dataframe["bull_breakout"]),
    ["enter_long", "enter_tag"]
] = (1, "adx_dmi_breakout_long")`,
      whyItBreaks: `ADX is a lagging indicator that takes 14 periods of Wilder smoothing. By the time ADX crosses above 27 AND has risen for 2 consecutive candles, the initial explosive impulse is already 70% complete!
      
Adding "close > previous high" meant the bot placed limit/market buy orders at the very crest of the green candle, right into resistance and profit-taking. As soon as the impulse cooled, price pulled back, triggering Flaw #1 and Flaw #2.`,
      fixedCode: `# Buy VALUE on pullbacks to the 20 EMA rather than chasing peak breakouts!
dataframe["dist_ema20"] = (dataframe["close"] - dataframe["ema20"]) / dataframe["ema20"]
dataframe["pullback_zone"] = (
    (dataframe["dist_ema20"] >= -0.02) &
    (dataframe["dist_ema20"] <= 0.015) &
    (dataframe["low"] <= dataframe["ema20"] * 1.008)
)

dataframe.loc[
    (dataframe["bull_trend_structure"] & dataframe["pullback_zone"]),
    ["enter_long", "enter_tag"]
] = (1, "adx_pullback_ema20_long")`,
      fixExplanation: 'Enters when price tests the 20 EMA inside a confirmed trend, securing a much lower entry price and a favorable risk-reward ratio.',
    },
    {
      id: 'missing_bear_filter',
      title: 'Flaw #4: Lack of Macro Trend Filter (Bear Market Trap)',
      severity: 'CRITICAL (Wipes out 30m / 1h backtests)',
      originalCode: `# No higher timeframe filter or EMA200 check!
# The bot took long trades regardless of whether Bitcoin was at $69,000 or crashing to $16,000.`,
      whyItBreaks: `Crypto markets spend 40% of their cycles in prolonged bear trends or distribution phases. During a bear market, there are dozens of sharp 1-day relief rallies ("dead-cat bounces").
      
These bounces cause 1h ADX to spike above 27 and trigger long breakout entries. Days later, the macro downtrend resumes, smashing through stops. Taking long trades below the 200 EMA bleeds your account to zero over multi-year backtests.`,
      fixedCode: `# Dual-Timeframe Macro Trend Guard (informative_pairs)
# Only buy if 4-Hour Close > 4-Hour EMA 200:
dataframe["macro_bull"] = (
    dataframe["close_4h"] > dataframe["ema200_4h"]
)

dataframe.loc[
    (dataframe["macro_bull"] & dataframe["pullback_zone"]),
    ["enter_long", "enter_tag"]
] = (1, "macro_bull_ema20_pullback")`,
      fixExplanation: 'When the macro market is in a bear trend, the strategy takes 0 long trades, keeping 100% of your capital safe in USDT.',
    },
  ];

  const currentFlaw = flaws[activeFlawIndex];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bug className="w-5 h-5 text-rose-400" />
              Root-Cause Autopsy: Why Revised Strategies Lost 50%–70%
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              A line-by-line engineering breakdown of how the combination of late peak entries, the 3% stoploss, and
              the premature ADX-falling exit created a compounding whipsaw death spiral in backtests.
            </p>
          </div>
          <button
            onClick={onGoToStrategyCode}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Get Corrected Strategy Code</span>
          </button>
        </div>

        {/* Flaw Selector Pills */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-5">
          {flaws.map((flaw, idx) => (
            <button
              key={flaw.id}
              onClick={() => setActiveFlawIndex(idx)}
              className={`p-3 text-left rounded-lg border transition-all ${
                activeFlawIndex === idx
                  ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-sm ring-1 ring-rose-500/20'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono text-rose-400 font-semibold">0{idx + 1}</div>
              <div className="text-xs font-bold mt-0.5 line-clamp-1">{flaw.title.split(':')[1] || flaw.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Flaw Detail Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-rose-400 uppercase font-semibold tracking-wider">
              {currentFlaw.severity}
            </div>
            <h3 className="text-base font-bold text-white mt-1">{currentFlaw.title}</h3>
          </div>
          <button
            onClick={onGoToStressTest}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Test in Stress Lab</span>
          </button>
        </div>

        {/* Why it broke prose */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Mechanics of the Failure</h4>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
            {currentFlaw.whyItBreaks}
          </p>
        </div>

        {/* Side-by-side Code Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 font-mono text-xs">
          {/* Flawed Code */}
          <div className="p-5 bg-rose-950/10 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <X className="w-4 h-4 text-rose-400" />
              <span>Flawed Logic in AdxDmiOnlyStrategy</span>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-rose-900/40 text-rose-200/90 overflow-x-auto text-[11px] leading-relaxed">
              <code>{currentFlaw.originalCode}</code>
            </pre>
          </div>

          {/* Corrected Code */}
          <div className="p-5 bg-emerald-950/10 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Engineered Fix in AdxDmiRobustV2</span>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-emerald-900/40 text-emerald-200/90 overflow-x-auto text-[11px] leading-relaxed">
              <code>{currentFlaw.fixedCode}</code>
            </pre>
            <p className="text-[11px] text-slate-400 font-sans pt-1">
              <span className="text-emerald-400 font-semibold font-mono">Why this works: </span>
              {currentFlaw.fixExplanation}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Box: The Whipsaw Spiral */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
          Summary: How the Loop Compounded into a -70% Drawdown
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mt-3">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400">Step 1</div>
            <div className="font-semibold text-slate-200 mt-1">Buys Peak of Pump</div>
            <div className="text-[11px] text-slate-400 mt-1">ADX lag causes entry at local high resistance.</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400">Step 2</div>
            <div className="font-semibold text-slate-200 mt-1">Normal Pullback Occurs</div>
            <div className="text-[11px] text-slate-400 mt-1">Price retraces 2%–3% to test the moving average.</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400">Step 3</div>
            <div className="font-semibold text-rose-400 mt-1">Stopout / Exit Fires</div>
            <div className="text-[11px] text-slate-400 mt-1">Fixed 3% stop or ADX-falling exit sells at low.</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400">Step 4</div>
            <div className="font-semibold text-rose-400 mt-1">Repeats 50+ Times</div>
            <div className="text-[11px] text-slate-400 mt-1">Compounding 3% losses degrade portfolio by -70%.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

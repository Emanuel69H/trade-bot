import React, { useState, useMemo } from 'react';
import { MarketRegime, StrategyParams } from '../types/strategy';
import {
  getRegimeCandles,
  simulateOriginalStrategy,
  simulateRobustStrategy,
} from '../utils/technicalAnalysis';
import { StrategyChart } from './StrategyChart';
import {
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

const DEFAULT_PARAMS: StrategyParams = {
  adx_trend_threshold: 25,
  adx_exhaustion_threshold: 40,
  dmi_gap_threshold: 3,
  fixed_stoploss: -0.03,
  atr_multiplier: 2.4,
  trailing_activation_pct: 0.035,
  trailing_delta_pct: 0.015,
  use_ema_filter: true,
  ema_trend_period: 200,
  pullback_tolerance_pct: 0.015,
};

interface StressTestLabProps {
  onOpenAutopsy: () => void;
  onOpenPythonCode: () => void;
}

export const StressTestLab: React.FC<StressTestLabProps> = ({ onOpenAutopsy, onOpenPythonCode }) => {
  const [activeRegime, setActiveRegime] = useState<MarketRegime>('chop');
  const [params, setParams] = useState<StrategyParams>(DEFAULT_PARAMS);
  const [selectedStrategy, setSelectedStrategy] = useState<'both' | 'robust' | 'original'>('both');

  // Generate candles for active regime
  const candles = useMemo(() => getRegimeCandles(activeRegime), [activeRegime]);

  // Run simulations for both strategies
  const originalResult = useMemo(() => simulateOriginalStrategy(candles, params), [candles, params]);
  const robustResult = useMemo(() => simulateRobustStrategy(candles, params), [candles, params]);

  const regimeDescriptions: Record<MarketRegime, { title: string; flaw: string; solution: string }> = {
    chop: {
      title: 'Range-Bound Chop & False Breakout Whipsaw',
      flaw: 'The original strategy requires ADX > 27 + 2 rising candles + breakout of previous high. In a range, this enters near resistance at the top of the wave. The fixed 3% stop or ADX falling exit fires at the bottom of the cycle, causing repeated ~3% losses (-12% to -20% cumulative).',
      solution: 'The robust strategy checks for pullbacks toward the 20 EMA and filters out overextended entries. In sideways chop, entries are suppressed or dynamic ATR stops give breathing room.',
    },
    bear: {
      title: 'Macro Bear Market & Dead-Cat Relief Bounces',
      flaw: 'Long-only breakout bots without higher-timeframe filters treat temporary bear relief bounces as new bull trends. They buy every lower high, suffering catastrophic compounding losses (-50% to -70%).',
      solution: 'The robust strategy enforces a Macro Trend Guard (Price > EMA 200). In a bear market, 0 long trades are allowed, preserving 100% of your capital.',
    },
    wick: {
      title: 'Flash Liquidity Wick & Stopout Hunt',
      flaw: 'Crypto assets frequently drop 3.2% to 4% on intra-candle wicks to sweep liquidity before rallying. A static 3% stoploss is mathematically guaranteed to be hit right before a +25% move.',
      solution: 'The dynamic ATR stoploss (2.4x ATR ~ 5.5% breathing room) survives normal crypto volatility wicks, capturing the subsequent trend.',
    },
    bull_runner: {
      title: 'Sustained Parabolic Bull Runner',
      flaw: 'The original ROI schedule (1440m: +3%) forces the bot to exit a winning position after 24 hours for a small gain, completely missing the multi-day +30% crypto runner.',
      solution: 'The robust strategy removes rigid time decay exits and uses a trailing stop to let runners ride until momentum genuinely breaks.',
    },
  };

  const currentInfo = regimeDescriptions[activeRegime];

  return (
    <div className="space-y-6">
      {/* Top Banner: Stress-Test Regime Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Adversarial Market Stress-Test Lab
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Simulate how algorithms behave against extreme crypto market regimes. Test where your original
              AdxDmiOnlyStrategy broke down and verify how the refactored logic protects capital.
            </p>
          </div>

          {/* Strategy View Mode */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800/80 shrink-0">
            <button
              onClick={() => setSelectedStrategy('both')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedStrategy === 'both' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setSelectedStrategy('robust')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedStrategy === 'robust' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AdxDmiRobustV2
            </button>
            <button
              onClick={() => setSelectedStrategy('original')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedStrategy === 'original' ? 'bg-slate-800 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Original AdxDmiOnly
            </button>
          </div>
        </div>

        {/* Regime Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
          <button
            onClick={() => setActiveRegime('chop')}
            className={`p-3 text-left rounded-lg border transition-all ${
              activeRegime === 'chop'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>01. Sideways Chop</span>
              <span className="text-[10px] font-mono text-emerald-400">Whipsaw</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">False breakout trap at range highs</div>
          </button>

          <button
            onClick={() => setActiveRegime('bear')}
            className={`p-3 text-left rounded-lg border transition-all ${
              activeRegime === 'bear'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>02. Bear Market Bleed</span>
              <span className="text-[10px] font-mono text-rose-400">-50% Trap</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">Buying dead-cat bounces</div>
          </button>

          <button
            onClick={() => setActiveRegime('wick')}
            className={`p-3 text-left rounded-lg border transition-all ${
              activeRegime === 'wick'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>03. Flash Liquidity Wick</span>
              <span className="text-[10px] font-mono text-amber-400">-3% Stop Hunt</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">3.5% wick before +25% rally</div>
          </button>

          <button
            onClick={() => setActiveRegime('bull_runner')}
            className={`p-3 text-left rounded-lg border transition-all ${
              activeRegime === 'bull_runner'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm ring-1 ring-emerald-500/20'
                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center justify-between">
              <span>04. Parabolic Runner</span>
              <span className="text-[10px] font-mono text-cyan-400">Time ROI Cut</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">Exiting winning trades at 24h</div>
          </button>
        </div>
      </div>

      {/* Weak-Point Diagnostic Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5">
        <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-bold text-rose-400">Algorithmic Weak Point Exposed:</span>
              <span className="text-xs font-semibold text-slate-200">{currentInfo.title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{currentInfo.flaw}</p>
            <div className="flex items-center gap-2 pt-1 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-semibold text-emerald-300">Robust Solution:</span>
              <span className="text-slate-300">{currentInfo.solution}</span>
            </div>
          </div>
          <button
            onClick={onOpenAutopsy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View Full Autopsy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Performance KPI Scoreboard Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Strategy Card */}
        <div className="bg-slate-900 border border-rose-950/60 rounded-xl p-4.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500/10 border-b border-l border-rose-500/30 text-[10px] font-mono text-rose-400 font-semibold rounded-bl">
            Original AdxDmiOnly
          </div>
          <div className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Original Strategy Performance
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Net Profit</div>
              <div
                className={`text-sm font-bold font-mono tabular-nums ${
                  originalResult.netProfitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {originalResult.netProfitPct >= 0 ? `+${originalResult.netProfitPct}%` : `${originalResult.netProfitPct}%`}
              </div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Max DD</div>
              <div className="text-sm font-bold font-mono text-rose-400 tabular-nums">
                -{originalResult.maxDrawdownPct}%
              </div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Win Rate</div>
              <div className="text-sm font-bold font-mono text-slate-200 tabular-nums">
                {originalResult.winRate}%
              </div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Trades</div>
              <div className="text-sm font-bold font-mono text-slate-300 tabular-nums">
                {originalResult.totalTrades}
              </div>
            </div>
          </div>
        </div>

        {/* Robust Strategy Card */}
        <div className="bg-slate-900 border border-emerald-950/60 rounded-xl p-4.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/10 border-b border-l border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-semibold rounded-bl">
            AdxDmiRobustV2 (Optimized)
          </div>
          <div className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Refactored Strategy Performance
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Net Profit</div>
              <div
                className={`text-sm font-bold font-mono tabular-nums ${
                  robustResult.netProfitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {robustResult.netProfitPct >= 0 ? `+${robustResult.netProfitPct}%` : `${robustResult.netProfitPct}%`}
              </div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Max DD</div>
              <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                -{robustResult.maxDrawdownPct}%
              </div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Win Rate</div>
              <div className="text-sm font-bold font-mono text-slate-200 tabular-nums">
                {robustResult.winRate}%
              </div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">Trades</div>
              <div className="text-sm font-bold font-mono text-slate-300 tabular-nums">
                {robustResult.totalTrades}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts View */}
      <div className="space-y-4">
        {(selectedStrategy === 'both' || selectedStrategy === 'robust') && (
          <StrategyChart
            candles={candles}
            trades={robustResult.trades}
            strategyTitle="AdxDmiRobustV2: Pullback Entry + Dynamic ATR Trailing Stop"
          />
        )}

        {(selectedStrategy === 'both' || selectedStrategy === 'original') && (
          <StrategyChart
            candles={candles}
            trades={originalResult.trades}
            strategyTitle="Original AdxDmiOnly: Breakout Chasing + 3% Fixed Stoploss + ADX-Falling-2 Exit"
          />
        )}
      </div>

      {/* Parameter Optimizer & Tuning Sliders */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Live Strategy Parameter Tuner</h3>
          </div>
          <button
            onClick={() => setParams(DEFAULT_PARAMS)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ADX Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">ADX Trend Threshold</span>
              <span className="font-mono text-emerald-400 font-bold">{params.adx_trend_threshold}</span>
            </div>
            <input
              type="range"
              min="18"
              max="35"
              value={params.adx_trend_threshold}
              onChange={e => setParams({ ...params, adx_trend_threshold: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400">Min ADX strength required for bullish trend state.</div>
          </div>

          {/* DMI Gap Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">DMI Gap (+DI minus -DI)</span>
              <span className="font-mono text-emerald-400 font-bold">{params.dmi_gap_threshold}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={params.dmi_gap_threshold}
              onChange={e => setParams({ ...params, dmi_gap_threshold: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400">Spread required between +DI and -DI to confirm direction.</div>
          </div>

          {/* ATR Stop Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">ATR Stop Multiplier</span>
              <span className="font-mono text-emerald-400 font-bold">{params.atr_multiplier}x ATR</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="3.5"
              step="0.1"
              value={params.atr_multiplier}
              onChange={e => setParams({ ...params, atr_multiplier: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400">Dynamic stop distance based on market volatility.</div>
          </div>

          {/* Trailing Stop Activation */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Trailing Stop Trigger</span>
              <span className="font-mono text-emerald-400 font-bold">
                +{(params.trailing_activation_pct * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.08"
              step="0.005"
              value={params.trailing_activation_pct}
              onChange={e => setParams({ ...params, trailing_activation_pct: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400">Profit threshold to activate trailing protection.</div>
          </div>

          {/* Trailing Delta */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Trailing Delta Offset</span>
              <span className="font-mono text-emerald-400 font-bold">
                -{(params.trailing_delta_pct * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.03"
              step="0.002"
              value={params.trailing_delta_pct}
              onChange={e => setParams({ ...params, trailing_delta_pct: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[11px] text-slate-400">Trailing distance below peak high price.</div>
          </div>

          {/* Macro 200 EMA Filter Toggle */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Macro EMA 200 Filter</span>
              <span
                className={`font-mono text-xs font-bold ${params.use_ema_filter ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {params.use_ema_filter ? 'ENABLED (Cash Guard)' : 'DISABLED'}
              </span>
            </div>
            <button
              onClick={() => setParams({ ...params, use_ema_filter: !params.use_ema_filter })}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                params.use_ema_filter
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {params.use_ema_filter ? 'Guard Enabled: Stays in Cash in Bear' : 'Guard Disabled: Buys in Bear Market'}
            </button>
            <div className="text-[11px] text-slate-400">Prevents entering long trades when price is in downtrend.</div>
          </div>
        </div>
      </div>

      {/* Trade History Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Simulated Trade Execution Log (AdxDmiRobustV2)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {robustResult.trades.length} Trades Executed
          </span>
        </div>

        {robustResult.trades.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {params.use_ema_filter && activeRegime === 'bear' ? (
              <div className="space-y-1">
                <p className="text-emerald-400 font-semibold">100% Cash Preservation Active</p>
                <p className="text-slate-400">
                  Macro EMA 200 Filter identified bear regime and took 0 trades. Zero capital risked.
                </p>
              </div>
            ) : (
              'No trades triggered with current parameters.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Trade #</th>
                  <th className="py-2.5 px-4">Entry</th>
                  <th className="py-2.5 px-4">Entry Price</th>
                  <th className="py-2.5 px-4">Exit</th>
                  <th className="py-2.5 px-4">Exit Price</th>
                  <th className="py-2.5 px-4">Exit Reason</th>
                  <th className="py-2.5 px-4 text-right">P&L (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {robustResult.trades.map((t, idx) => {
                  const isProfit = t.profitPct >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-slate-300">{t.entryDate}</td>
                      <td className="py-2.5 px-4 text-slate-200 tabular-nums">${t.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-300">{t.exitDate}</td>
                      <td className="py-2.5 px-4 text-slate-200 tabular-nums">${t.exitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded ${
                            t.exitReason === 'trailing_stop'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              : t.exitReason === 'stoploss_atr'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {t.exitReasonLabel}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? `+${t.profitPct}%` : `${t.profitPct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

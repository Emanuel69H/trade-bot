import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, HardDrive, Cpu, HelpCircle } from 'lucide-react';

export const DockerCommandCenter: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const commands = [
    {
      title: '0. Start FreqLab Web App & Freqtrade via Docker Compose',
      desc: 'Builds and launches both the Strategy Optimizer web UI (http://localhost:3000) and Freqtrade container.',
      code: `docker compose up --build -d`,
    },
    {
      title: '1. Download Multi-Timeframe Historical Data',
      desc: 'Downloads 1h, 2h, and 4h crypto candles for your pair whitelist over your specified timerange.',
      code: `docker compose run --rm freqtrade_a download-data \\
  --config user_data/config_a.json \\
  --timerange 20210101-20260830 \\
  -t 1h 2h 4h`,
    },
    {
      title: '2. Backtest AdxDmiRobustV2 (Recommended Strategy)',
      desc: 'Runs the backtest using the refactored pullback entry, dynamic ATR trailing stop, and macro trend guard.',
      code: `docker compose run --rm freqtrade_a backtesting \\
  --config user_data/config_a.json \\
  --strategy AdxDmiRobustV2 \\
  --timerange 20210101-20260830 \\
  --export trades`,
    },
    {
      title: '3. Comparative Backtest: Benchmark Original vs Robust',
      desc: 'Runs backtest comparing original AdxDmiOnly against the robust version on the identical timeframe.',
      code: `docker compose run --rm freqtrade_a backtesting \\
  --config user_data/config_a.json \\
  --strategy-list AdxDmiOnlyStrategy AdxDmiRobustV2 \\
  --timeframe 1h \\
  --timerange 20230101-20240601`,
    },
    {
      title: '4. Run Hyperopt to Find Optimal ADX & Stoploss Parameters',
      desc: 'Runs automated genetic optimization on ADX thresholds, DMI gap, and ATR stoploss multiplier.',
      code: `docker compose run --rm freqtrade_a hyperopt \\
  --config user_data/config_a.json \\
  --strategy AdxDmiRobustV2 \\
  --hyperopt-loss SharpeHyperOptLoss \\
  --spaces buy sell \\
  --epochs 100`,
    },
    {
      title: '5. Visual Plot: Generate Candlestick HTML Chart with Trade Marks',
      desc: 'Generates a local interactive HTML chart showing exact entry points, exit points, and indicator lines.',
      code: `docker compose run --rm freqtrade_a plot-dataframe \\
  --config user_data/config_a.json \\
  --strategy AdxDmiRobustV2 \\
  -p BTC/USDT \\
  --timeframe 1h \\
  --timerange 20240101-20240301 \\
  --indicators1 adx plus_di minus_di \\
  --indicators2 ema20 ema50 ema200`,
    },
  ];

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              Freqtrade Docker Execution Command Center
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Copy-paste terminal commands configured to run directly against your Docker Compose setup,
              `config_a.json`, and `user_data/` directory.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Container: freqtrade_a</span>
          </div>
        </div>
      </div>

      {/* Directory Structure Blueprint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-400" />
          Where to Place Files in Your Local Folder Structure
        </h3>
        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 border border-slate-800/80 leading-relaxed overflow-x-auto">
          <div>📁 your-project/</div>
          <div className="pl-4">├── 📄 docker-compose.yml <span className="text-slate-500">(provided in Python Strategies tab)</span></div>
          <div className="pl-4">├── 📄 run_test.py <span className="text-slate-500">(automation runner)</span></div>
          <div className="pl-4">└── 📁 user_data/</div>
          <div className="pl-8">├── 📄 config_a.json <span className="text-slate-500">(Freqtrade config)</span></div>
          <div className="pl-8">├── 📁 data/ <span className="text-slate-500">(downloaded crypto OHLCV .json / .feather)</span></div>
          <div className="pl-8">├── 📁 logs/ <span className="text-slate-500">(freqtrade_a.log)</span></div>
          <div className="pl-8">└── 📁 strategies/</div>
          <div className="pl-12 text-emerald-400">├── 📄 AdxDmiRobustV2.py <span className="text-slate-500">← Put recommended strategy here</span></div>
          <div className="pl-12 text-indigo-400">├── 📄 RegimeAdaptiveMaster.py <span className="text-slate-500">← Put multi-timeframe strategy here</span></div>
          <div className="pl-12 text-amber-400">└── 📄 AdxDmiHyperopt.py <span className="text-slate-500">← Put hyperopt spaces here</span></div>
        </div>
      </div>

      {/* Commands List */}
      <div className="space-y-4">
        {commands.map((cmd, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">{cmd.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{cmd.desc}</p>
              </div>
              <button
                onClick={() => handleCopy(cmd.code, idx)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedIndex === idx ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedIndex === idx ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 font-mono text-xs text-amber-300 overflow-x-auto">
              <pre>{cmd.code}</pre>
            </div>
          </div>
        ))}
      </div>

      {/* Helpful Troubleshooting Tips */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          Pro-Tips for Testing Your Freqtrade Bot
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-400">1. Always inspect individual trade logs</div>
            <p className="text-slate-400 leading-relaxed">
              When a backtest finishes, check the table of exits. If 80%+ of exits are labelled `stoploss` or
              `adx_falling`, your exit triggers are too sensitive and chopping your equity.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-400">2. Test across full market cycles (2021 to 2024)</div>
            <p className="text-slate-400 leading-relaxed">
              Never test only in a bull market. The timerange `20210101-20260830` spans the 2021 bull run, the 2022
              bear crash, and the 2023–2024 recovery. This ensures your strategy can survive all cycles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

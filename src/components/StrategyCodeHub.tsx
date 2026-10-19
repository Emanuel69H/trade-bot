import React, { useState } from 'react';
import { STRATEGY_FILES } from '../data/strategyCode';
import { StrategyFile } from '../types/strategy';
import { Copy, Check, Download, FileCode, Info } from 'lucide-react';

export const StrategyCodeHub: React.FC = () => {
  const [activeFileId, setActiveFileId] = useState<string>('adx_dmi_robust_v2');
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = STRATEGY_FILES.find(f => f.id === activeFileId) || STRATEGY_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: StrategyFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              Freqtrade Python Strategies & Docker Files
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Production-ready Python strategy classes (`IStrategy` v3), Hyperopt parameter spaces, and Docker
              configurations formatted to drop directly into your local `user_data/strategies/` directory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy File Content'}</span>
            </button>
            <button
              onClick={() => handleDownload(activeFile)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeFile.filename}</span>
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          {STRATEGY_FILES.map(file => {
            const isActive = file.id === activeFileId;
            return (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-[10px] text-slate-500">
                  {file.filename.endsWith('.py') ? '.py' : file.filename.endsWith('.json') ? '.json' : '.yml'}
                </span>
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* File Description Box */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white font-mono">{activeFile.filename}: </span>
          {activeFile.description}
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-700 inline-block"></span>
            <span className="text-xs font-mono font-semibold text-slate-300">{activeFile.filename}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {activeFile.content.split('\n').length} lines · {activeFile.language.toUpperCase()}
          </span>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[620px] scrollbar-thin">
          <pre className="text-slate-300 leading-relaxed">
            <code>
              {activeFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell pr-4 text-slate-600 select-none text-right w-10 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>

      {/* Implementation Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
          <div className="font-bold text-slate-200">Where to Place This File</div>
          <p className="text-slate-400">
            Save Python strategy files inside your local Freqtrade repository under:
          </p>
          <div className="p-2 bg-slate-950 rounded font-mono text-[11px] text-emerald-400">
            user_data/strategies/{activeFile.filename}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
          <div className="font-bold text-slate-200">Run Docker Backtest</div>
          <p className="text-slate-400">Execute the strategy through your existing docker setup:</p>
          <div className="p-2 bg-slate-950 rounded font-mono text-[11px] text-indigo-300 overflow-x-auto">
            docker compose run --rm freqtrade_a backtesting --strategy {activeFile.filename.replace('.py', '')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
          <div className="font-bold text-slate-200">Run Hyperopt</div>
          <p className="text-slate-400">Optimize ADX & stoploss spaces locally:</p>
          <div className="p-2 bg-slate-950 rounded font-mono text-[11px] text-amber-300 overflow-x-auto">
            freqtrade hyperopt --strategy AdxDmiRobustV2 --hyperopt-loss SharpeHyperOptLoss
          </div>
        </div>
      </div>
    </div>
  );
};

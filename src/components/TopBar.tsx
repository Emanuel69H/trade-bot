import { Download, Terminal, Flame, Code2, ShieldAlert, Play, Database } from 'lucide-react';

export type NavigationTab = 'gui_runner' | 'database' | 'stress_test' | 'autopsy' | 'python_hub' | 'docker_commands';

interface TopBarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onExportAll: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onTabChange, onExportAll }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
          F
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white">FreqLab</span>
          <span className="text-slate-400 text-sm ml-2 font-mono">Strategy Optimizer</span>
        </div>
      </div>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800/80">
        <button
          onClick={() => onTabChange('gui_runner')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'gui_runner'
              ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
          <span>GUI Test Runner</span>
        </button>

        <button
          onClick={() => onTabChange('database')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'database'
              ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Test Database</span>
        </button>

        <button
          onClick={() => onTabChange('stress_test')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'stress_test'
              ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-cyan-400" />
          <span>Stress-Test Lab</span>
        </button>

        <button
          onClick={() => onTabChange('autopsy')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'autopsy'
              ? 'bg-slate-800 text-rose-400 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Failure Autopsy</span>
        </button>

        <button
          onClick={() => onTabChange('python_hub')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'python_hub'
              ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Python Strategies</span>
        </button>

        <button
          onClick={() => onTabChange('docker_commands')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'docker_commands'
              ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>Docker Setup</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onExportAll}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Strategy Bundle</span>
        </button>
      </div>
    </header>
  );
};

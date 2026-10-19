import { useState } from 'react';
import { TopBar, NavigationTab } from './components/TopBar';
import { GuiBacktestRunner } from './components/GuiBacktestRunner';
import { StressTestLab } from './components/StressTestLab';
import { FailureAutopsy } from './components/FailureAutopsy';
import { StrategyCodeHub } from './components/StrategyCodeHub';
import { DockerCommandCenter } from './components/DockerCommandCenter';
import { exportAllStrategyFiles } from './utils/exporter';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('gui_runner');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleExportAll = () => {
    exportAllStrategyFiles();
    setToastMessage('Downloading complete Freqtrade strategy bundle (6 files)...');
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar with Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportAll={handleExportAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {activeTab === 'gui_runner' && <GuiBacktestRunner />}

        {activeTab === 'stress_test' && (
          <StressTestLab
            onOpenAutopsy={() => setActiveTab('autopsy')}
            onOpenPythonCode={() => setActiveTab('python_hub')}
          />
        )}

        {activeTab === 'autopsy' && (
          <FailureAutopsy
            onGoToStrategyCode={() => setActiveTab('python_hub')}
            onGoToStressTest={() => setActiveTab('stress_test')}
          />
        )}

        {activeTab === 'python_hub' && <StrategyCodeHub />}

        {activeTab === 'docker_commands' && <DockerCommandCenter />}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-medium rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">FreqLab Strategy Suite</span>
          <span>·</span>
          <span>Engineered for Freqtrade Docker environments</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
          <span>AdxDmiRobustV2</span>
          <span>·</span>
          <span>RegimeAdaptiveMaster</span>
          <span>·</span>
          <span>ATR Dynamic Stops</span>
        </div>
      </footer>
    </div>
  );
}
